using System;
using System.Collections.Generic;

namespace PCRemoteControl.Models
{
    /// <summary>
    /// Модель для представления текущего статуса привязки устройства
    /// </summary>
    public class DevicePairingStatus
    {
        public bool IsPaired { get; set; }
        public long? BoundTelegramUserId { get; set; }
        public string? BoundUsername { get; set; }
        public DateTime? PairingDate { get; set; }
        public string? CurrentDeviceId { get; set; }
        public DateTime? CurrentDeviceIdExpiration { get; set; }
        public string? SessionToken { get; set; }
        public int FailedAttempts { get; set; }
        public DateTime? LastAttemptTime { get; set; }
    }

    /// <summary>
    /// Модель для временного Device ID (действует 15 минут)
    /// </summary>
    public class TemporaryDeviceId
    {
        public string Id { get; set; }
        public DateTime GeneratedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; }
        public string? UsedByUsername { get; set; }
        public long? UsedByUserId { get; set; }

        public bool IsValid => !IsUsed && DateTime.UtcNow < ExpiresAt;
    }

    /// <summary>
    /// Модель для запроса на подтверждение pairing'а
    /// </summary>
    public class PairingConfirmationRequest
    {
        public string DeviceId { get; set; }
        public long TelegramUserId { get; set; }
        public string? Username { get; set; }
        public DateTime RequestedAt { get; set; }
        public int ConfirmationTimeoutSeconds { get; set; } = 30;
        public bool IsExpired => DateTime.UtcNow > RequestedAt.AddSeconds(ConfirmationTimeoutSeconds);
    }

    /// <summary>
    /// Модель для безопасной сессии после привязки
    /// </summary>
    public class SecureSession
    {
        public string SessionToken { get; set; }
        public long BoundTelegramUserId { get; set; }
        public string? BoundUsername { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastActivityAt { get; set; }
        public List<string> ProcessedUpdateIds { get; set; } = new();
        public int CommandsProcessed { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Модель для логирования попыток подключения
    /// </summary>
    public class ConnectionAttempt
    {
        public DateTime AttemptTime { get; set; }
        public string? DeviceId { get; set; }
        public long? TelegramUserId { get; set; }
        public string? Username { get; set; }
        public string Status { get; set; } // "success", "failed", "expired", "invalid"
        public string? FailureReason { get; set; }
        public string? IpAddress { get; set; }
    }

    /// <summary>
    /// Модель для конфигурации системы безопасности
    /// </summary>
    public class SecurityConfig
    {
        public int DeviceIdExpirationMinutes { get; set; } = 15;
        public int PairingConfirmationTimeoutSeconds { get; set; } = 30;
        public int MaxFailedAttempts { get; set; } = 5;
        public int LockoutDurationMinutes { get; set; } = 15;
        public int SessionTokenLength { get; set; } = 32;
        public bool RequireLocalConfirmation { get; set; } = true;
        public bool LogAllAttempts { get; set; } = true;
        public int RateLimitRequestsPerMinute { get; set; } = 10;
    }
}
