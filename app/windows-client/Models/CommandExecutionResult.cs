using System;

namespace PCRemoteControl.Models
{
    /// <summary>
    /// Результат выполнения команды
    /// </summary>
    public class CommandExecutionResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string ErrorMessage { get; set; }
        public object Data { get; set; }
        public DateTime ExecutedAt { get; set; }
        public long ExecutionTimeMs { get; set; }
        public string CommandId { get; set; }

        public CommandExecutionResult()
        {
            ExecutedAt = DateTime.UtcNow;
            Success = false;
            Message = string.Empty;
            ErrorMessage = string.Empty;
        }

        public static CommandExecutionResult SuccessResult(string message, object data = null)
        {
            return new CommandExecutionResult
            {
                Success = true,
                Message = message,
                Data = data,
                ExecutedAt = DateTime.UtcNow
            };
        }

        public static CommandExecutionResult ErrorResult(string errorMessage)
        {
            return new CommandExecutionResult
            {
                Success = false,
                ErrorMessage = errorMessage,
                ExecutedAt = DateTime.UtcNow
            };
        }

        public static CommandExecutionResult TimeoutResult()
        {
            return new CommandExecutionResult
            {
                Success = false,
                ErrorMessage = "Command execution timeout",
                ExecutedAt = DateTime.UtcNow
            };
        }
    }
}
