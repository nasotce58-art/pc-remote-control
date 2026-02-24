using System;
using System.Collections.Generic;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Комплексная валидация всех операций безопасности
    /// Проверяет: авторизацию, rate limit, HMAC подпись, timeout'ы, попытки атак
    /// </summary>
    public class SecurityValidator
    {
        private readonly Logger _logger;
        private readonly SessionManager _sessionManager;
        private readonly PairingManager _pairingManager;
        private readonly DeviceIdGenerator _deviceIdGenerator;
        private readonly SecurityConfig _securityConfig;

        // Отслеживание подозрительной активности
        private readonly Dictionary<long, List<DateTime>> _suspiciousActivity;

        public event EventHandler<string>? SecurityWarning;

        public SecurityValidator(
            Logger logger,
            SessionManager sessionManager,
            PairingManager pairingManager,
            DeviceIdGenerator deviceIdGenerator,
            SecurityConfig securityConfig)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _sessionManager = sessionManager ?? throw new ArgumentNullException(nameof(sessionManager));
            _pairingManager = pairingManager ?? throw new ArgumentNullException(nameof(pairingManager));
            _deviceIdGenerator = deviceIdGenerator ?? throw new ArgumentNullException(nameof(deviceIdGenerator));
            _securityConfig = securityConfig ?? throw new ArgumentNullException(nameof(securityConfig));

            _suspiciousActivity = new Dictionary<long, List<DateTime>>();
        }

        /// <summary>
        /// Полная валидация входящей команды перед выполнением
        /// </summary>
        public ValidationResult ValidateIncomingCommand(
            long telegramUserId,
            string commandText,
            string updateId,
            string? sessionToken = null)
        {
            try
            {
                var result = new ValidationResult();

                // 1. Проверка авторизации
                if (!_sessionManager.IsAuthorized(telegramUserId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "UNAUTHORIZED";
                    result.ErrorMessage = $"User {telegramUserId} is not authorized";
                    _logger.LogWarning($"Unauthorized command attempt from user {telegramUserId}: {commandText}");
                    return result;
                }

                // 2. Проверка rate limit
                if (!_sessionManager.CheckRateLimit(telegramUserId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "RATE_LIMIT_EXCEEDED";
                    result.ErrorMessage = "Rate limit exceeded";
                    RaiseSecurityWarning($"Rate limit exceeded for user {telegramUserId}");
                    return result;
                }

                // 3. Проверка на duplicate update (anti-replay защита)
                if (!_sessionManager.RegisterProcessedUpdate(updateId, telegramUserId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "DUPLICATE_UPDATE";
                    result.ErrorMessage = "This update has already been processed";
                    RaiseSecurityWarning($"Duplicate update attempt: {updateId}");
                    return result;
                }

                // 4. Проверка session token (если предоставлен)
                if (!string.IsNullOrEmpty(sessionToken))
                {
                    if (!_sessionManager.ValidateSessionToken(sessionToken))
                    {
                        result.IsValid = false;
                        result.ErrorCode = "INVALID_SESSION_TOKEN";
                        result.ErrorMessage = "Invalid or expired session token";
                        RaiseSecurityWarning($"Invalid session token from user {telegramUserId}");
                        return result;
                    }
                }

                // 5. Проверка на попытки атак (brute-force, injection и т.д.)
                if (ContainsSuspiciousPatterns(commandText))
                {
                    result.IsValid = false;
                    result.ErrorCode = "SUSPICIOUS_CONTENT";
                    result.ErrorMessage = "Command contains suspicious patterns";
                    LogSuspiciousActivity(telegramUserId);
                    RaiseSecurityWarning($"Suspicious command content from user {telegramUserId}");
                    return result;
                }

                // 6. Проверка на повторяющиеся подозрительные действия
                if (IsSuspiciousActivityPattern(telegramUserId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "SUSPICIOUS_PATTERN";
                    result.ErrorMessage = "Suspicious activity pattern detected";
                    RaiseSecurityWarning($"Suspicious activity pattern from user {telegramUserId}");
                    return result;
                }

                // Все проверки пройдены
                result.IsValid = true;
                result.ErrorCode = "OK";
                _sessionManager.UpdateActivityTime();
                _sessionManager.IncrementCommandCounter();

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error during command validation: {ex.Message}");
                return new ValidationResult
                {
                    IsValid = false,
                    ErrorCode = "VALIDATION_ERROR",
                    ErrorMessage = $"Validation error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Валидирует Device ID (формат, существование, валидность)
        /// </summary>
        public ValidationResult ValidateDeviceId(string deviceId)
        {
            var result = new ValidationResult();

            try
            {
                // Проверка формата
                if (!_deviceIdGenerator.ValidateDeviceIdFormat(deviceId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "INVALID_FORMAT";
                    result.ErrorMessage = "Invalid Device ID format. Expected: XXXX-XXXX";
                    return result;
                }

                // Проверка валидности
                if (!_pairingManager.IsDeviceIdValid(deviceId))
                {
                    result.IsValid = false;
                    result.ErrorCode = "INVALID_OR_EXPIRED";
                    result.ErrorMessage = "Device ID is invalid or has expired";
                    return result;
                }

                result.IsValid = true;
                result.ErrorCode = "OK";
                return result;
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.ErrorCode = "VALIDATION_ERROR";
                result.ErrorMessage = ex.Message;
                return result;
            }
        }

        /// <summary>
        /// Проверяет наличие подозрительных паттернов в команде
        /// (защита от injection, buffer overflow и т.д.)
        /// </summary>
        private bool ContainsSuspiciousPatterns(string commandText)
        {
            if (string.IsNullOrEmpty(commandText))
                return true; // Пустая команда - подозрительно

            if (commandText.Length > 10000) // Проверка размера
                return true;

            // Проверка на SQL injection паттерны
            string[] sqlPatterns = { "'; DROP", "UNION SELECT", "OR '1'='1", "--", "/*", "*/" };
            foreach (var pattern in sqlPatterns)
            {
                if (commandText.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            // Проверка на command injection паттерны
            string[] cmdPatterns = { "; rm ", "| cat", "> /dev/", "&& ", "$(", "`" };
            foreach (var pattern in cmdPatterns)
            {
                if (commandText.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Логирует подозрительную активность
        /// </summary>
        private void LogSuspiciousActivity(long telegramUserId)
        {
            try
            {
                if (!_suspiciousActivity.ContainsKey(telegramUserId))
                {
                    _suspiciousActivity[telegramUserId] = new List<DateTime>();
                }

                _suspiciousActivity[telegramUserId].Add(DateTime.UtcNow);

                // Ограничиваем размер истории
                var activities = _suspiciousActivity[telegramUserId];
                while (activities.Count > 100)
                {
                    activities.RemoveAt(0);
                }

                _logger.LogWarning($"Suspicious activity logged for user {telegramUserId}. Total: {activities.Count}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error logging suspicious activity: {ex.Message}");
            }
        }

        /// <summary>
        /// Проверяет, имеет ли пользователь паттерн подозрительной активности
        /// (много попыток за короткий период)
        /// </summary>
        private bool IsSuspiciousActivityPattern(long telegramUserId)
        {
            if (!_suspiciousActivity.ContainsKey(telegramUserId))
                return false;

            var activities = _suspiciousActivity[telegramUserId];
            DateTime fiveMinutesAgo = DateTime.UtcNow.AddMinutes(-5);

            // Удаляем старые записи
            activities.RemoveAll(x => x < fiveMinutesAgo);

            // Если более 5 подозрительных действий за 5 минут - паттерн атаки
            if (activities.Count > 5)
            {
                _logger.LogWarning($"Suspicious activity pattern detected for user {telegramUserId}: {activities.Count} attempts in 5 min");
                return true;
            }

            return false;
        }

        /// <summary>
        /// Вызывает событие безопасности
        /// </summary>
        private void RaiseSecurityWarning(string message)
        {
            _logger.LogWarning($"SECURITY WARNING: {message}");
            SecurityWarning?.Invoke(this, message);
        }

        /// <summary>
        /// Получает статистику безопасности
        /// </summary>
        public Dictionary<string, object> GetSecurityStatistics()
        {
            var stats = new Dictionary<string, object>
            {
                { "SuspiciousUsers", _suspiciousActivity.Count },
                { "TotalSuspiciousActivities", 0 }
            };

            int totalSuspicious = 0;
            foreach (var entry in _suspiciousActivity)
            {
                totalSuspicious += entry.Value.Count;
            }

            stats["TotalSuspiciousActivities"] = totalSuspicious;
            return stats;
        }
    }

    /// <summary>
    /// Результат валидации операции
    /// </summary>
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorCode { get; set; } = "UNKNOWN";
        public string ErrorMessage { get; set; } = "Unknown error";
    }
}
