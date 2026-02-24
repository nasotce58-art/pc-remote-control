using System;
using System.Collections.Generic;

namespace PCRemoteControl.Models
{
    public class ApplicationInfo
    {
        public string? Name { get; set; }
        public string? Path { get; set; }
        public string? IconPath { get; set; }
        public bool IsDefault { get; set; }
    }

    public class SystemStatus
    {
        public string? DeviceId { get; set; }
        public bool IsOnline { get; set; }
        public float CpuUsage { get; set; }
        public float RamUsage { get; set; }
        public float GpuUsage { get; set; }
        public float Temperature { get; set; }
        public string? NetworkStatus { get; set; }
        public long Uptime { get; set; }
        public DateTime LastUpdate { get; set; }
    }

    public class AppSettings
    {
        public string? DeviceId { get; set; }
        public string? CloudflareApiToken { get; set; }
        public string? CloudflareAccountId { get; set; }
        public string? CloudflareNamespaceId { get; set; }
        public bool StartWithWindows { get; set; }
        public bool MinimizeToTray { get; set; }
        public bool AllowWakeOnLan { get; set; }
        public bool EnableNotifications { get; set; }
        public int PollingIntervalMs { get; set; } = 3000;
        public List<ApplicationInfo>? Applications { get; set; } = new();

        // Device Pairing Settings
        public bool IsPaired { get; set; } = false;
        public long? BoundTelegramUserId { get; set; }
        public string? BoundTelegramUsername { get; set; }
        public string? SessionToken { get; set; }
        public DateTime? PairingDate { get; set; }
        public DateTime? SessionCreatedAt { get; set; }
        public DateTime? SessionLastActivityAt { get; set; }
        
        // Security Settings
        public int DeviceIdExpirationMinutes { get; set; } = 15;
        public int PairingConfirmationTimeoutSeconds { get; set; } = 30;
        public int MaxFailedAttemptsBeforeBlock { get; set; } = 5;
        public int LockoutDurationMinutes { get; set; } = 15;
        public int SessionTokenLengthBytes { get; set; } = 32;
        public bool RequireLocalConfirmationForPairing { get; set; } = true;
        public bool LogAllSecurityEvents { get; set; } = true;
        public int RateLimitRequestsPerMinute { get; set; } = 10;
    }
}
