using System;
using System.Collections.Generic;
using System.Linq;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Отслеживает и кэширует обработанные Telegram updates
    /// Предотвращает двойную обработку одного и того же update (anti-replay защита)
    /// </summary>
    public class UpdateTracker
    {
        private readonly Logger _logger;
        private readonly List<ProcessedUpdate> _processedUpdates;
        private readonly int _maxHistorySize;
        private readonly int _retentionMinutes;

        public event EventHandler<string>? DuplicateDetected;

        public UpdateTracker(Logger logger, int maxHistorySize = 10000, int retentionMinutes = 60)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _maxHistorySize = maxHistorySize;
            _retentionMinutes = retentionMinutes;
            _processedUpdates = new List<ProcessedUpdate>();
        }

        /// <summary>
        /// Регистрирует обработанный update
        /// </summary>
        public void RegisterUpdate(string updateId, long? userId = null, string? commandType = null)
        {
            try
            {
                var update = new ProcessedUpdate
                {
                    UpdateId = updateId,
                    ProcessedAt = DateTime.UtcNow,
                    UserId = userId,
                    CommandType = commandType
                };

                _processedUpdates.Add(update);

                // Ограничиваем размер истории
                if (_processedUpdates.Count > _maxHistorySize)
                {
                    int itemsToRemove = _processedUpdates.Count - _maxHistorySize;
                    _processedUpdates.RemoveRange(0, itemsToRemove);
                }

                _logger.LogInfo($"Update registered: {updateId} (User: {userId}, Command: {commandType})");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error registering update: {ex.Message}");
            }
        }

        /// <summary>
        /// Проверяет, был ли этот update уже обработан
        /// </summary>
        public bool IsProcessed(string updateId)
        {
            try
            {
                var existing = _processedUpdates.FirstOrDefault(x => x.UpdateId == updateId);
                
                if (existing != null)
                {
                    _logger.LogWarning($"Duplicate update detected: {updateId}");
                    DuplicateDetected?.Invoke(this, updateId);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error checking if update is processed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Проверяет и регистрирует update в одной операции
        /// Возвращает true если update новый и зарегистрирован, false если дубликат
        /// </summary>
        public bool TryRegisterUpdate(string updateId, long? userId = null, string? commandType = null)
        {
            try
            {
                if (IsProcessed(updateId))
                {
                    return false;
                }

                RegisterUpdate(updateId, userId, commandType);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in TryRegisterUpdate: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Очищает истекшие updates (старше retentionMinutes)
        /// </summary>
        public void CleanupExpiredUpdates()
        {
            try
            {
                DateTime cutoffTime = DateTime.UtcNow.AddMinutes(-_retentionMinutes);
                int removedCount = _processedUpdates.RemoveAll(x => x.ProcessedAt < cutoffTime);

                if (removedCount > 0)
                {
                    _logger.LogInfo($"Cleaned up {removedCount} expired updates");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error during cleanup: {ex.Message}");
            }
        }

        /// <summary>
        /// Получает список всех обработанных updates
        /// </summary>
        public List<ProcessedUpdate> GetProcessedUpdates(int? limit = null)
        {
            var list = _processedUpdates.OrderByDescending(x => x.ProcessedAt).ToList();
            
            if (limit.HasValue && limit.Value > 0)
            {
                return list.Take(limit.Value).ToList();
            }

            return list;
        }

        /// <summary>
        /// Получает updates определённого пользователя
        /// </summary>
        public List<ProcessedUpdate> GetUserUpdates(long userId, int? limit = null)
        {
            var list = _processedUpdates
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.ProcessedAt)
                .ToList();

            if (limit.HasValue && limit.Value > 0)
            {
                return list.Take(limit.Value).ToList();
            }

            return list;
        }

        /// <summary>
        /// Получает статистику обработанных updates
        /// </summary>
        public Dictionary<string, object> GetStatistics()
        {
            var stats = new Dictionary<string, object>
            {
                { "TotalProcessedUpdates", _processedUpdates.Count },
                { "UniqueUsers", _processedUpdates.Select(x => x.UserId).Distinct().Count() },
                { "LastUpdateTime", _processedUpdates.Any() ? _processedUpdates.Max(x => x.ProcessedAt) : null }
            };

            var commandTypes = _processedUpdates
                .Where(x => x.CommandType != null)
                .GroupBy(x => x.CommandType)
                .ToDictionary(x => x.Key!, x => x.Count());

            stats["CommandTypeDistribution"] = commandTypes;

            return stats;
        }

        /// <summary>
        /// Очищает всю историю (только для отладки/тестирования)
        /// </summary>
        public void ClearHistory()
        {
            _processedUpdates.Clear();
            _logger.LogWarning("Update history cleared");
        }

        /// <summary>
        /// Внутренний класс для хранения информации об обработанном update
        /// </summary>
        public class ProcessedUpdate
        {
            public string UpdateId { get; set; }
            public DateTime ProcessedAt { get; set; }
            public long? UserId { get; set; }
            public string? CommandType { get; set; }

            public override string ToString()
            {
                return $"[{ProcessedAt:yyyy-MM-dd HH:mm:ss}] Update: {UpdateId}, User: {UserId}, Command: {CommandType}";
            }
        }
    }
}
