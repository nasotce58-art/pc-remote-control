using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using PCRemoteControl.Models;
using PCRemoteControl.Services;
using PCRemoteControl.Utils;

namespace PCRemoteControl.ViewModels
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private readonly PollingService _pollingService;
        private readonly Logger _logger;

        private string _deviceId = "";
        private string _connectionStatus = "Offline";
        private float _cpuUsage = 0;
        private float _ramUsage = 0;
        private float _temperature = 0;
        private bool _isOnline = false;

        public ObservableCollection<string> LogEntries { get; }
        public ObservableCollection<ApplicationInfo> Applications { get; }

        public event PropertyChangedEventHandler? PropertyChanged;

        public MainViewModel(PollingService pollingService, Logger logger)
        {
            _pollingService = pollingService;
            _logger = logger;

            LogEntries = new ObservableCollection<string>();
            Applications = new ObservableCollection<ApplicationInfo>();

            // Set up event handlers
            _pollingService.StatusChanged += (s, status) => UpdateStatus(status);
            _pollingService.ConnectionStatusChanged += (s, status) => ConnectionStatus = status;

            // Load device ID
            _deviceId = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

            _logger.LogInfo("Application started");
            _logger.LogInfo($"Device ID: {_deviceId}");
        }

        public string DeviceId
        {
            get => _deviceId;
            set { SetProperty(ref _deviceId, value); }
        }

        public string ConnectionStatus
        {
            get => _connectionStatus;
            set { SetProperty(ref _connectionStatus, value); }
        }

        public float CpuUsage
        {
            get => _cpuUsage;
            set { SetProperty(ref _cpuUsage, value); }
        }

        public float RamUsage
        {
            get => _ramUsage;
            set { SetProperty(ref _ramUsage, value); }
        }

        public float Temperature
        {
            get => _temperature;
            set { SetProperty(ref _temperature, value); }
        }

        public bool IsOnline
        {
            get => _isOnline;
            set { SetProperty(ref _isOnline, value); }
        }

        public void StartPolling()
        {
            _pollingService.Start();
        }

        public void StopPolling()
        {
            _pollingService.Stop();
        }

        public void AddApplication(ApplicationInfo app)
        {
            Applications.Add(app);
            _logger.LogInfo($"Added application: {app.Name}");
        }

        public void RemoveApplication(ApplicationInfo app)
        {
            Applications.Remove(app);
            _logger.LogInfo($"Removed application: {app.Name}");
        }

        public void CopyDeviceId()
        {
            try
            {
                System.Windows.Forms.Clipboard.SetText(DeviceId);
                _logger.LogSuccess("Device ID copied to clipboard");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to copy Device ID: {ex.Message}");
            }
        }

        private void UpdateStatus(SystemStatus status)
        {
            IsOnline = status.IsOnline;
            CpuUsage = status.CpuUsage;
            RamUsage = status.RamUsage;
            Temperature = status.Temperature;
        }

        protected void SetProperty<T>(ref T field, T value, [CallerMemberName] string propertyName = "")
        {
            if (!Equals(field, value))
            {
                field = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
            }
        }
    }
}
