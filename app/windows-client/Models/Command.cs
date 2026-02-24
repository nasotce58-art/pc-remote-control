using System;
using System.Collections.Generic;

namespace PCRemoteControl.Models
{
    public class Command
    {
        public string? Id { get; set; }
        public string? Type { get; set; }
        public string? DeviceId { get; set; }
        public string? Action { get; set; }
        public Dictionary<string, object>? Parameters { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Status { get; set; }
        
        // For Telegram integration and pairing commands
        public long? UserId { get; set; }
        public string? Username { get; set; }
        public string? Content { get; set; }
    }

    public class CommandResult
    {
        public string? CommandId { get; set; }
        public string? DeviceId { get; set; }
        public bool Success { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? Data { get; set; }
        public DateTime ExecutedAt { get; set; }
    }

    public class CommandResponse
    {
        public List<Command>? Commands { get; set; }
    }
}
