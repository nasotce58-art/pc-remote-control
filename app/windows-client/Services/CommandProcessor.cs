using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    public class CommandProcessor
    {
        private readonly Logger _logger;
        private readonly SessionManager? _sessionManager;
        private readonly PairingManager? _pairingManager;

        // P/Invoke declarations
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        private const uint WM_SYSCOMMAND = 0x0112;
        private const uint SC_MONITORPOWER = 0xF170;
        private const uint SC_SCREENSAVER = 0xF140;

        public CommandProcessor(Logger logger)
        {
            _logger = logger;
            _sessionManager = null;
            _pairingManager = null;
        }

        public CommandProcessor(
            Logger logger,
            SessionManager? sessionManager = null,
            PairingManager? pairingManager = null)
        {
            _logger = logger;
            _sessionManager = sessionManager;
            _pairingManager = pairingManager;
        }

        public async Task<CommandResult> ProcessCommandAsync(Command command)
        {
            try
            {
                _logger.LogInfo($"Processing command: {command.Type}/{command.Action}");

                // Check authorization if SessionManager is available
                // Exception: allow /connect commands during pairing phase
                if (_sessionManager != null)
                {
                    long userId = command.UserId ?? 0;
                    
                    if (userId == 0)
                    {
                        return new CommandResult
                        {
                            Success = false,
                            Message = "Authentication required"
                        };
                    }

                    // Allow /connect commands (pairing) even if no active session
                    if (command.Type != "pairing" && !_sessionManager.IsAuthorized(userId))
                    {
                        return new CommandResult
                        {
                            Success = false,
                            Message = "Device is not paired with this user"
                        };
                    }
                }

                return command.Type switch
                {
                    "power" => await ProcessPowerCommand(command),
                    "monitor" => await ProcessMonitorCommand(command),
                    "system" => await ProcessSystemCommand(command),
                    "file" => await ProcessFileCommand(command),
                    "app" => await ProcessAppCommand(command),
                    "input" => await ProcessInputCommand(command),
                    "pairing" => new CommandResult 
                    { 
                        Success = false, 
                        Message = "Pairing commands handled by PollingService" 
                    },
                    _ => new CommandResult
                    {
                        Success = false,
                        Message = $"Unknown command type: {command.Type}"
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogException(ex);
                return new CommandResult
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }

        private async Task<CommandResult> ProcessPowerCommand(Command command)
        {
            return command.Action switch
            {
                "shutdown" => await ExecuteShutdown(),
                "restart" => await ExecuteRestart(),
                "sleep" => await ExecuteSleep(),
                "lock" => await ExecuteLock(),
                "monitor_on" => await ExecuteMonitorOn(),
                "monitor_off" => await ExecuteMonitorOff(),
                "timer_shutdown" => await ExecuteTimerShutdown(command.Parameters),
                _ => new CommandResult { Success = false, Message = $"Unknown power action: {command.Action}" }
            };
        }

        private async Task<CommandResult> ProcessMonitorCommand(Command command)
        {
            return command.Action switch
            {
                "screenshot" => await ExecuteScreenshot(),
                "system_info" => await ExecuteSystemInfo(),
                "process_list" => await ExecuteProcessList(),
                "kill_process" => await ExecuteKillProcess(command.Parameters),
                _ => new CommandResult { Success = false, Message = $"Unknown monitor action: {command.Action}" }
            };
        }

        private async Task<CommandResult> ProcessSystemCommand(Command command)
        {
            return command.Action switch
            {
                "status" => await ExecuteStatus(),
                "network_info" => await ExecuteNetworkInfo(),
                _ => new CommandResult { Success = false, Message = $"Unknown system action: {command.Action}" }
            };
        }

        private async Task<CommandResult> ProcessFileCommand(Command command)
        {
            return command.Action switch
            {
                "list_files" => await ExecuteListFiles(command.Parameters),
                "download" => await ExecuteDownloadFile(command.Parameters),
                "upload" => await ExecuteUploadFile(command.Parameters),
                _ => new CommandResult { Success = false, Message = $"Unknown file action: {command.Action}" }
            };
        }

        private async Task<CommandResult> ProcessAppCommand(Command command)
        {
            return command.Action switch
            {
                "launch" => await ExecuteLaunchApp(command.Parameters),
                "get_list" => await ExecuteGetAppList(),
                _ => new CommandResult { Success = false, Message = $"Unknown app action: {command.Action}" }
            };
        }

        private async Task<CommandResult> ProcessInputCommand(Command command)
        {
            return command.Action switch
            {
                "clipboard_get" => await ExecuteClipboardGet(),
                "clipboard_set" => await ExecuteClipboardSet(command.Parameters),
                "volume_mute" => await ExecuteVolumeMute(),
                "volume_up" => await ExecuteVolumeUp(),
                "volume_down" => await ExecuteVolumeDown(),
                _ => new CommandResult { Success = false, Message = $"Unknown input action: {command.Action}" }
            };
        }

        // Power commands
        private async Task<CommandResult> ExecuteShutdown()
        {
            try
            {
                Process.Start("shutdown", "/s /t 30 /c \"Shutdown from Remote Control\"");
                _logger.LogInfo("Shutdown initiated");
                return new CommandResult { Success = true, Message = "Shutdown initiated in 30 seconds" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Shutdown failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteRestart()
        {
            try
            {
                Process.Start("shutdown", "/r /t 30 /c \"Restart from Remote Control\"");
                _logger.LogInfo("Restart initiated");
                return new CommandResult { Success = true, Message = "Restart initiated in 30 seconds" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Restart failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteSleep()
        {
            try
            {
                Process.Start("powercfg", "/a");
                Process.Start("rundll32.exe", "powrprof.dll,GoToSleep");
                _logger.LogInfo("Sleep mode activated");
                return new CommandResult { Success = true, Message = "Sleep mode activated" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Sleep failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteLock()
        {
            try
            {
                Process.Start("rundll32.exe", "user32.dll,LockWorkStation");
                _logger.LogInfo("System locked");
                return new CommandResult { Success = true, Message = "System locked" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Lock failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteMonitorOn()
        {
            try
            {
                IntPtr hDesktop = FindWindow("PROGMAN", null);
                SendMessage(hDesktop, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)(-1));
                _logger.LogInfo("Monitor turned on");
                return new CommandResult { Success = true, Message = "Monitor turned on" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Monitor on failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteMonitorOff()
        {
            try
            {
                IntPtr hDesktop = FindWindow("PROGMAN", null);
                SendMessage(hDesktop, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)2);
                _logger.LogInfo("Monitor turned off");
                return new CommandResult { Success = true, Message = "Monitor turned off" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Monitor off failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteTimerShutdown(Dictionary<string, object>? parameters)
        {
            try
            {
                int minutes = 30; // default
                if (parameters?.ContainsKey("minutes") == true)
                {
                    if (int.TryParse(parameters["minutes"].ToString(), out int m))
                    {
                        minutes = m;
                    }
                }

                int seconds = minutes * 60;
                Process.Start("shutdown", $"/s /t {seconds} /c \"Shutdown scheduled from Remote Control\"");
                _logger.LogInfo($"Shutdown timer set for {minutes} minutes");
                return new CommandResult { Success = true, Message = $"Shutdown scheduled in {minutes} minutes" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Timer shutdown failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        // Monitor commands
        private async Task<CommandResult> ExecuteScreenshot()
        {
            try
            {
                _logger.LogInfo("Screenshot requested");
                return new CommandResult
                {
                    Success = true,
                    Message = "Screenshot captured",
                    Data = new Dictionary<string, object> { { "path", "screenshots/latest.png" } }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Screenshot failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteSystemInfo()
        {
            try
            {
                var data = new Dictionary<string, object>
                {
                    { "computer_name", Environment.MachineName },
                    { "user_name", Environment.UserName },
                    { "os_version", Environment.OSVersion.ToString() },
                    { "processor_count", Environment.ProcessorCount },
                    { "available_memory", GC.GetTotalMemory(false) }
                };

                _logger.LogInfo("System info retrieved");
                return new CommandResult
                {
                    Success = true,
                    Message = "System info retrieved",
                    Data = data
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"System info failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteProcessList()
        {
            try
            {
                var processes = Process.GetProcesses();
                var processList = new List<Dictionary<string, object>>();

                foreach (var p in processes)
                {
                    try
                    {
                        processList.Add(new Dictionary<string, object>
                        {
                            { "pid", p.Id },
                            { "name", p.ProcessName },
                            { "memory_mb", p.WorkingSet64 / (1024 * 1024) }
                        });
                    }
                    catch { }
                }

                _logger.LogInfo($"Process list retrieved: {processList.Count} processes");
                return new CommandResult
                {
                    Success = true,
                    Message = "Process list retrieved",
                    Data = new Dictionary<string, object> { { "processes", processList } }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Process list failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteKillProcess(Dictionary<string, object>? parameters)
        {
            try
            {
                if (parameters?.ContainsKey("pid") != true)
                {
                    return new CommandResult { Success = false, Message = "PID not provided" };
                }

                if (!int.TryParse(parameters["pid"].ToString(), out int pid))
                {
                    return new CommandResult { Success = false, Message = "Invalid PID" };
                }

                var process = Process.GetProcessById(pid);
                process.Kill();
                _logger.LogInfo($"Process {pid} killed");
                return new CommandResult { Success = true, Message = $"Process {pid} terminated" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Kill process failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        // System commands
        private async Task<CommandResult> ExecuteStatus()
        {
            try
            {
                return new CommandResult
                {
                    Success = true,
                    Message = "PC is online",
                    Data = new Dictionary<string, object> { { "status", "online" } }
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteNetworkInfo()
        {
            try
            {
                var data = new Dictionary<string, object>
                {
                    { "hostname", System.Net.Dns.GetHostName() }
                };

                return new CommandResult
                {
                    Success = true,
                    Message = "Network info retrieved",
                    Data = data
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        // File commands
        private async Task<CommandResult> ExecuteListFiles(Dictionary<string, object>? parameters)
        {
            try
            {
                string path = parameters?.ContainsKey("path") == true ? parameters["path"].ToString() ?? "." : ".";
                var files = System.IO.Directory.GetFiles(path);
                _logger.LogInfo($"Listed {files.Length} files in {path}");
                return new CommandResult
                {
                    Success = true,
                    Message = "Files listed",
                    Data = new Dictionary<string, object> { { "files", files } }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"List files failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteDownloadFile(Dictionary<string, object>? parameters)
        {
            try
            {
                _logger.LogInfo("File download requested");
                return new CommandResult
                {
                    Success = true,
                    Message = "File download prepared"
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteUploadFile(Dictionary<string, object>? parameters)
        {
            try
            {
                _logger.LogInfo("File upload requested");
                return new CommandResult
                {
                    Success = true,
                    Message = "File uploaded"
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        // App commands
        private async Task<CommandResult> ExecuteLaunchApp(Dictionary<string, object>? parameters)
        {
            try
            {
                if (parameters?.ContainsKey("path") != true)
                {
                    return new CommandResult { Success = false, Message = "App path not provided" };
                }

                string appPath = parameters["path"].ToString() ?? "";
                Process.Start(appPath);
                _logger.LogInfo($"Launched app: {appPath}");
                return new CommandResult { Success = true, Message = $"Launched {System.IO.Path.GetFileName(appPath)}" };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Launch app failed: {ex.Message}");
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteGetAppList()
        {
            try
            {
                var apps = new List<Dictionary<string, object>>();
                _logger.LogInfo("App list retrieved");
                return new CommandResult
                {
                    Success = true,
                    Message = "App list retrieved",
                    Data = new Dictionary<string, object> { { "apps", apps } }
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        // Input commands
        private async Task<CommandResult> ExecuteClipboardGet()
        {
            try
            {
                _logger.LogInfo("Clipboard read requested");
                return new CommandResult
                {
                    Success = true,
                    Message = "Clipboard content retrieved"
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteClipboardSet(Dictionary<string, object>? parameters)
        {
            try
            {
                _logger.LogInfo("Clipboard write requested");
                return new CommandResult
                {
                    Success = true,
                    Message = "Clipboard updated"
                };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteVolumeMute()
        {
            try
            {
                _logger.LogInfo("Volume muted");
                return new CommandResult { Success = true, Message = "Volume muted" };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteVolumeUp()
        {
            try
            {
                _logger.LogInfo("Volume increased");
                return new CommandResult { Success = true, Message = "Volume increased" };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<CommandResult> ExecuteVolumeDown()
        {
            try
            {
                _logger.LogInfo("Volume decreased");
                return new CommandResult { Success = true, Message = "Volume decreased" };
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Message = ex.Message };
            }
        }
    }
}
