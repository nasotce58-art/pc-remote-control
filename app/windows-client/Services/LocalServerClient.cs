using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    public class LocalServerClient
    {
        private readonly string _wsUrl;
        private readonly string _deviceId;
        private readonly Logger _logger;
        private ClientWebSocket _ws;
        private bool _isConnected = false;
        private CancellationTokenSource _cancellationTokenSource;

        public event EventHandler<Command> CommandReceived;

        public LocalServerClient(string wsUrl, string deviceId, Logger logger)
        {
            _wsUrl = wsUrl;
            _deviceId = deviceId;
            _logger = logger;
            _ws = null;
            _cancellationTokenSource = new CancellationTokenSource();
        }

        public async Task ConnectAsync()
        {
            try
            {
                _ws = new ClientWebSocket();
                await _ws.ConnectAsync(new Uri(_wsUrl), _cancellationTokenSource.Token);
                _isConnected = true;
                _logger.LogInfo($"✅ Connected to Local API Server: {_wsUrl}");

                // Register Windows Client
                var registerMessage = new
                {
                    type = "REGISTER_WINDOWS",
                    payload = new
                    {
                        name = "Windows Client",
                        deviceId = _deviceId
                    }
                };

                await SendMessageAsync(registerMessage);
                _logger.LogInfo("📤 Registered with Local API Server");

                // Start listening for commands
                _ = ListenForCommandsAsync();
            }
            catch (Exception ex)
            {
                _isConnected = false;
                _logger.LogError($"❌ Failed to connect to Local API Server: {ex.Message}");
                // Retry in 5 seconds
                await Task.Delay(5000);
                await ConnectAsync();
            }
        }

        private async Task ListenForCommandsAsync()
        {
            try
            {
                byte[] buffer = new byte[1024 * 4];

                while (_ws.State == WebSocketState.Open)
                {
                    WebSocketReceiveResult result = await _ws.ReceiveAsync(
                        new ArraySegment<byte>(buffer), _cancellationTokenSource.Token);

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        string messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        HandleWebSocketMessage(messageJson);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ WebSocket listening error: {ex.Message}");
                _isConnected = false;

                // Reconnect after 5 seconds
                await Task.Delay(5000);
                await ConnectAsync();
            }
        }

        private void HandleWebSocketMessage(string messageJson)
        {
            try
            {
                var message = JsonConvert.DeserializeObject<dynamic>(messageJson);
                string type = message["type"];
                dynamic payload = message["payload"];

                _logger.LogInfo($"📨 WebSocket message: {type}");

                switch (type)
                {
                    case "COMMAND_FROM_BOT":
                        var command = new Command
                        {
                            Id = (string)payload["id"],
                            Action = (string)payload["command"],
                            CreatedAt = DateTime.UtcNow
                        };
                        _logger.LogInfo($"📌 Command received: {command.Action}");
                        CommandReceived?.Invoke(this, command);
                        break;

                    case "BOT_CONNECTED":
                        _logger.LogInfo("✅ Bot connected to server");
                        break;

                    case "SYSTEM_STATUS":
                        _logger.LogInfo("📊 System status update received");
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error parsing WebSocket message: {ex.Message}");
            }
        }

        public async Task SendCommandResultAsync(string commandId, bool success, string result)
        {
            try
            {
                var message = new
                {
                    type = "COMMAND_RESULT",
                    payload = new
                    {
                        commandId = commandId,
                        success = success,
                        result = result,
                        timestamp = DateTime.UtcNow.ToString("O")
                    }
                };

                await SendMessageAsync(message);
                _logger.LogInfo($"✅ Result sent for command {commandId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send command result: {ex.Message}");
            }
        }

        public async Task SendSystemStatusAsync(double cpuUsage, double ramUsage, int temperature)
        {
            try
            {
                var message = new
                {
                    type = "SYSTEM_STATUS",
                    payload = new
                    {
                        deviceId = _deviceId,
                        cpuUsage = cpuUsage,
                        ramUsage = ramUsage,
                        temperature = temperature,
                        isOnline = true,
                        timestamp = DateTime.UtcNow.ToString("O")
                    }
                };

                await SendMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send system status: {ex.Message}");
            }
        }

        private async Task SendMessageAsync(object message)
        {
            if (!_isConnected || _ws?.State != WebSocketState.Open)
            {
                _logger.LogError("Not connected to Local API Server");
                return;
            }

            try
            {
                string json = JsonConvert.SerializeObject(message);
                byte[] data = Encoding.UTF8.GetBytes(json);

                await _ws.SendAsync(
                    new ArraySegment<byte>(data), 
                    WebSocketMessageType.Text, 
                    true, 
                    _cancellationTokenSource.Token);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send WebSocket message: {ex.Message}");
            }
        }

        public bool IsConnected => _isConnected && _ws?.State == WebSocketState.Open;

        public async Task DisconnectAsync()
        {
            try
            {
                if (_ws?.State == WebSocketState.Open)
                {
                    await _ws.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Closing",
                        CancellationToken.None);
                }

                _ws?.Dispose();
                _isConnected = false;
                _logger.LogInfo("✅ Disconnected from Local API Server");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error disconnecting: {ex.Message}");
            }
        }
    }
}
