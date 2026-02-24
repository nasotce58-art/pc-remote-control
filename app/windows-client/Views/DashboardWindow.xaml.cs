using System;
using System.Windows;
using System.Windows.Controls;
using System.Diagnostics;
using System.Windows.Threading;
using System.Collections.Generic;
using System.Linq;
using WinForms = System.Windows.Forms;
using PCRemoteControl.Services;

namespace PCRemoteControl
{
    public class LanguageManager
    {
        private static string currentLanguage = "ru";
        
        public static string GetString(string key)
        {
            var translations = new Dictionary<string, Dictionary<string, string>>
            {
                { "ru", new Dictionary<string, string>
                    {
                        { "dashboard", "📊 ГЛАВНЫЙ ЭКРАН" },
                        { "status_system", "📊 СТАТУС СИСТЕМЫ" },
                        { "device", "🖥 Устройство" },
                        { "user", "👤 Пользователь" },
                        { "ip", "🌐 IP" },
                        { "cloudflare", "☁️ Cloudflare" },
                        { "telegram_id", "🔗 ID Telegram" },
                        { "copy", "[📋 Copy]" },
                        { "power_control", "⚡ ПИТАНИЕ И СЕТЬ" },
                        { "restart", "🔄 Перезагрузка" },
                        { "sleep", "😴 Спящий режим" },
                        { "shutdown", "🛑 Выключение" },
                        { "force_shutdown", "💥 Принудит. вкл" },
                        { "monitoring", "📊 МОНИТОРИНГ И ЭКРАН" },
                        { "screenshot", "📸 Скриншот" },
                        { "webcam", "🎥 Веб-камера" },
                        { "refresh_list", "🔄 Обновить" },
                        { "processes", "📋 ПРОЦЕССЫ (сортировка:" },
                        { "by_memory", "По памяти ↓" },
                        { "by_name", "По имени ↑" },
                        { "by_id", "По ID ↑" },
                        { "files", "📁 ФАЙЛЫ И ПРИЛОЖЕНИЯ" },
                        { "path", "Путь" },
                        { "download", "📥 Скачать" },
                        { "upload", "📤 Загрузить" },
                        { "delete", "🗑️ Удалить" },
                        { "refresh", "🔄 Обновить" },
                        { "control", "⌨️ УПРАВЛЕНИЕ И ВВОД" },
                        { "clipboard", "📋 Буфер обмена" },
                        { "clipboard_refresh", "📋 Обновить" },
                        { "clipboard_set", "📋 Установить" },
                        { "command", "⌨️ Выполнить команду" },
                        { "execute", "▶️ Выполнить" },
                        { "settings", "⚙️ НАСТРОЙКИ" },
                        { "autostart", "Автозагрузка" },
                        { "notifications", "Уведомления" },
                        { "save", "💾 Сохранить" },
                        { "logs", "� ЛОГИ" },
                        { "clear", "🗑️ Очистить" },
                        { "connected", "Connected" },
                        { "online", "🟢 Online" },
                        { "language", "RU" }
                    }
                },
                { "en", new Dictionary<string, string>
                    {
                        { "dashboard", "📊 DASHBOARD" },
                        { "status_system", "📊 SYSTEM STATUS" },
                        { "device", "🖥 Device" },
                        { "user", "👤 User" },
                        { "ip", "🌐 IP" },
                        { "cloudflare", "☁️ Cloudflare" },
                        { "telegram_id", "🔗 Telegram ID" },
                        { "copy", "[📋 Copy]" },
                        { "power_control", "⚡ POWER & NETWORK" },
                        { "restart", "🔄 Restart" },
                        { "sleep", "😴 Sleep" },
                        { "shutdown", "🛑 Shutdown" },
                        { "force_shutdown", "💥 Force Shutdown" },
                        { "monitoring", "📊 MONITORING & SCREEN" },
                        { "screenshot", "📸 Screenshot" },
                        { "webcam", "🎥 Webcam" },
                        { "refresh_list", "🔄 Refresh" },
                        { "processes", "📋 PROCESSES (sort by:" },
                        { "by_memory", "By Memory ↓" },
                        { "by_name", "By Name ↑" },
                        { "by_id", "By ID ↑" },
                        { "files", "📁 FILES & APPLICATIONS" },
                        { "path", "Path" },
                        { "download", "📥 Download" },
                        { "upload", "📤 Upload" },
                        { "delete", "🗑️ Delete" },
                        { "refresh", "🔄 Refresh" },
                        { "control", "⌨️ INPUT & CONTROL" },
                        { "clipboard", "📋 Clipboard" },
                        { "clipboard_refresh", "📋 Refresh" },
                        { "clipboard_set", "📋 Set" },
                        { "command", "⌨️ Execute Command" },
                        { "execute", "▶️ Execute" },
                        { "settings", "⚙️ SETTINGS" },
                        { "autostart", "Autostart" },
                        { "notifications", "Notifications" },
                        { "save", "💾 Save" },
                        { "logs", "� LOGS" },
                        { "clear", "🗑️ Clear" },
                        { "connected", "Connected" },
                        { "online", "🟢 Online" },
                        { "language", "EN" }
                    }
                }
            };
            
            if (translations.ContainsKey(currentLanguage) && translations[currentLanguage].ContainsKey(key))
                return translations[currentLanguage][key];
            return key;
        }
        
        public static void SetLanguage(string lang)
        {
            currentLanguage = lang;
        }
        
        public static string GetLanguage()
        {
            return currentLanguage;
        }
    }

    public partial class DashboardWindow : Window
    {
        private DispatcherTimer dashboardTimer;
        private DispatcherTimer monitoringTimer;
        private string _deviceId;
        private string _lastSentDeviceId;
        private DateTime _lastDeviceIdSendTime;

        public DashboardWindow()
        {
            InitializeComponent();
            InitializeDeviceId();
            InitializeDashboard();
        }

        private void InitializeDeviceId()
        {
            // Генерирую новый Device ID в формате XXXX-XXXX при каждом запуске
            // (в production можно сохранять в файл)
            var generator = new DeviceIdGenerator(null);
            _deviceId = generator.GenerateDeviceId();
        }

        private void InitializeDashboard()
        {
            NavDashboard.IsSelected = true;
            ShowDashboard();
        }

        private void NavDashboard_Selected(object sender, RoutedEventArgs e) => ShowDashboard();
        private void NavPower_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowPowerControl();
        }
        private void NavMonitoring_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowMonitoring();
        }
        private void NavFiles_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowFileManager();
        }
        private void NavControl_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowInputControl();
        }
        private void NavSettings_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowSettings();
        }
        private void NavLogs_Selected(object sender, RoutedEventArgs e)
        {
            StopAllTimers();
            ShowLogs();
        }

        private void StopAllTimers()
        {
            if (dashboardTimer != null && dashboardTimer.IsEnabled)
            {
                dashboardTimer.Stop();
            }
            if (monitoringTimer != null && monitoringTimer.IsEnabled)
            {
                monitoringTimer.Stop();
            }
        }

        private void ClearMainContent() => MainContentArea.Children.Clear();

        private void ShowDashboard()
        {
            ClearMainContent();
            
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            var dashboard = new StackPanel { Orientation = Orientation.Vertical, Name = "DashboardPanel" };
            dashboard.Children.Add(new TextBlock { Text = LanguageManager.GetString("dashboard"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });
            
            // Добавляю информацию о системе и ID коннектора
            var infoPanel = new StackPanel { Orientation = Orientation.Vertical, Margin = new Thickness(0, 0, 0, 15) };
            infoPanel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("device")}: {Environment.MachineName}\n{LanguageManager.GetString("user")}: {Environment.UserName}\n{LanguageManager.GetString("ip")}: 192.168.1.12\n{LanguageManager.GetString("cloudflare")}: {LanguageManager.GetString("connected")}", FontSize = 12, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 0, 0, 10) });
            
            // ID коннектора для Telegram
            var connectorPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
            connectorPanel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("telegram_id")}: ", FontSize = 11, Foreground = System.Windows.Media.Brushes.LightGray });
            var connectorIdBlock = new TextBlock 
            { 
                Text = _deviceId, 
                FontSize = 11, 
                Foreground = System.Windows.Media.Brushes.Yellow,
                FontFamily = new System.Windows.Media.FontFamily("Courier New"),
                TextDecorations = System.Windows.TextDecorations.Underline,
                Cursor = System.Windows.Input.Cursors.Hand
            };
            connectorIdBlock.MouseLeftButtonUp += (s, e) => OpenTelegramLink();
            connectorPanel.Children.Add(connectorIdBlock);
            var copyBtn = new TextBlock { Text = $" {LanguageManager.GetString("copy")}", FontSize = 10, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(5, 0, 0, 0), Cursor = System.Windows.Input.Cursors.Hand };
            copyBtn.MouseLeftButtonUp += (s, e) => CopyDeviceIdToClipboard();
            connectorPanel.Children.Add(copyBtn);
            
            // Запускаю таймер для автообновления каждые 3 секунды
            dashboardTimer = new DispatcherTimer();
            dashboardTimer.Interval = TimeSpan.FromSeconds(3);
            dashboardTimer.Tick += (s, e) => UpdateDashboard();
            dashboardTimer.Start();
        }
        
        private void UpdateDashboard()
        {
            // Генерирую случайные значения для демонстрации обновления
            var rnd = new Random();
            int cpu = rnd.Next(20, 90);
            int ram = rnd.Next(30, 85);
            int disk = rnd.Next(20, 70);
            int net = rnd.Next(50, 100);
            int bat = rnd.Next(40, 100);
            
            ClearMainContent();
            var dashboard = new StackPanel { Orientation = Orientation.Vertical };
            dashboard.Children.Add(new TextBlock { Text = LanguageManager.GetString("dashboard"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });
            
            var infoPanel = new StackPanel { Orientation = Orientation.Vertical, Margin = new Thickness(0, 0, 0, 15) };
            infoPanel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("device")}: {Environment.MachineName}\n{LanguageManager.GetString("user")}: {Environment.UserName}\n{LanguageManager.GetString("ip")}: 192.168.1.12\n{LanguageManager.GetString("cloudflare")}: {LanguageManager.GetString("connected")}", FontSize = 12, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 0, 0, 10) });
            
            // ID коннектора для Telegram
            var connectorPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
            connectorPanel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("telegram_id")}: ", FontSize = 11, Foreground = System.Windows.Media.Brushes.LightGray });
            var connectorIdBlock = new TextBlock 
            { 
                Text = _deviceId, 
                FontSize = 11, 
                Foreground = System.Windows.Media.Brushes.Yellow,
                FontFamily = new System.Windows.Media.FontFamily("Courier New"),
                TextDecorations = System.Windows.TextDecorations.Underline,
                Cursor = System.Windows.Input.Cursors.Hand
            };
            connectorIdBlock.MouseLeftButtonUp += (s, e) => OpenTelegramLink();
            connectorPanel.Children.Add(connectorIdBlock);
            var copyBtn2 = new TextBlock { Text = $" {LanguageManager.GetString("copy")}", FontSize = 10, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(5, 0, 0, 0), Cursor = System.Windows.Input.Cursors.Hand };
            copyBtn2.MouseLeftButtonUp += (s, e) => CopyDeviceIdToClipboard();
            connectorPanel.Children.Add(copyBtn2);
            
            infoPanel.Children.Add(connectorPanel);
            dashboard.Children.Add(infoPanel);
            
            dashboard.Children.Add(new TextBlock { Text = LanguageManager.GetString("status_system"), FontSize = 14, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 15, 0, 10) });
            
            dashboard.Children.Add(CreateProgressBar("CPU", cpu));
            dashboard.Children.Add(CreateProgressBar("RAM", ram));
            dashboard.Children.Add(CreateProgressBar("Disk C:", disk));
            dashboard.Children.Add(CreateProgressBar("Network", net));
            dashboard.Children.Add(CreateProgressBar("Battery", bat));
            MainContentArea.Children.Add(dashboard);

        }

        private Border CreateProgressBar(string label, int percent)
        {
            // Основной контейнер с левым лейблом и прогресс-баром справа
            var mainPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 10) };
            
            // Левый лейбл (название метрики)
            var labelBlock = new TextBlock 
            { 
                Text = label, 
                Foreground = System.Windows.Media.Brushes.WhiteSmoke, 
                Width = 90,
                VerticalAlignment = VerticalAlignment.Center,
                FontSize = 12
            };
            mainPanel.Children.Add(labelBlock);

            // Контейнер для прогресс-бара
            var progressContainer = new StackPanel { Orientation = Orientation.Vertical };
            
            // Верхняя строка с процентом
            var percentStack = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 3) };
            var percentBlock = new TextBlock 
            { 
                Text = $"{percent}%", 
                Foreground = System.Windows.Media.Brushes.LightBlue, 
                FontSize = 11,
                Width = 40
            };
            percentStack.Children.Add(percentBlock);
            progressContainer.Children.Add(percentStack);

            // Сам прогресс-бар (горизонтальный, растянутый)
            var progressBorder = new Border 
            { 
                Background = System.Windows.Media.Brushes.DarkSlateGray, 
                Height = 15, 
                CornerRadius = new CornerRadius(4),
                BorderBrush = System.Windows.Media.Brushes.DarkGray,
                BorderThickness = new Thickness(1),
                Width = 400
            };
            
            var progressFill = new Border 
            { 
                Background = GetColorForPercent(percent), 
                Height = 13, 
                Width = (percent / 100.0) * 395,  // 395 = 400 - 5 для отступа
                CornerRadius = new CornerRadius(3),
                Margin = new Thickness(1)
            };
            progressBorder.Child = progressFill;
            progressContainer.Children.Add(progressBorder);

            mainPanel.Children.Add(progressContainer);
            return new Border { Child = mainPanel, Padding = new Thickness(5) };
        }
        
        private System.Windows.Media.Brush GetColorForPercent(int percent)
        {
            if (percent > 80)
                return System.Windows.Media.Brushes.Red;
            if (percent > 60)
                return System.Windows.Media.Brushes.Orange;
            return System.Windows.Media.Brushes.LimeGreen;
        }

        private void ShowPowerControl()
        {
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical };
            panel.Children.Add(new TextBlock { Text = LanguageManager.GetString("power_control"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 20) });

            var buttonPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 10) };

            var restart = new Button { Content = LanguageManager.GetString("restart"), Height = 50, Width = 150, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 12, FontWeight = FontWeights.Bold };
            restart.Click += (s, e) => MessageBox.Show(LanguageManager.GetString("restart"), "Command");
            buttonPanel.Children.Add(restart);

            var sleep = new Button { Content = LanguageManager.GetString("sleep"), Height = 50, Width = 150, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 12, FontWeight = FontWeights.Bold };
            sleep.Click += (s, e) => MessageBox.Show(LanguageManager.GetString("sleep"), "Command");
            buttonPanel.Children.Add(sleep);

            var shutdown = new Button { Content = LanguageManager.GetString("shutdown"), Height = 50, Width = 150, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 12, FontWeight = FontWeights.Bold };
            shutdown.Click += (s, e) => MessageBox.Show(LanguageManager.GetString("shutdown"), "Command");
            buttonPanel.Children.Add(shutdown);

            var force = new Button { Content = LanguageManager.GetString("force_shutdown"), Height = 50, Width = 150, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, FontSize = 12, FontWeight = FontWeights.Bold };
            force.Click += (s, e) => MessageBox.Show(LanguageManager.GetString("force_shutdown"), "Command");
            buttonPanel.Children.Add(force);

            panel.Children.Add(buttonPanel);
            MainContentArea.Children.Add(panel);
        }

        private void ShowMonitoring()
        {
            // Остановить старый таймер если есть
            if (monitoringTimer != null)
            {
                monitoringTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical, Name = "MonitoringPanel" };
            panel.Children.Add(new TextBlock { Text = "📊 МОНИТОРИНГ И ЭКРАН", FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });

            var buttonsPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 15) };
            var btn1 = new Button { Content = LanguageManager.GetString("screenshot"), Width = 150, Height = 40, Background = System.Windows.Media.Brushes.LimeGreen, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0) };
            var btn2 = new Button { Content = LanguageManager.GetString("webcam"), Width = 150, Height = 40, Background = System.Windows.Media.Brushes.Orange, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0) };
            var btn3 = new Button { Content = LanguageManager.GetString("refresh_list"), Width = 150, Height = 40, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White };

            buttonsPanel.Children.Add(btn1);
            buttonsPanel.Children.Add(btn2);
            buttonsPanel.Children.Add(btn3);
            panel.Children.Add(buttonsPanel);

            // Заголовок и сортировка
            var headerPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 15, 0, 8) };
            headerPanel.Children.Add(new TextBlock { Text = LanguageManager.GetString("processes"), FontSize = 12, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue });
            
            var sortCombo = new ComboBox 
            { 
                Width = 180, 
                Height = 28, 
                Background = System.Windows.Media.Brushes.DarkSlateGray, 
                Foreground = System.Windows.Media.Brushes.White, 
                Margin = new Thickness(10, 0, 0, 0),
                Padding = new Thickness(8, 5, 8, 5)
            };
            sortCombo.Items.Add(LanguageManager.GetString("by_memory"));
            sortCombo.Items.Add(LanguageManager.GetString("by_name"));
            sortCombo.Items.Add(LanguageManager.GetString("by_id"));
            sortCombo.SelectedIndex = 0;
            headerPanel.Children.Add(sortCombo);
            headerPanel.Children.Add(new TextBlock { Text = ")", FontSize = 12, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(8, 0, 0, 0) });
            
            panel.Children.Add(headerPanel);

            // Список процессов с полной информацией
            var processList = new ListBox 
            { 
                Height = 450, 
                Background = System.Windows.Media.Brushes.DarkSlateGray, 
                Foreground = System.Windows.Media.Brushes.WhiteSmoke,
                FontFamily = new System.Windows.Media.FontFamily("Courier New"),
                FontSize = 10
            };
            
            RefreshProcessList(processList, 0);
            panel.Children.Add(processList);
            MainContentArea.Children.Add(panel);
            
            // Обработчик изменения сортировки
            sortCombo.SelectionChanged += (s, e) =>
            {
                RefreshProcessList(processList, sortCombo.SelectedIndex);
            };
            
            // Запускаю таймер для автообновления каждую 1 секунду
            monitoringTimer = new DispatcherTimer();
            monitoringTimer.Interval = TimeSpan.FromSeconds(1);
            monitoringTimer.Tick += (s, e) => 
            {
                if (processList.Items.Count > 0)
                {
                    RefreshProcessList(processList, sortCombo.SelectedIndex);
                }
            };
            monitoringTimer.Start();
        }
        
        private void RefreshProcessList(ListBox processList, int sortType)
        {
            processList.Items.Clear();
            var processes = Process.GetProcesses();
            
            var sortedProcesses = sortType switch
            {
                // По памяти (убывающий порядок)
                0 => processes.OrderByDescending(p => 
                {
                    try { return p.WorkingSet64; }
                    catch { return 0; }
                }),
                // По имени (возрастающий порядок)
                1 => processes.OrderBy(p => p.ProcessName),
                // По ID (возрастающий порядок)
                2 => processes.OrderBy(p => p.Id),
                _ => processes.OrderByDescending(p => 
                {
                    try { return p.WorkingSet64; }
                    catch { return 0; }
                })
            };
            
            foreach (var p in sortedProcesses.Take(50))  // Показываю топ 50 процессов
            {
                try
                {
                    long memMB = p.WorkingSet64 / 1024 / 1024;
                    string processName = p.ProcessName;
                    int processId = p.Id;
                    
                    // Форматированная строка: Имя.exe [ID] | Память
                    string displayText = $"{processName,-30} [{processId,6}] │ {memMB,5} MB";
                    processList.Items.Add(displayText);
                }
                catch { }
            }
        }

        private void ShowFileManager()
        {
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical };
            panel.Children.Add(new TextBlock { Text = LanguageManager.GetString("files"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });
            panel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("path")}: C:\\Users\\Admin\\Desktop", FontSize = 12, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 0, 0, 10) });

            var btnPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 15) };
            btnPanel.Children.Add(new Button { Content = LanguageManager.GetString("refresh"), Width = 120, Height = 40, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 11, FontWeight = FontWeights.Bold });
            btnPanel.Children.Add(new Button { Content = LanguageManager.GetString("download"), Width = 120, Height = 40, Background = System.Windows.Media.Brushes.LimeGreen, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 11, FontWeight = FontWeights.Bold });
            btnPanel.Children.Add(new Button { Content = LanguageManager.GetString("upload"), Width = 120, Height = 40, Background = System.Windows.Media.Brushes.Orange, Foreground = System.Windows.Media.Brushes.White, FontSize = 11, FontWeight = FontWeights.Bold });

            panel.Children.Add(btnPanel);
            MainContentArea.Children.Add(panel);
        }

        private void ShowInputControl()
        {
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical };
            panel.Children.Add(new TextBlock { Text = LanguageManager.GetString("control"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });

            panel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("clipboard")}:", FontSize = 12, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 8) });
            var clipBox = new TextBox { Height = 60, Background = System.Windows.Media.Brushes.DarkSlateGray, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Padding = new Thickness(8), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 10) };
            panel.Children.Add(clipBox);

            var clipBtnPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 15) };
            clipBtnPanel.Children.Add(new Button { Content = LanguageManager.GetString("clipboard_refresh"), Width = 120, Height = 35, Background = System.Windows.Media.Brushes.DodgerBlue, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 0, 10, 0), FontSize = 11, FontWeight = FontWeights.Bold });
            clipBtnPanel.Children.Add(new Button { Content = LanguageManager.GetString("clipboard_set"), Width = 120, Height = 35, Background = System.Windows.Media.Brushes.LimeGreen, Foreground = System.Windows.Media.Brushes.White, FontSize = 11, FontWeight = FontWeights.Bold });
            panel.Children.Add(clipBtnPanel);

            panel.Children.Add(new TextBlock { Text = $"{LanguageManager.GetString("command")}:", FontSize = 12, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 15, 0, 8) });
            
            // ✅ ДОБАВЛЕНО: ComboBox со списком частых команд
            var cmdComboBox = new ComboBox { Height = 35, Background = System.Windows.Media.Brushes.DarkSlateGray, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Padding = new Thickness(8), Margin = new Thickness(0, 0, 0, 10), IsEditable = true };
            cmdComboBox.Items.Add("ipconfig");
            cmdComboBox.Items.Add("dir");
            cmdComboBox.Items.Add("cd");
            cmdComboBox.Items.Add("Get-Process");
            cmdComboBox.Items.Add("Get-Date");
            cmdComboBox.Items.Add("whoami");
            cmdComboBox.Items.Add("tasklist");
            cmdComboBox.Items.Add("systeminfo");
            cmdComboBox.Items.Add("ping 8.8.8.8");
            cmdComboBox.Items.Add("netstat -an");
            cmdComboBox.Text = "ipconfig";
            panel.Children.Add(cmdComboBox);

            var cmdBtn = new Button { Content = LanguageManager.GetString("execute"), Width = 120, Height = 35, Background = System.Windows.Media.Brushes.LimeGreen, Foreground = System.Windows.Media.Brushes.White, FontSize = 11, FontWeight = FontWeights.Bold };
            cmdBtn.Click += (s, e) => ExecuteCommand(cmdComboBox.Text);
            panel.Children.Add(cmdBtn);

            // ✅ ДОБАВЛЕНО: История команд и результаты выполнения
            panel.Children.Add(new TextBlock { Text = "📋 История команд:", FontSize = 12, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 20, 0, 8) });
            var commandHistoryBox = new ListBox { Height = 150, Background = System.Windows.Media.Brushes.DarkSlateGray, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Padding = new Thickness(8) };
            commandHistoryBox.Name = "CommandHistoryBox";
            // ✅ Сохраняю ссылку для использования в методе ExecuteCommand
            _commandHistoryBox = commandHistoryBox;
            panel.Children.Add(commandHistoryBox);

            MainContentArea.Children.Add(panel);
        }

        private void ShowSettings()
        {
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical };
            panel.Children.Add(new TextBlock { Text = LanguageManager.GetString("settings"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });

            var cb1 = new CheckBox { Content = $"☑ {LanguageManager.GetString("autostart")}", Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 0, 0, 10) };
            panel.Children.Add(cb1);

            var cb2 = new CheckBox { Content = $"☑ {LanguageManager.GetString("notifications")}", Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 0, 0, 15), IsChecked = true };
            panel.Children.Add(cb2);

            panel.Children.Add(new TextBlock { Text = "Cloudflare URL:", Foreground = System.Windows.Media.Brushes.WhiteSmoke, Margin = new Thickness(0, 10, 0, 5) });
            var cfInput = new TextBox { Height = 35, Background = System.Windows.Media.Brushes.DarkSlateGray, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Padding = new Thickness(8), Text = "https://worker.xxx.work", Margin = new Thickness(0, 0, 0, 10) };
            panel.Children.Add(cfInput);

            panel.Children.Add(new TextBlock { Text = $"Device ID: {Environment.MachineName}", Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 10, 0, 0), FontSize = 11 });

            var saveBtn = new Button { Content = LanguageManager.GetString("save"), Width = 150, Height = 40, Background = System.Windows.Media.Brushes.LimeGreen, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 15, 0, 0), FontSize = 12, FontWeight = FontWeights.Bold };
            panel.Children.Add(saveBtn);

            MainContentArea.Children.Add(panel);
        }

        private void ShowLogs()
        {
            // Остановить старый таймер если есть
            if (dashboardTimer != null)
            {
                dashboardTimer.Stop();
            }
            
            ClearMainContent();
            var panel = new StackPanel { Orientation = Orientation.Vertical };
            panel.Children.Add(new TextBlock { Text = LanguageManager.GetString("logs"), FontSize = 18, FontWeight = FontWeights.Bold, Foreground = System.Windows.Media.Brushes.LightBlue, Margin = new Thickness(0, 0, 0, 15) });

            var logsList = new ListBox { Height = 400, Background = System.Windows.Media.Brushes.DarkSlateGray, Foreground = System.Windows.Media.Brushes.WhiteSmoke, Padding = new Thickness(8) };
            logsList.Items.Add($"{DateTime.Now:HH:mm:ss} - Dashboard загружен");
            logsList.Items.Add($"{DateTime.Now:HH:mm:ss} - Приложение готово");
            panel.Children.Add(logsList);

            var clearBtn = new Button { Content = LanguageManager.GetString("clear"), Width = 150, Height = 40, Background = System.Windows.Media.Brushes.OrangeRed, Foreground = System.Windows.Media.Brushes.White, Margin = new Thickness(0, 10, 0, 0), FontSize = 12, FontWeight = FontWeights.Bold };
            panel.Children.Add(clearBtn);

            MainContentArea.Children.Add(panel);
        }

        // ✅ ДОБАВЛЕНО: Поле для сохранения последней истории команд
        private ListBox? _commandHistoryBox;

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Выполняет команду, отправляя её в командную строку или логируя в историю
        /// </summary>
        private void ExecuteCommand(string command)
        {
            if (string.IsNullOrWhiteSpace(command))
            {
                MessageBox.Show("❌ Пожалуйста, введите команду", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                // Логирую команду в историю
                if (_commandHistoryBox != null)
                {
                    _commandHistoryBox.Items.Insert(0, $"[{DateTime.Now:HH:mm:ss}] $ {command}");
                }

                // Выполняю команду в PowerShell или CMD
                ExecuteCommandInPowerShell(command);

                MessageBox.Show($"✅ Команда выполнена: {command}", "Успешно", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"❌ Ошибка выполнения команды: {ex.Message}", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        /// <summary>
        /// Выполняет команду в PowerShell
        /// </summary>
        private void ExecuteCommandInPowerShell(string command)
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-Command \"{command}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using (var process = Process.Start(processInfo))
            {
                if (process != null)
                {
                    string output = process.StandardOutput.ReadToEnd();
                    string error = process.StandardError.ReadToEnd();
                    process.WaitForExit();

                    // Логирую результат в историю
                    if (_commandHistoryBox != null)
                    {
                        if (!string.IsNullOrEmpty(output))
                            _commandHistoryBox.Items.Insert(0, $"[{DateTime.Now:HH:mm:ss}] > {output.Replace(Environment.NewLine, " | ")}");
                        if (!string.IsNullOrEmpty(error))
                            _commandHistoryBox.Items.Insert(0, $"[{DateTime.Now:HH:mm:ss}] ❌ {error}");
                    }
                }
            }
        }

        private void LanguageButton_Click(object sender, RoutedEventArgs e)
        {
            // Переключение языка
            string currentLang = LanguageManager.GetLanguage();
            string newLang = currentLang == "ru" ? "en" : "ru";
            
            LanguageManager.SetLanguage(newLang);
            
            // Обновляю кнопку
            Button btn = sender as Button;
            if (btn != null)
            {
                btn.Content = LanguageManager.GetString("language");
            }
            
            // Перезагружаю текущую страницу для применения нового языка
            if (NavDashboard.IsSelected)
                ShowDashboard();
            else if (NavPower.IsSelected)
                ShowPowerControl();
            else if (NavMonitoring.IsSelected)
                ShowMonitoring();
            else if (NavFiles.IsSelected)
                ShowFileManager();
            else if (NavControl.IsSelected)
                ShowInputControl();
            else if (NavSettings.IsSelected)
                ShowSettings();
            else if (NavLogs.IsSelected)
                ShowLogs();
        }

        /// <summary>
        /// Открывает Telegram бота с автоматической командой подключения
        /// </summary>
        private async void OpenTelegramLink()
        {
            try
            {
                // Формируем команду подключения с Device ID
                string connectCommand = $"/connect {_deviceId}";
                
                // Кодируем команду для URL
                string encodedCommand = System.Uri.EscapeDataString(connectCommand);
                
                // Открываем Telegram с текстом команды для автоматического заполнения
                string telegramBotUrl = $"https://t.me/conrolpcffbot?start={_deviceId}";
                
                // Также пытаемся открыть прямой чат с предзаполненной командой
                // Если первый вариант не сработает, будет открыт обычный чат
                try
                {
                    // Пытаемся открыть с предзаполненной командой (работает в некоторых версиях)
                    string chatUrl = $"tg://resolve?domain=conrolpcffbot&text={encodedCommand}";
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = chatUrl,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // Если не сработало, открываем обычную ссылку
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = telegramBotUrl,
                        UseShellExecute = true
                    });
                }

                // Информируем пользователя что команда будет отправлена
                MessageBox.Show(
                    $"✅ Telegram открывается.\n\n" +
                    $"После открытия вы можете:\n" +
                    $"1. Вручную ввести: {connectCommand}\n" +
                    $"2. Или скопировать код: {_deviceId}\n\n" +
                    $"Бот автоматически подтвердит подключение.",
                    "Подключение к ПК",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);

                // Сохраняем Device ID для дальнейшего мониторинга
                _lastSentDeviceId = _deviceId;
                _lastDeviceIdSendTime = DateTime.Now;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"❌ Ошибка открытия Telegram: {ex.Message}", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        /// <summary>
        /// Копирует Device ID в буфер обмена
        /// </summary>
        private void CopyDeviceIdToClipboard()
        {
            try
            {
                WinForms.Clipboard.SetText(_deviceId);
                MessageBox.Show($"Device ID скопирован: {_deviceId}", "Успешно", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Ошибка копирования: {ex.Message}", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
