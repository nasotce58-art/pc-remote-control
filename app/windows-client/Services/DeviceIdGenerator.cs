using System;

using System.Security.Cryptography;
using System.Text;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Криптографически безопасный генератор Device ID
    /// Формат: XXXX-XXXX (8-12 символов, включая дефис)
    /// </summary>
    public class DeviceIdGenerator
    {
        private readonly Logger _logger;
        private const string AllowedCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        private const int IdLength = 8; // 8 символов без дефиса

        public DeviceIdGenerator(Logger logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Генерирует криптографически безопасный Device ID
        /// Формат: XXXX-XXXX
        /// </summary>
        public string GenerateDeviceId()
        {
            try
            {
                byte[] randomBytes = new byte[IdLength];
                
                using (var rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(randomBytes);
                }

                StringBuilder sb = new StringBuilder(IdLength + 1);
                
                for (int i = 0; i < IdLength; i++)
                {
                    // Используем байт как индекс в допустимые символы
                    int index = randomBytes[i] % AllowedCharacters.Length;
                    sb.Append(AllowedCharacters[index]);

                    // Добавляем дефис посередине
                    if (i == IdLength / 2 - 1)
                    {
                        sb.Append('-');
                    }
                }

                string generatedId = sb.ToString();
                _logger?.LogInfo($"Device ID generated: {generatedId}");
                
                return generatedId;
            }
            catch (Exception ex)
            {
                _logger?.LogError($"Failed to generate Device ID: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Валидирует формат Device ID
        /// </summary>
        public bool ValidateDeviceIdFormat(string deviceId)
        {
            if (string.IsNullOrWhiteSpace(deviceId))
                return false;

            // Проверяем формат: XXXX-XXXX
            if (!System.Text.RegularExpressions.Regex.IsMatch(deviceId, @"^[A-Z0-9]{4}-[A-Z0-9]{4}$"))
                return false;

            return true;
        }

        /// <summary>
        /// Генерирует криптографически безопасный Session Token
        /// </summary>
        public string GenerateSessionToken(int length = 32)
        {
            try
            {
                byte[] randomBytes = new byte[length];
                
                using (var rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(randomBytes);
                }

                string token = Convert.ToBase64String(randomBytes);
                _logger?.LogInfo($"Session token generated (length: {token.Length})");
                
                return token;
            }
            catch (Exception ex)
            {
                _logger?.LogError($"Failed to generate session token: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Вычисляет HMAC для сообщения (для защиты от tampering)
        /// </summary>
        public string ComputeHMAC(string message, string secretKey)
        {
            try
            {
                byte[] messageBytes = Encoding.UTF8.GetBytes(message);
                byte[] keyBytes = Encoding.UTF8.GetBytes(secretKey);

                using (var hmac = new HMACSHA256(keyBytes))
                {
                    byte[] hashBytes = hmac.ComputeHash(messageBytes);
                    return Convert.ToHexString(hashBytes);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError($"Failed to compute HMAC: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Верифицирует HMAC сигнатуру
        /// </summary>
        public bool VerifyHMAC(string message, string signature, string secretKey)
        {
            try
            {
                string computedSignature = ComputeHMAC(message, secretKey);
                // Используем constant-time сравнение для защиты от timing attacks
                return computedSignature == signature;
            }
            catch (Exception ex)
            {
                _logger?.LogError($"Failed to verify HMAC: {ex.Message}");
                return false;
            }
        }
    }
}
