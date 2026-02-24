using System;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Централизованная обработка ошибок
    /// </summary>
    public class ErrorHandler
    {
        private readonly Logger _logger;
        private readonly int _maxRetries = 3;
        private readonly int _retryDelayMs = 1000;

        public ErrorHandler(Logger logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Выполнить операцию с автоматическим retry
        /// </summary>
        public async System.Threading.Tasks.Task<T> ExecuteWithRetryAsync<T>(
            Func<System.Threading.Tasks.Task<T>> operation,
            string operationName,
            int maxRetries = 0) where T : class
        {
            maxRetries = maxRetries > 0 ? maxRetries : _maxRetries;
            int attempt = 0;

            while (attempt < maxRetries)
            {
                try
                {
                    _logger.LogInfo($"🔄 Executing {operationName} (attempt {attempt + 1}/{maxRetries})");
                    var result = await operation();
                    _logger.LogInfo($"✅ {operationName} completed successfully");
                    return result;
                }
                catch (Exception ex) when (attempt < maxRetries - 1)
                {
                    attempt++;
                    _logger.LogWarning($"⚠️ {operationName} failed (attempt {attempt}): {ex.Message}. Retrying in {_retryDelayMs}ms...");
                    await System.Threading.Tasks.Task.Delay(_retryDelayMs);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"❌ {operationName} failed after {maxRetries} attempts: {ex.Message}");
                    throw;
                }
            }

            return null;
        }

        /// <summary>
        /// Выполнить операцию с timeout
        /// </summary>
        public async System.Threading.Tasks.Task<T> ExecuteWithTimeoutAsync<T>(
            Func<System.Threading.Tasks.Task<T>> operation,
            string operationName,
            int timeoutMs = 30000) where T : class
        {
            try
            {
                using (var cts = new System.Threading.CancellationTokenSource(timeoutMs))
                {
                    return await operation();
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogError($"⏱️ {operationName} timeout after {timeoutMs}ms");
                throw new TimeoutException($"{operationName} took longer than {timeoutMs}ms");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ {operationName} error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Обработать исключение и вернуть нейтральный результат
        /// </summary>
        public void HandleException(Exception ex, string context = "")
        {
            if (ex == null) return;

            string message = string.IsNullOrEmpty(context)
                ? ex.Message
                : $"{context}: {ex.Message}";

            _logger.LogError($"🚨 Exception: {message}");

            if (ex.InnerException != null)
            {
                _logger.LogError($"   Inner: {ex.InnerException.Message}");
            }
        }

        /// <summary>
        /// Проверить, является ли ошибка временной (retry-friendly)
        /// </summary>
        public bool IsTransientError(Exception ex)
        {
            if (ex == null) return false;

            // Сетевые ошибки — временные
            if (ex is System.Net.Http.HttpRequestException)
                return true;

            // Timeout — временный
            if (ex is TimeoutException || ex is OperationCanceledException)
                return true;

            // IOException может быть временной (например, файл заблокирован)
            if (ex is System.IO.IOException)
                return true;

            return false;
        }
    }
}
