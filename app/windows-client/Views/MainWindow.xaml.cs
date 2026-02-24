using System;
using System.Windows;
using PCRemoteControl.ViewModels;
using PCRemoteControl.Models;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Linq;
using System.Collections.Specialized;

namespace PCRemoteControl
{
    public partial class MainWindow : Window
    {
        private MainViewModel? _viewModel;

        public MainWindow()
        {
            InitializeComponent();
        }

        public void SetViewModel(MainViewModel viewModel)
        {
            _viewModel = viewModel;
            // Set device ID
            if (!string.IsNullOrEmpty(viewModel.DeviceId))
            {
                DeviceIdText.Text = viewModel.DeviceId;
            }
        }

        private void LogMessage(string message)
        {
            var timestamp = DateTime.Now.ToString("HH:mm:ss");
            LogListBox.Items.Insert(0, $"[{timestamp}] {message}");
            if (LogListBox.Items.Count > 100)
            {
                LogListBox.Items.RemoveAt(LogListBox.Items.Count - 1);
            }
        }

        // ==================== POWER & NETWORK TAB ====================

        private void Restart_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/C shutdown /r /t 30 /c \"PC Remote Control - Restart\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Перезагрузка инициирована (30 сек)";
                LogMessage("🔄 Перезагрузка инициирована");
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка перезагрузки: {ex.Message}");
            }
        }

        private void Sleep_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/C rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Система переходит в режим сна";
                LogMessage("😴 Система переходит в режим сна");
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка режима сна: {ex.Message}");
            }
        }

        private void Shutdown_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/C shutdown /s /t 30 /c \"PC Remote Control - Shutdown\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Выключение инициировано (30 сек)";
                LogMessage("🛑 Выключение инициировано (30 сек)");
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка выключения: {ex.Message}");
            }
        }

        private void ForceShutdown_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/C shutdown /p /f",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Принудительное выключение";
                LogMessage("💥 Принудительное выключение инициировано");
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка принудительного выключения: {ex.Message}");
            }
        }

        private void MonitorToggle_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "nircmd.exe",
                    Arguments = "monitor off",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Монитор выключен";
                LogMessage("📱 Монитор выключен");
            }
            catch
            {
                // nircmd не установлен, пробуем альтернативу
                try
                {
                    SendMessage(FindWindow("Shell_TrayWnd", IntPtr.Zero), 0x0112, (IntPtr)0xF170, (IntPtr)0x2);
                    PowerStatusText.Text = "✅ Команда отправлена";
                    LogMessage("📱 Команда управления монитором отправлена");
                }
                catch (Exception ex)
                {
                    PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                    LogMessage($"❌ Ошибка управления монитором: {ex.Message}");
                }
            }
        }

        private void Lock_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "rundll32.exe",
                    Arguments = "user32.dll,LockWorkStation",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                PowerStatusText.Text = "✅ Система заблокирована";
                LogMessage("🔒 Система заблокирована");
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка блокировки: {ex.Message}");
            }
        }

        private void SetShutdownTimer_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (int.TryParse(ShutdownTimerInput.Text, out int seconds))
                {
                    int minutes = seconds / 60;
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = $"/C shutdown /s /t {seconds} /c \"PC Remote Control - Автовыключение через {minutes} мин\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    });
                    PowerStatusText.Text = $"✅ Таймер установлен: {minutes} мин {seconds % 60} сек";
                    LogMessage($"⏱️ Таймер выключения установлен на {minutes} мин {seconds % 60} сек");
                }
            }
            catch (Exception ex)
            {
                PowerStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка таймера: {ex.Message}");
            }
        }

        // ==================== MONITORING & SCREEN TAB ====================

        private void RefreshSystemStatus_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                cpuCounter.NextValue(); // first call always returns 0
                System.Threading.Thread.Sleep(100);
                float cpu = cpuCounter.NextValue();

                var ramCounter = new PerformanceCounter("Memory", "% Committed Bytes In Use");
                float ram = ramCounter.NextValue();

                SystemStatsText.Text = $"CPU: {cpu:F1}%\nRAM: {ram:F1}%\nОбновлено: {DateTime.Now:HH:mm:ss}";
                MonitoringStatusText.Text = "✅ Статус обновлен";
                LogMessage($"📈 Статус системы обновлен (CPU: {cpu:F1}%, RAM: {ram:F1}%)");
            }
            catch (Exception ex)
            {
                SystemStatsText.Text = $"❌ Ошибка получения статуса: {ex.Message}";
                MonitoringStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка статуса: {ex.Message}");
            }
        }

        private void TakeScreenshot_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var screenshot = new Bitmap(Screen.PrimaryScreen.Bounds.Width, Screen.PrimaryScreen.Bounds.Height);
                var graphics = Graphics.FromImage(screenshot);
                graphics.CopyFromScreen(0, 0, 0, 0, Screen.PrimaryScreen.Bounds.Size);
                
                string fileName = Path.Combine(Path.GetTempPath(), $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png");
                screenshot.Save(fileName);
                
                MonitoringStatusText.Text = $"✅ Скриншот сохранен: {fileName}";
                LogMessage($"📸 Скриншот сохранен: {fileName}");
            }
            catch (Exception ex)
            {
                MonitoringStatusText.Text = $"❌ Ошибка скриншота: {ex.Message}";
                LogMessage($"❌ Ошибка скриншота: {ex.Message}");
            }
        }

        private void WebcamCapture_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MonitoringStatusText.Text = "⚠️ Веб-камера: функция требует дополнительной библиотеки (AForge.Video)";
                LogMessage("🎥 Веб-камера: требуется установка AForge.Video пакета");
            }
            catch (Exception ex)
            {
                MonitoringStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка веб-камеры: {ex.Message}");
            }
        }

        private void ShowProcessList_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var processes = Process.GetProcesses();
                SystemStatsText.Text = $"Процессы на компьютере ({processes.Length}):\n";
                foreach (var p in processes.Take(20))
                {
                    SystemStatsText.Text += $"{p.ProcessName} (PID: {p.Id})\n";
                }
                SystemStatsText.Text += $"... и еще {Math.Max(0, processes.Length - 20)} процессов";
                MonitoringStatusText.Text = "✅ Список процессов получен";
                LogMessage($"📋 Получен список процессов ({processes.Length} всего)");
            }
            catch (Exception ex)
            {
                MonitoringStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка списка процессов: {ex.Message}");
            }
        }

        private void KillProcess_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string processName = ProcessNameInput.Text.Trim();
                if (string.IsNullOrEmpty(processName))
                {
                    MonitoringStatusText.Text = "❌ Укажите имя процесса";
                    return;
                }

                // Remove .exe if present
                if (processName.EndsWith(".exe"))
                    processName = processName.Substring(0, processName.Length - 4);

                var processes = Process.GetProcessesByName(processName);
                if (processes.Length == 0)
                {
                    MonitoringStatusText.Text = $"❌ Процесс '{processName}' не найден";
                    LogMessage($"❌ Процесс '{processName}' не найден");
                    return;
                }

                foreach (var p in processes)
                {
                    p.Kill();
                }

                MonitoringStatusText.Text = $"✅ Процесс '{processName}' завершен ({processes.Length} шт)";
                LogMessage($"❌ Процесс '{processName}' завершен ({processes.Length} процессов)");
            }
            catch (Exception ex)
            {
                MonitoringStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка завершения процесса: {ex.Message}");
            }
        }

        // ==================== FILES & APPLICATIONS TAB ====================

        private void Launcher_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new Microsoft.Win32.OpenFileDialog
                {
                    Filter = "Executable files (*.exe)|*.exe|All files (*.*)|*.*"
                };

                if (dialog.ShowDialog() == true)
                {
                    Process.Start(dialog.FileName);
                    FilesStatusText.Text = $"✅ Запущено: {Path.GetFileName(dialog.FileName)}";
                    LogMessage($"🚀 Запущено: {Path.GetFileName(dialog.FileName)}");
                }
            }
            catch (Exception ex)
            {
                FilesStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка запуска: {ex.Message}");
            }
        }

        private void SearchFiles_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Простой поиск в папке Documents
                string docsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                var files = Directory.GetFiles(docsPath, "*.*", SearchOption.TopDirectoryOnly).Take(20);
                
                SystemStatsText.Text = $"Файлы в {docsPath}:\n";
                foreach (var f in files)
                {
                    var info = new FileInfo(f);
                    SystemStatsText.Text += $"{Path.GetFileName(f)} ({info.Length / 1024} KB)\n";
                }
                FilesStatusText.Text = "✅ Поиск завершен";
                LogMessage($"🔍 Найдено файлов: {files.Count()}");
            }
            catch (Exception ex)
            {
                FilesStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка поиска: {ex.Message}");
            }
        }

        private void Download_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new SaveFileDialog();
                if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    FilesStatusText.Text = $"📥 Загрузка: {Path.GetFileName(dialog.FileName)}";
                    LogMessage($"📥 Готово к загрузке: {Path.GetFileName(dialog.FileName)}");
                }
            }
            catch (Exception ex)
            {
                FilesStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка загрузки: {ex.Message}");
            }
        }

        private void Upload_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new OpenFileDialog();
                if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    var info = new FileInfo(dialog.FileName);
                    if (info.Length > 50 * 1024 * 1024) // 50MB limit
                    {
                        FilesStatusText.Text = "❌ Файл больше 50MB";
                        LogMessage("❌ Файл превышает лимит 50MB");
                        return;
                    }
                    FilesStatusText.Text = $"📤 Загрузка: {Path.GetFileName(dialog.FileName)} ({info.Length / 1024 / 1024} MB)";
                    LogMessage($"📤 Готово к загрузке: {Path.GetFileName(dialog.FileName)}");
                }
            }
            catch (Exception ex)
            {
                FilesStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка загрузки: {ex.Message}");
            }
        }

        private void AddApp_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Filter = "Executable files (*.exe)|*.exe|All files (*.*)|*.*"
            };

            if (dialog.ShowDialog() == true)
            {
                ApplicationsGrid.Items.Add(System.IO.Path.GetFileNameWithoutExtension(dialog.FileName));
                LogMessage($"➕ Приложение добавлено: {Path.GetFileNameWithoutExtension(dialog.FileName)}");
            }
        }

        private void RemoveApp_Click(object sender, RoutedEventArgs e)
        {
            if (ApplicationsGrid.SelectedItem != null)
            {
                ApplicationsGrid.Items.Remove(ApplicationsGrid.SelectedItem);
                LogMessage($"❌ Приложение удалено");
            }
        }

        // ==================== INPUT & CONTROL TAB ====================

        private void CopyClipboard_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var text = System.Windows.Clipboard.GetText();
                ClipboardText.Text = text;
                InputControlStatusText.Text = "✅ Буфер обмена скопирован";
                LogMessage("📋 Буфер обмена скопирован");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка копирования: {ex.Message}");
            }
        }

        private void PasteClipboard_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                System.Windows.Clipboard.SetText(ClipboardText.Text);
                InputControlStatusText.Text = "✅ Текст вставлен в буфер обмена";
                LogMessage("📋 Текст вставлен в буфер обмена");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка вставки: {ex.Message}");
            }
        }

        private void VolumeControl_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                InputControlStatusText.Text = "⚠️ Управление громкостью требует CoreAudio API";
                LogMessage("🔊 Управление громкостью: требуется CoreAudio");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка громкости: {ex.Message}");
            }
        }

        private void ExecuteCmd_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start("cmd.exe");
                InputControlStatusText.Text = "✅ CMD открыт";
                LogMessage("⌨️ Командная строка открыта");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка CMD: {ex.Message}");
            }
        }

        private void BlockInput_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                InputControlStatusText.Text = "⚠️ Блокировка ввода требует дополнительных прав";
                LogMessage("🚫 Блокировка ввода: требуются права администратора");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка блокировки: {ex.Message}");
            }
        }

        private void RunCmd_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string command = CmdInput.Text.Trim();
                if (string.IsNullOrEmpty(command))
                {
                    InputControlStatusText.Text = "❌ Укажите команду";
                    return;
                }

                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = $"/C {command}",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit(5000); // 5 second timeout

                SystemStatsText.Text = $"Результат команды '{command}':\n{output}";
                InputControlStatusText.Text = "✅ Команда выполнена";
                LogMessage($"✅ Команда выполнена: {command}");
            }
            catch (Exception ex)
            {
                InputControlStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка команды: {ex.Message}");
            }
        }

        // ==================== SETTINGS TAB ====================

        private void Autostart_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Проверяем реестр
                var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
                bool isAutostart = key?.GetValue("PCRemoteControl") != null;
                AutostartCheckbox.IsChecked = isAutostart;
                SettingsStatusText.Text = $"Автозагрузка: {(isAutostart ? "✅ Включена" : "❌ Отключена")}";
                LogMessage($"🚀 Статус автозагрузки: {(isAutostart ? "Включена" : "Отключена")}");
            }
            catch (Exception ex)
            {
                SettingsStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка автозагрузки: {ex.Message}");
            }
        }

        private void SaveAutostart_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
                if (key == null)
                {
                    key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
                }

                if (AutostartCheckbox.IsChecked == true)
                {
                    string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                    key.SetValue("PCRemoteControl", exePath);
                    SettingsStatusText.Text = "✅ Автозагрузка включена";
                    LogMessage("✅ Автозагрузка включена в реестр");
                }
                else
                {
                    key.DeleteValue("PCRemoteControl", false);
                    SettingsStatusText.Text = "✅ Автозагрузка отключена";
                    LogMessage("✅ Автозагрузка отключена из реестра");
                }
                key.Close();
            }
            catch (Exception ex)
            {
                SettingsStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка сохранения: {ex.Message}");
            }
        }

        private void Notifications_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                SettingsStatusText.Text = "⚠️ Уведомления требуют WinRT API";
                LogMessage("🔔 Уведомления: требуется WinRT");
            }
            catch (Exception ex)
            {
                SettingsStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка уведомлений: {ex.Message}");
            }
        }

        private void TestNotification_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                System.Windows.MessageBox.Show("✅ Это тестовое уведомление", "PC Remote Control", MessageBoxButton.OK, MessageBoxImage.Information);
                SettingsStatusText.Text = "✅ Тестовое уведомление отправлено";
                LogMessage("🔔 Тестовое уведомление отправлено");
            }
            catch (Exception ex)
            {
                SettingsStatusText.Text = $"❌ Ошибка: {ex.Message}";
                LogMessage($"❌ Ошибка теста: {ex.Message}");
            }
        }

        private void About_Click(object sender, RoutedEventArgs e)
        {
            System.Windows.MessageBox.Show(
                "PC Remote Control v1.0\n\n" +
                "Полнофункциональное приложение для удаленного управления ПК.\n\n" +
                "Функции:\n" +
                "• Управление питанием (перезагрузка, сон, выключение)\n" +
                "• Мониторинг системы (CPU, RAM, процессы)\n" +
                "• Управление файлами и приложениями\n" +
                "• Управление вводом (буфер обмена, CMD)\n" +
                "• Настройки системы и уведомления\n\n" +
                "© 2026 PC Remote Control",
                "О программе",
                MessageBoxButton.OK,
                MessageBoxImage.Information
            );
            LogMessage("ℹ️ О программе - показана справка");
        }

        private void ClearLog_Click(object sender, RoutedEventArgs e)
        {
            LogListBox.Items.Clear();
            LogMessage("🗑️ Лог очищен");
        }

        protected override void OnClosed(EventArgs e)
        {
            _viewModel?.StopPolling();
            base.OnClosed(e);
        }

        // P/Invoke for monitor control
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern IntPtr FindWindow(string lpClassName, IntPtr lpWindowName);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern int SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    }
}

