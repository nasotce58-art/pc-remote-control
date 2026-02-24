using System;
using System.Windows;
using System.Windows.Threading;
using PCRemoteControl.Models;
using PCRemoteControl.Services;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Views
{
    public partial class PairingConfirmationDialog : Window
    {
        private readonly PairingManager _pairingManager;
        private readonly Logger _logger;
        private readonly PairingConfirmationRequest _confirmationRequest;
        private DispatcherTimer _countdownTimer;
        private int _secondsRemaining;

        public PairingConfirmationDialog(
            PairingConfirmationRequest confirmationRequest,
            PairingManager pairingManager,
            Logger logger)
        {
            InitializeComponent();

            _confirmationRequest = confirmationRequest ?? throw new ArgumentNullException(nameof(confirmationRequest));
            _pairingManager = pairingManager ?? throw new ArgumentNullException(nameof(pairingManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            // Initialize UI
            InitializeUI();
            StartCountdown();
        }

        private void InitializeUI()
        {
            try
            {
                UsernameTextBlock.Text = $"@{_confirmationRequest.Username}";
                DeviceIdTextBlock.Text = _confirmationRequest.DeviceId;
                CountdownRun.Text = "30 seconds";
                
                _logger.LogInfo($"Pairing confirmation dialog shown for device {_confirmationRequest.DeviceId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error initializing UI: {ex.Message}");
            }
        }

        private void StartCountdown()
        {
            _secondsRemaining = 30;
            
            _countdownTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            
            _countdownTimer.Tick += (s, e) =>
            {
                _secondsRemaining--;
                CountdownRun.Text = $"{_secondsRemaining} seconds";
                CountdownProgress.Value = (_secondsRemaining / 30.0) * 100;

                if (_secondsRemaining <= 0)
                {
                    _countdownTimer.Stop();
                    HandleTimeout();
                }
            };

            _countdownTimer.Start();
            CountdownProgress.Value = 100;
        }

        private void ConfirmButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                _countdownTimer?.Stop();

                StatusTextBlock.Text = "Confirming...";
                ConfirmButton.IsEnabled = false;
                RejectButton.IsEnabled = false;

                // Confirm pairing
                _pairingManager.ConfirmPairing(
                    _confirmationRequest.DeviceId,
                    _confirmationRequest.TelegramUserId);

                _logger.LogInfo($"Pairing confirmed for user {_confirmationRequest.TelegramUserId}");
                StatusTextBlock.Text = "✓ Pairing confirmed!";
                StatusTextBlock.Foreground = System.Windows.Media.Brushes.LimeGreen;

                // Close after short delay
                DispatcherTimer closeTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
                closeTimer.Tick += (s, e) =>
                {
                    closeTimer.Stop();
                    this.Close();
                };
                closeTimer.Start();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error confirming pairing: {ex.Message}");
                StatusTextBlock.Text = "✗ Error during confirmation";
                StatusTextBlock.Foreground = System.Windows.Media.Brushes.Red;
            }
        }

        private void RejectButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                _countdownTimer?.Stop();

                StatusTextBlock.Text = "Denying...";
                ConfirmButton.IsEnabled = false;
                RejectButton.IsEnabled = false;

                // Reject pairing
                _pairingManager.RejectPairing(
                    _confirmationRequest.DeviceId,
                    _confirmationRequest.TelegramUserId,
                    "User denied pairing request");

                _logger.LogInfo($"Pairing denied for user {_confirmationRequest.TelegramUserId}");
                StatusTextBlock.Text = "✗ Pairing denied";
                StatusTextBlock.Foreground = System.Windows.Media.Brushes.OrangeRed;

                // Close after short delay
                DispatcherTimer closeTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
                closeTimer.Tick += (s, e) =>
                {
                    closeTimer.Stop();
                    this.Close();
                };
                closeTimer.Start();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error rejecting pairing: {ex.Message}");
                StatusTextBlock.Text = "✗ Error during rejection";
                StatusTextBlock.Foreground = System.Windows.Media.Brushes.Red;
            }
        }

        private void HandleTimeout()
        {
            try
            {
                _logger.LogWarning($"Pairing confirmation timeout for device {_confirmationRequest.DeviceId}");

                _pairingManager.RejectPairing(
                    _confirmationRequest.DeviceId,
                    _confirmationRequest.TelegramUserId,
                    "Confirmation timeout");

                StatusTextBlock.Text = "⏱ Request expired";
                StatusTextBlock.Foreground = System.Windows.Media.Brushes.Orange;
                ConfirmButton.IsEnabled = false;
                RejectButton.IsEnabled = false;

                // Auto-close after 2 seconds
                DispatcherTimer closeTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
                closeTimer.Tick += (s, e) =>
                {
                    closeTimer.Stop();
                    this.Close();
                };
                closeTimer.Start();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error handling timeout: {ex.Message}");
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _countdownTimer?.Stop();
            base.OnClosed(e);
        }
    }
}
