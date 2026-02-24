using System;
using System.Collections.ObjectModel;
using System.Windows;
using PCRemoteControl.Services;
using PCRemoteControl.Utils;
using PCRemoteControl.ViewModels;

namespace PCRemoteControl
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Initialize logger
            var logEntries = new ObservableCollection<string>();
            var logger = new Logger(logEntries);

            try
            {
                // Initialize services
                var cloudflareClient = new CloudflareClient(
                    apiToken: Environment.GetEnvironmentVariable("CLOUDFLARE_API_TOKEN") ?? "demo-token-12345",
                    accountId: Environment.GetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID") ?? "demo-account-id",
                    namespaceId: Environment.GetEnvironmentVariable("CLOUDFLARE_KV_NAMESPACE") ?? "demo-namespace-id",
                    logger: logger
                );

                var commandProcessor = new CommandProcessor(logger);

                var deviceId = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

                var pollingService = new PollingService(
                    cloudflareClient: cloudflareClient,
                    commandProcessor: commandProcessor,
                    logger: logger,
                    deviceId: deviceId,
                    pollingIntervalMs: 3000
                );

                // Initialize Telegram API Client
                var botToken = "7915893078:AAEO-BXaXYDy2TKcglNvVFINeeetPzxYgT0";
                var telegramClient = new TelegramAPIClient(botToken, deviceId, logger);
                
                // Register device with Telegram
                _ = telegramClient.RegisterDeviceAsync();
                
                // Start Telegram polling in background
                _ = telegramClient.StartPollingAsync(async (update) =>
                {
                    logger.LogInfo($"📱 Telegram update received for device: {update.DeviceId}");
                });

                // Create ViewModel and MainWindow
                var viewModel = new MainViewModel(pollingService, logger);
                viewModel.LogEntries.CollectionChanged += (s, e) => { }; // Forward events

                var mainWindow = new MainWindow();
                mainWindow.SetViewModel(viewModel);

                // Start polling
                viewModel.StartPolling();

                this.MainWindow = mainWindow;
                mainWindow.Show();
            }
            catch (Exception ex)
            {
                logger.LogException(ex);
                MessageBox.Show($"Failed to start application: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                this.Shutdown();
            }
        }
    }
}
