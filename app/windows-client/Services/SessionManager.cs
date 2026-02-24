using System;
using System.Collections.Generic;
using System.Linq;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Управляет защищёнными сессиями после успешной привязки
    /// Обеспечивает: аутентификацию по user_id, защиту от duplicate updates, отслеживание активности
    /// </summary>
    public class SessionManager
    {
        private readonly Logger _logger;
        private readonly SecurityConfig _securityConfig;
        private readonly DeviceIdGenerator _deviceIdGenerator;

        // Текущая активная сессия (на одно устройство - одна сессия)
        private SecureSession? _activeSession;

        // История всех сессий
        private readonly List<SecureSession> _sessionHistory;

        // Rate limiting: userId -> список временных меток последних запросов
        private readonly Dictionary<long, List<DateTime>> _requestTimestamps;

        public event EventHandler<SecureSession>? SessionCreated;
        public event EventHandler<string>? SessionRevoked;

        public bool HasActiveSession => _activeSession != null && _activeSession.IsActive;
        public long? BoundUserId => _activeSession?.BoundTelegramUserId;

        public SessionManager(Logger logger, SecurityConfig securityConfig, DeviceIdGenerator deviceIdGenerator)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _securityConfig = securityConfig ?? throw new ArgumentNullException(nameof(securityConfig));
            _deviceIdGenerator = deviceIdGenerator ?? throw new ArgumentNullException(nameof(deviceIdGenerator));

            _sessionHistory = new List<SecureSession>();
            _requestTimestamps = new Dictionary<long, List<DateTime>>();
        }

        /// <summary>
        /// Создаёт новую сессию после успешной привязки
        /// </summary>
        public SecureSession CreateSession(long telegramUserId, string? username)
        {
            try
            {
                // Если есть активная сессия, закрываем её
                if (_activeSession != null && _activeSession.IsActive)
                {
                    RevokeSession("New session created");
                }

                string sessionToken = _deviceIdGenerator.GenerateSessionToken(_securityConfig.SessionTokenLength);

                _activeSession = new SecureSession
                {
                    SessionToken = sessionToken,
                    BoundTelegramUserId = telegramUserId,
                    BoundUsername = username,
                    CreatedAt = DateTime.UtcNow,
                    LastActivityAt = DateTime.UtcNow,
                    IsActive = true
                };

                _sessionHistory.Add(_activeSession);
                _requestTimestamps[telegramUserId] = new List<DateTime>();

                _logger.LogInfo($"Session created for user {username} (ID: {telegramUserId})");
                SessionCreated?.Invoke(this, _activeSession);

                return _activeSession;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to create session: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Проверяет, авторизирован ли пользователь (может ли выполнять команды)
        /// </summary>
        public bool IsAuthorized(long telegramUserId)
        {
            if (!HasActiveSession)
            {
                _logger.LogWarning("No active session");
                return false;
            }

            if (_activeSession!.BoundTelegramUserId != telegramUserId)
            {
                _logger.LogWarning($"Unauthorized access attempt from user {telegramUserId}. Expected: {_activeSession.BoundTelegramUserId}");
                return false;
            }

            if (!_activeSession.IsActive)
            {
                _logger.LogWarning($"Session for user {telegramUserId} is not active");
                return false;
            }

            return true;
        }

        /// <summary>
        /// Проверяет rate limit (защита от flood'а)
        /// Ограничение: N запросов в минуту
        /// </summary>
        public bool CheckRateLimit(long telegramUserId)
        {
            try
            {
                if (!_requestTimestamps.ContainsKey(telegramUserId))
                {
                    _requestTimestamps[telegramUserId] = new List<DateTime>();
                }

                var timestamps = _requestTimestamps[telegramUserId];
                DateTime oneMinuteAgo = DateTime.UtcNow.AddMinutes(-1);

                // Удаляем старые временные метки
                timestamps.RemoveAll(x => x < oneMinuteAgo);

                if (timestamps.Count >= _securityConfig.RateLimitRequestsPerMinute)
                {
                    _logger.LogWarning($"Rate limit exceeded for user {telegramUserId}. Requests: {timestamps.Count}");
                    return false;
                }

                timestamps.Add(DateTime.UtcNow);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error checking rate limit: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Регистрирует обработку update'а (защита от duplicate)
        /// </summary>
        public bool RegisterProcessedUpdate(string updateId, long telegramUserId)
        {
            try
            {
                if (!HasActiveSession || !IsAuthorized(telegramUserId))
                {
                    return false;
                }

                // Проверяем, не был ли этот update уже обработан
                if (_activeSession!.ProcessedUpdateIds.Contains(updateId))
                {
                    _logger.LogWarning($"Duplicate update detected: {updateId}");
                    return false;
                }

                // Добавляем update в список обработанных
                _activeSession.ProcessedUpdateIds.Add(updateId);

                // Ограничиваем размер истории (держим последние 1000 update ID)
                if (_activeSession.ProcessedUpdateIds.Count > 1000)
                {
                    _activeSession.ProcessedUpdateIds.RemoveRange(0, _activeSession.ProcessedUpdateIds.Count - 1000);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error registering processed update: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Обновляет время последней активности
        /// </summary>
        public void UpdateActivityTime()
        {
            if (_activeSession != null)
            {
                _activeSession.LastActivityAt = DateTime.UtcNow;
            }
        }

        /// <summary>
        /// Увеличивает счётчик обработанных команд
        /// </summary>
        public void IncrementCommandCounter()
        {
            if (_activeSession != null)
            {
                _activeSession.CommandsProcessed++;
            }
        }

        /// <summary>
        /// Отзывает текущую сессию
        /// </summary>
        public void RevokeSession(string reason = "User revoked")
        {
            try
            {
                if (_activeSession == null)
                {
                    _logger.LogWarning("No active session to revoke");
                    return;
                }

                _activeSession.IsActive = false;
                long userId = _activeSession.BoundTelegramUserId;

                _logger.LogInfo($"Session revoked for user {userId}. Reason: {reason}");
                SessionRevoked?.Invoke(this, reason);

                _activeSession = null;
                _requestTimestamps.Remove(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error revoking session: {ex.Message}");
            }
        }

        /// <summary>
        /// Получает информацию о текущей сессии
        /// </summary>
        public Dictionary<string, object>? GetSessionInfo()
        {
            if (!HasActiveSession)
                return null;

            return new Dictionary<string, object>
            {
                { "BoundUserId", _activeSession!.BoundTelegramUserId },
                { "BoundUsername", _activeSession.BoundUsername ?? "unknown" },
                { "CreatedAt", _activeSession.CreatedAt },
                { "LastActivityAt", _activeSession.LastActivityAt },
                { "CommandsProcessed", _activeSession.CommandsProcessed },
                { "ProcessedUpdates", _activeSession.ProcessedUpdateIds.Count },
                { "SessionDuration", DateTime.UtcNow - _activeSession.CreatedAt },
                { "IsActive", _activeSession.IsActive }
            };
        }

        /// <summary>
        /// Получает историю сессий
        /// </summary>
        public List<SecureSession> GetSessionHistory(int? limit = null)
        {
            var history = _sessionHistory.OrderByDescending(x => x.CreatedAt).ToList();
            
            if (limit.HasValue && limit.Value > 0)
            {
                return history.Take(limit.Value).ToList();
            }

            return history;
        }

        /// <summary>
        /// Валидирует session token
        /// </summary>
        public bool ValidateSessionToken(string sessionToken)
        {
            if (!HasActiveSession || _activeSession == null)
                return false;

            // Используем constant-time сравнение
            return _activeSession.SessionToken == sessionToken;
        }
    }
}
