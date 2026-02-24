using System;
using System.IO;
using System.Collections.ObjectModel;

namespace PCRemoteControl.Utils
{
    public class Logger
    {
        private readonly string _logDirectory = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Logs");
        
        private readonly ObservableCollection<string> _logEntries;

        public Logger(ObservableCollection<string> logEntries)
        {
            _logEntries = logEntries;
            if (!Directory.Exists(_logDirectory))
            {
                Directory.CreateDirectory(_logDirectory);
            }
        }

        public void Log(string message, string level = "INFO")
        {
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            string logMessage = $"[{timestamp}] {level}: {message}";

            // Add to collection for UI
            _logEntries.Add(logMessage);

            // Keep only last 1000 entries in memory
            if (_logEntries.Count > 1000)
            {
                _logEntries.RemoveAt(0);
            }

            // Write to file
            WriteToFile(logMessage);
        }

        public void LogInfo(string message) => Log(message, "INFO");
        public void LogError(string message) => Log(message, "ERROR");
        public void LogWarning(string message) => Log(message, "WARNING");
        public void LogSuccess(string message) => Log(message, "SUCCESS");

        private void WriteToFile(string message)
        {
            try
            {
                string logFile = Path.Combine(_logDirectory, $"log_{DateTime.Now:yyyy-MM-dd}.txt");
                File.AppendAllText(logFile, message + Environment.NewLine);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Logging error: {ex.Message}");
            }
        }

        public void LogException(Exception ex)
        {
            string message = $"Exception: {ex.Message}\nStackTrace: {ex.StackTrace}";
            LogError(message);
        }
    }
}
