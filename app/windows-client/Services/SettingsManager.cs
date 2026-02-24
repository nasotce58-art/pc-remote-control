using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Управляет сохранением и загрузкой AppSettings с диска
    /// Поддерживает JSON сериализацию
    /// </summary>
    public class SettingsManager
    {
        private readonly Logger _logger;
        private readonly string _settingsFilePath;
        private AppSettings _currentSettings;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public SettingsManager(Logger logger, string? settingsFilePath = null)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            if (string.IsNullOrEmpty(settingsFilePath))
            {
                string appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string appFolder = Path.Combine(appDataPath, "PCRemoteControl");
                Directory.CreateDirectory(appFolder);
                _settingsFilePath = Path.Combine(appFolder, "appsettings.json");
            }
            else
            {
                _settingsFilePath = settingsFilePath;
            }

            _currentSettings = new AppSettings();
            LoadSettings();
        }

        /// <summary>
        /// Загружает настройки из файла
        /// </summary>
        public void LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsFilePath))
                {
                    string json = File.ReadAllText(_settingsFilePath);
                    _currentSettings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
                    _logger.LogInfo($"Settings loaded from {_settingsFilePath}");
                }
                else
                {
                    _logger.LogInfo("Settings file not found, using defaults");
                    _currentSettings = new AppSettings();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error loading settings: {ex.Message}");
                _currentSettings = new AppSettings();
            }
        }

        /// <summary>
        /// Сохраняет настройки в файл
        /// </summary>
        public void SaveSettings()
        {
            try
            {
                string directory = Path.GetDirectoryName(_settingsFilePath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                string json = JsonSerializer.Serialize(_currentSettings, JsonOptions);
                File.WriteAllText(_settingsFilePath, json);
                _logger.LogInfo($"Settings saved to {_settingsFilePath}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error saving settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Получает текущие настройки
        /// </summary>
        public AppSettings GetSettings()
        {
            return _currentSettings;
        }

        /// <summary>
        /// Обновляет настройки pairing
        /// </summary>
        public void UpdatePairingSettings(
            long boundUserId,
            string boundUsername,
            string sessionToken,
            DateTime pairingDate,
            DateTime sessionCreatedAt)
        {
            try
            {
                _currentSettings.IsPaired = true;
                _currentSettings.BoundTelegramUserId = boundUserId;
                _currentSettings.BoundTelegramUsername = boundUsername;
                _currentSettings.SessionToken = sessionToken;
                _currentSettings.PairingDate = pairingDate;
                _currentSettings.SessionCreatedAt = sessionCreatedAt;
                _currentSettings.SessionLastActivityAt = DateTime.UtcNow;
                
                SaveSettings();
                _logger.LogInfo($"Pairing settings updated for user {boundUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating pairing settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Очищает настройки pairing (unbind)
        /// </summary>
        public void ClearPairingSettings()
        {
            try
            {
                _currentSettings.IsPaired = false;
                _currentSettings.BoundTelegramUserId = null;
                _currentSettings.BoundTelegramUsername = null;
                _currentSettings.SessionToken = null;
                _currentSettings.PairingDate = null;
                _currentSettings.SessionCreatedAt = null;
                _currentSettings.SessionLastActivityAt = null;
                
                SaveSettings();
                _logger.LogInfo("Pairing settings cleared");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error clearing pairing settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Обновляет время последней активности сессии
        /// </summary>
        public void UpdateSessionActivity()
        {
            try
            {
                if (_currentSettings.IsPaired)
                {
                    _currentSettings.SessionLastActivityAt = DateTime.UtcNow;
                    SaveSettings();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating session activity: {ex.Message}");
            }
        }

        /// <summary>
        /// Обновляет security настройки
        /// </summary>
        public void UpdateSecuritySettings(
            int deviceIdExpirationMinutes = 15,
            int pairingConfirmationTimeoutSeconds = 30,
            int maxFailedAttempts = 5,
            int lockoutDurationMinutes = 15,
            int rateLimitRequestsPerMinute = 10)
        {
            try
            {
                _currentSettings.DeviceIdExpirationMinutes = deviceIdExpirationMinutes;
                _currentSettings.PairingConfirmationTimeoutSeconds = pairingConfirmationTimeoutSeconds;
                _currentSettings.MaxFailedAttemptsBeforeBlock = maxFailedAttempts;
                _currentSettings.LockoutDurationMinutes = lockoutDurationMinutes;
                _currentSettings.RateLimitRequestsPerMinute = rateLimitRequestsPerMinute;
                
                SaveSettings();
                _logger.LogInfo("Security settings updated");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating security settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Проверяет, есть ли активная привязка
        /// </summary>
        public bool HasActivePairing()
        {
            return _currentSettings.IsPaired && 
                   _currentSettings.BoundTelegramUserId.HasValue && 
                   !string.IsNullOrEmpty(_currentSettings.SessionToken);
        }

        /// <summary>
        /// Получает информацию о текущей привязке
        /// </summary>
        public (long? UserId, string? Username, string? SessionToken, DateTime? PairingDate) GetPairingInfo()
        {
            return (
                _currentSettings.BoundTelegramUserId,
                _currentSettings.BoundTelegramUsername,
                _currentSettings.SessionToken,
                _currentSettings.PairingDate
            );
        }

        /// <summary>
        /// Загружает security конфиг из текущих настроек
        /// </summary>
        public SecurityConfig LoadSecurityConfig()
        {
            return new SecurityConfig
            {
                DeviceIdExpirationMinutes = _currentSettings.DeviceIdExpirationMinutes,
                PairingConfirmationTimeoutSeconds = _currentSettings.PairingConfirmationTimeoutSeconds,
                MaxFailedAttempts = _currentSettings.MaxFailedAttemptsBeforeBlock,
                LockoutDurationMinutes = _currentSettings.LockoutDurationMinutes,
                SessionTokenLength = _currentSettings.SessionTokenLengthBytes,
                RequireLocalConfirmation = _currentSettings.RequireLocalConfirmationForPairing,
                LogAllAttempts = _currentSettings.LogAllSecurityEvents,
                RateLimitRequestsPerMinute = _currentSettings.RateLimitRequestsPerMinute
            };
        }
    }
}
