using System;
using System.Collections.Generic;
using System.Linq;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Управляет процессом привязки устройства к Telegram
    /// Реализует полный жизненный цикл pairing: генерация ID -> подтверждение -> привязка
    /// </summary>
    public class PairingManager
    {
        private readonly Logger _logger;
        private readonly SecurityConfig _securityConfig;
        private readonly DeviceIdGenerator _deviceIdGenerator;

        // Хранилище временных Device ID (действуют 15 минут)
        private readonly Dictionary<string, TemporaryDeviceId> _temporaryDeviceIds;

        // Хранилище запросов на подтверждение
        private readonly Dictionary<string, PairingConfirmationRequest> _pendingConfirmations;

        // История попыток подключения
        private readonly List<ConnectionAttempt> _connectionHistory;

        // Блокированные попытки (защита от brute-force)
        private readonly Dictionary<long, DateTime> _blockedUsers; // userId -> блокировка до

        public event EventHandler<string>? PairingStatusChanged;
        public event EventHandler<PairingConfirmationRequest>? ConfirmationRequested;

        public PairingManager(Logger logger, SecurityConfig securityConfig, DeviceIdGenerator deviceIdGenerator)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _securityConfig = securityConfig ?? throw new ArgumentNullException(nameof(securityConfig));
            _deviceIdGenerator = deviceIdGenerator ?? throw new ArgumentNullException(nameof(deviceIdGenerator));

            _temporaryDeviceIds = new Dictionary<string, TemporaryDeviceId>();
            _pendingConfirmations = new Dictionary<string, PairingConfirmationRequest>();
            _connectionHistory = new List<ConnectionAttempt>();
            _blockedUsers = new Dictionary<long, DateTime>();
        }

        /// <summary>
        /// Генерирует новый временный Device ID для режима pairing'а
        /// </summary>
        public string GenerateTemporaryDeviceId()
        {
            try
            {
                string deviceId = _deviceIdGenerator.GenerateDeviceId();
                DateTime now = DateTime.UtcNow;
                DateTime expiresAt = now.AddMinutes(_securityConfig.DeviceIdExpirationMinutes);

                var temporaryId = new TemporaryDeviceId
                {
                    Id = deviceId,
                    GeneratedAt = now,
                    ExpiresAt = expiresAt,
                    IsUsed = false
                };

                _temporaryDeviceIds[deviceId] = temporaryId;

                _logger.LogInfo($"Temporary Device ID generated: {deviceId}, expires at: {expiresAt:O}");
                PairingStatusChanged?.Invoke(this, $"Device ID: {deviceId} (действует 15 минут)");

                return deviceId;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to generate temporary Device ID: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Проверяет, является ли Device ID действительным
        /// </summary>
        public bool IsDeviceIdValid(string deviceId)
        {
            // Проверяем формат
            if (!_deviceIdGenerator.ValidateDeviceIdFormat(deviceId))
            {
                _logger.LogWarning($"Invalid Device ID format: {deviceId}");
                return false;
            }

            // Проверяем наличие в хранилище
            if (!_temporaryDeviceIds.ContainsKey(deviceId))
            {
                _logger.LogWarning($"Device ID not found: {deviceId}");
                return false;
            }

            var tempId = _temporaryDeviceIds[deviceId];

            // Проверяем, не истёк ли
            if (!tempId.IsValid)
            {
                _logger.LogWarning($"Device ID expired: {deviceId}");
                return false;
            }

            return true;
        }

        /// <summary>
        /// Создаёт запрос на подтверждение pairing'а
        /// </summary>
        public PairingConfirmationRequest CreateConfirmationRequest(
            string deviceId,
            long telegramUserId,
            string? username)
        {
            try
            {
                // Проверяем, не заблокирован ли пользователь
                if (IsUserBlocked(telegramUserId))
                {
                    var ex = new InvalidOperationException($"User {telegramUserId} is temporarily blocked due to too many failed attempts");
                    _logger.LogWarning($"User {telegramUserId} is blocked. {ex.Message}");
                    throw ex;
                }

                // Проверяем валидность Device ID
                if (!IsDeviceIdValid(deviceId))
                {
                    throw new InvalidOperationException($"Invalid or expired Device ID: {deviceId}");
                }

                var confirmationRequest = new PairingConfirmationRequest
                {
                    DeviceId = deviceId,
                    TelegramUserId = telegramUserId,
                    Username = username,
                    RequestedAt = DateTime.UtcNow,
                    ConfirmationTimeoutSeconds = _securityConfig.PairingConfirmationTimeoutSeconds
                };

                string requestKey = $"{deviceId}_{telegramUserId}";
                _pendingConfirmations[requestKey] = confirmationRequest;

                _logger.LogInfo($"Confirmation request created for {username} (ID: {telegramUserId}) with Device ID: {deviceId}");
                ConfirmationRequested?.Invoke(this, confirmationRequest);

                return confirmationRequest;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to create confirmation request: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Подтверждает pairing (вызывается после нажатия "Да" в окне подтверждения)
        /// </summary>
        public bool ConfirmPairing(string deviceId, long telegramUserId)
        {
            try
            {
                string requestKey = $"{deviceId}_{telegramUserId}";

                if (!_pendingConfirmations.ContainsKey(requestKey))
                {
                    _logger.LogWarning($"No pending confirmation found for {requestKey}");
                    return false;
                }

                var confirmationRequest = _pendingConfirmations[requestKey];

                // Проверяем, не истёк ли таймер подтверждения (30 секунд)
                if (confirmationRequest.IsExpired)
                {
                    _logger.LogWarning($"Confirmation request expired for {requestKey}");
                    _pendingConfirmations.Remove(requestKey);
                    return false;
                }

                // Отмечаем Device ID как использованный
                if (_temporaryDeviceIds.ContainsKey(deviceId))
                {
                    _temporaryDeviceIds[deviceId].IsUsed = true;
                    _temporaryDeviceIds[deviceId].UsedByUserId = telegramUserId;
                    _temporaryDeviceIds[deviceId].UsedByUsername = confirmationRequest.Username;
                }

                // Удаляем завершённый запрос
                _pendingConfirmations.Remove(requestKey);

                // Логируем успешное подключение
                LogConnectionAttempt(new ConnectionAttempt
                {
                    AttemptTime = DateTime.UtcNow,
                    DeviceId = deviceId,
                    TelegramUserId = telegramUserId,
                    Username = confirmationRequest.Username,
                    Status = "success"
                });

                _logger.LogInfo($"Pairing confirmed for {confirmationRequest.Username} (ID: {telegramUserId})");

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to confirm pairing: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Отклоняет запрос на pairing
        /// </summary>
        public bool RejectPairing(string deviceId, long telegramUserId, string? reason = null)
        {
            try
            {
                string requestKey = $"{deviceId}_{telegramUserId}";

                if (_pendingConfirmations.ContainsKey(requestKey))
                {
                    var confirmationRequest = _pendingConfirmations[requestKey];
                    _pendingConfirmations.Remove(requestKey);

                    // Увеличиваем счётчик неудачных попыток
                    IncrementFailedAttempts(telegramUserId);

                    LogConnectionAttempt(new ConnectionAttempt
                    {
                        AttemptTime = DateTime.UtcNow,
                        DeviceId = deviceId,
                        TelegramUserId = telegramUserId,
                        Username = confirmationRequest.Username,
                        Status = "failed",
                        FailureReason = reason ?? "Rejected by user"
                    });

                    _logger.LogInfo($"Pairing rejected for {confirmationRequest.Username} (ID: {telegramUserId}). Reason: {reason ?? "user rejected"}");

                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to reject pairing: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Проверяет, есть ли pending запрос подтверждения
        /// </summary>
        public bool HasPendingConfirmation(string deviceId)
        {
            return _pendingConfirmations.Values.Any(x => x.DeviceId == deviceId && !x.IsExpired);
        }

        /// <summary>
        /// Получает pending запрос подтверждения
        /// </summary>
        public PairingConfirmationRequest? GetPendingConfirmation(string deviceId)
        {
            var confirmation = _pendingConfirmations.Values.FirstOrDefault(x => x.DeviceId == deviceId && !x.IsExpired);
            return confirmation;
        }

        /// <summary>
        /// Очищает истекшие временные Device ID
        /// </summary>
        public void CleanupExpiredDeviceIds()
        {
            try
            {
                var expiredIds = _temporaryDeviceIds
                    .Where(x => !x.Value.IsValid)
                    .Select(x => x.Key)
                    .ToList();

                foreach (var id in expiredIds)
                {
                    _temporaryDeviceIds.Remove(id);
                    _logger.LogInfo($"Expired Device ID removed: {id}");
                }

                // Также очищаем истекшие запросы подтверждения
                var expiredConfirmations = _pendingConfirmations
                    .Where(x => x.Value.IsExpired)
                    .Select(x => x.Key)
                    .ToList();

                foreach (var key in expiredConfirmations)
                {
                    _pendingConfirmations.Remove(key);
                    _logger.LogInfo($"Expired confirmation request removed: {key}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error during cleanup: {ex.Message}");
            }
        }

        /// <summary>
        /// Увеличивает счётчик неудачных попыток (для защиты от brute-force)
        /// </summary>
        private void IncrementFailedAttempts(long telegramUserId)
        {
            // Получаем количество неудачных попыток за последние X минут
            var recentAttempts = _connectionHistory
                .Where(x => x.TelegramUserId == telegramUserId &&
                           x.Status == "failed" &&
                           x.AttemptTime > DateTime.UtcNow.AddMinutes(-5))
                .Count();

            if (recentAttempts >= _securityConfig.MaxFailedAttempts)
            {
                // Блокируем пользователя на 15 минут
                _blockedUsers[telegramUserId] = DateTime.UtcNow.AddMinutes(_securityConfig.LockoutDurationMinutes);
                _logger.LogWarning($"User {telegramUserId} blocked due to {recentAttempts} failed attempts");
            }
        }

        /// <summary>
        /// Проверяет, не заблокирован ли пользователь
        /// </summary>
        private bool IsUserBlocked(long telegramUserId)
        {
            if (!_blockedUsers.ContainsKey(telegramUserId))
                return false;

            DateTime blockUntil = _blockedUsers[telegramUserId];

            if (DateTime.UtcNow > blockUntil)
            {
                _blockedUsers.Remove(telegramUserId);
                _logger.LogInfo($"User {telegramUserId} unblocked (lockout expired)");
                return false;
            }

            return true;
        }

        /// <summary>
        /// Логирует попытку подключения
        /// </summary>
        private void LogConnectionAttempt(ConnectionAttempt attempt)
        {
            if (_securityConfig.LogAllAttempts)
            {
                _connectionHistory.Add(attempt);

                // Ограничиваем размер истории (держим последние 1000 записей)
                if (_connectionHistory.Count > 1000)
                {
                    _connectionHistory.RemoveRange(0, _connectionHistory.Count - 1000);
                }
            }
        }

        /// <summary>
        /// Получает историю попыток подключения
        /// </summary>
        public List<ConnectionAttempt> GetConnectionHistory(int? limit = null)
        {
            var history = _connectionHistory.OrderByDescending(x => x.AttemptTime).ToList();
            
            if (limit.HasValue && limit.Value > 0)
            {
                return history.Take(limit.Value).ToList();
            }

            return history;
        }

        /// <summary>
        /// Получает статистику по Device ID
        /// </summary>
        public Dictionary<string, object> GetPairingStatistics()
        {
            return new Dictionary<string, object>
            {
                { "TotalTemporaryIds", _temporaryDeviceIds.Count },
                { "ValidTemporaryIds", _temporaryDeviceIds.Values.Count(x => x.IsValid) },
                { "UsedTemporaryIds", _temporaryDeviceIds.Values.Count(x => x.IsUsed) },
                { "PendingConfirmations", _pendingConfirmations.Count },
                { "BlockedUsers", _blockedUsers.Count(x => DateTime.UtcNow < x.Value) },
                { "TotalConnectionAttempts", _connectionHistory.Count },
                { "SuccessfulAttempts", _connectionHistory.Count(x => x.Status == "success") },
                { "FailedAttempts", _connectionHistory.Count(x => x.Status == "failed") }
            };
        }
    }
}
