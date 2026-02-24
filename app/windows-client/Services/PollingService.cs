using System;
using System.Threading;
using System.Threading.Tasks;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    public class PollingService
    {
        private readonly CloudflareClient _cloudflareClient;
        private readonly CommandProcessor _commandProcessor;
        private readonly Logger _logger;
        private readonly string _deviceId;
        private int _pollingIntervalMs;

        // Device pairing services
        private readonly PairingManager? _pairingManager;
        private readonly SessionManager? _sessionManager;
        private readonly SecurityValidator? _securityValidator;
        private readonly UpdateTracker? _updateTracker;

        private CancellationTokenSource? _cancellationTokenSource;
        private Task? _pollingTask;
        private bool _isRunning = false;

        public event EventHandler<SystemStatus>? StatusChanged;
        public event EventHandler<string>? ConnectionStatusChanged;
        public event EventHandler<PairingConfirmationRequest>? PairingConfirmationRequested;
        public event EventHandler<string>? PairingStatusChanged;

        public bool IsRunning => _isRunning;

        public PollingService(
            CloudflareClient cloudflareClient,
            CommandProcessor commandProcessor,
            Logger logger,
            string deviceId,
            int pollingIntervalMs = 3000,
            PairingManager? pairingManager = null,
            SessionManager? sessionManager = null,
            SecurityValidator? securityValidator = null,
            UpdateTracker? updateTracker = null)
        {
            _cloudflareClient = cloudflareClient;
            _commandProcessor = commandProcessor;
            _logger = logger;
            _deviceId = deviceId;
            _pollingIntervalMs = pollingIntervalMs;
            
            // Optional pairing support
            _pairingManager = pairingManager;
            _sessionManager = sessionManager;
            _securityValidator = securityValidator;
            _updateTracker = updateTracker;

            if ((_pairingManager != null) != (_sessionManager != null))
            {
                _logger.LogWarning("PairingManager and SessionManager should be provided together");
            }
        }

        public void Start()
        {
            if (_isRunning)
            {
                _logger.LogWarning("Polling service is already running");
                return;
            }

            _cancellationTokenSource = new CancellationTokenSource();
            _isRunning = true;

            _pollingTask = Task.Run(async () => await PollingLoop(_cancellationTokenSource.Token));

            _logger.LogInfo("Polling service started");
            ConnectionStatusChanged?.Invoke(this, "Connecting...");
        }

        public void Stop()
        {
            if (!_isRunning)
            {
                _logger.LogWarning("Polling service is not running");
                return;
            }

            _cancellationTokenSource?.Cancel();
            _isRunning = false;

            try
            {
                _pollingTask?.Wait(5000);
            }
            catch (OperationCanceledException) { }

            _logger.LogInfo("Polling service stopped");
            ConnectionStatusChanged?.Invoke(this, "Offline");
        }

        private async Task PollingLoop(CancellationToken cancellationToken)
        {
            int failureCount = 0;
            const int maxFailures = 5;

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Get commands from Cloudflare
                    var commands = await _cloudflareClient.GetCommandsAsync(_deviceId);

                    if (commands.Count > 0)
                    {
                        _logger.LogInfo($"Received {commands.Count} command(s)");
                        failureCount = 0; // Reset on success

                        // Process each command
                        foreach (var command in commands)
                        {
                            try
                            {
                                // Regular command processing
                                var result = await _commandProcessor.ProcessCommandAsync(command);

                                // Send result back
                                if (result != null)
                                {
                                    await _cloudflareClient.SendResultAsync(result);

                                    // Delete command from KV
                                    await _cloudflareClient.DeleteCommandAsync(_deviceId, command.Id ?? "");
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogException(ex);
                            }
                        }
                    }

                    // Update status
                    var status = new SystemStatus
                    {
                        DeviceId = _deviceId,
                        IsOnline = true,
                        LastUpdate = DateTime.Now
                    };
                    await _cloudflareClient.UpdateStatusAsync(status);
                    StatusChanged?.Invoke(this, status);
                    ConnectionStatusChanged?.Invoke(this, "Online");

                    // Wait before next poll
                    await Task.Delay(_pollingIntervalMs, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is stopping
                    break;
                }
                catch (Exception ex)
                {
                    failureCount++;
                    _logger.LogError($"Polling error (attempt {failureCount}/{maxFailures}): {ex.Message}");

                    if (failureCount >= maxFailures)
                    {
                        _logger.LogError("Maximum polling failures reached");
                        ConnectionStatusChanged?.Invoke(this, "Offline");
                        failureCount = 0; // Reset to attempt recovery
                    }

                    // Wait with exponential backoff
                    int delay = Math.Min(_pollingIntervalMs * failureCount, 30000);
                    try
                    {
                        await Task.Delay(delay, cancellationToken);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }
        }

        public void SetPollingInterval(int intervalMs)
        {
            if (intervalMs < 1000 || intervalMs > 60000)
            {
                _logger.LogWarning("Polling interval must be between 1-60 seconds");
                return;
            }

            _pollingIntervalMs = intervalMs;
            _logger.LogInfo($"Polling interval changed to {intervalMs}ms");
        }
    }
}