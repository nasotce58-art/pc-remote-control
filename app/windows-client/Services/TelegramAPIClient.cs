using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Management;
using Newtonsoft.Json;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    /// <summary>
    /// Клиент для взаимодействия с Telegram Bot API
    /// Позволяет приложению регистрироваться и получать обновления от Telegram
    /// Поддерживает команды: /bind, /unbind, /connect, /status, /sessions, /help
    /// Логирует все события подключения/отключения пользователей
    /// </summary>
    public class TelegramAPIClient
    {
        private readonly string _botToken;
        private readonly string _deviceId;
        private readonly Logger _logger;
        private readonly HttpClient _httpClient;
        private long _lastUpdateId = 0;
        
        // ✅ ДОБАВЛЕНО: Управление сессиями пользователей
        private Dictionary<long, UserSession> _userSessions = new Dictionary<long, UserSession>();
        private const int SessionTimeoutMinutes = 30;

        public event EventHandler<TelegramUpdate> UpdateReceived;

        public TelegramAPIClient(string botToken, string deviceId, Logger logger)
        {
            _botToken = botToken;
            _deviceId = deviceId;
            _logger = logger;
            _httpClient = new HttpClient();
        }

        /// <summary>
        /// Регистрирует Device ID в Telegram
        /// </summary>
        public async Task RegisterDeviceAsync()
        {
            try
            {
                var request = new
                {
                    type = "REGISTER_DEVICE",
                    device_id = _deviceId,
                    device_name = "Windows PC",
                    timestamp = DateTime.UtcNow
                };

                _logger.LogInfo($"📱 Registering device with ID: {_deviceId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Failed to register device: {ex.Message}");
            }
        }

        /// <summary>
        /// Получает обновления от Telegram API (getUpdates)
        /// </summary>
        public async Task<List<TelegramUpdate>> GetUpdatesAsync()
        {
            try
            {
                string url = $"https://api.telegram.org/bot{_botToken}/getUpdates?offset={_lastUpdateId + 1}";
                
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"❌ Telegram API error: {response.StatusCode}");
                    return new List<TelegramUpdate>();
                }

                string content = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<TelegramApiResponse>(content);

                if (result?.Ok == true && result.Result != null)
                {
                    var updates = new List<TelegramUpdate>();
                    foreach (var update in result.Result)
                    {
                        _lastUpdateId = update.UpdateId;
                        
                        if (update.Message?.Text != null)
                        {
                            string messageText = update.Message.Text;
                            long userId = update.Message.From.Id;
                            string username = update.Message.From.Username;

                            // Обработка команд
                            if (messageText.StartsWith("/unbind"))
                            {
                                _logger.LogInfo($"📨 Received /unbind command from {username}");
                                await HandleUnbindCommandAsync(userId, messageText);
                                continue;
                            }

                            if (messageText.StartsWith("/bind"))
                            {
                                _logger.LogInfo($"📨 Received /bind command from {username}");
                                await HandleBindCommandAsync(userId, messageText);
                                continue;
                            }

                            if (messageText.StartsWith("/status"))
                            {
                                _logger.LogInfo($"📨 Received /status command from {username}");
                                await HandleStatusCommandAsync(userId, messageText);
                                continue;
                            }

                            if (messageText.StartsWith("/connect"))
                            {
                                _logger.LogInfo($"📨 Received /connect command from {username}");
                                await HandleConnectCommandAsync(userId, messageText);
                                continue;
                            }

                            // Обработка сообщений с Device ID
                            if (messageText.Contains(_deviceId))
                            {
                                var telegramUpdate = new TelegramUpdate
                                {
                                    UpdateId = update.UpdateId,
                                    UserId = userId,
                                    Username = username,
                                    Text = messageText,
                                    DeviceId = _deviceId
                                };

                                updates.Add(telegramUpdate);
                                _logger.LogInfo($"📨 Received update from {username}: {messageText}");
                            }
                        }
                    }

                    if (updates.Count > 0)
                    {
                        UpdateReceived?.Invoke(this, updates[0]);
                    }

                    return updates;
                }

                return new List<TelegramUpdate>();
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error getting updates from Telegram: {ex.Message}");
                return new List<TelegramUpdate>();
            }
        }

        /// <summary>
        /// Обрабатывает команду /unbind для отвязки ПК
        /// </summary>
        private async Task HandleUnbindCommandAsync(long userId, string commandText)
        {
            try
            {
                _logger.LogInfo($"🔓 Processing unbind request for user {userId}");
                
                // ✅ ДОБАВЛЕНО: Отправляем уведомление об отключении
                await NotifyPCDisconnectionAsync(userId, "unbind");
                
                // Удаляем сессию пользователя
                DisconnectUser(userId);
                
                // Отправляем успешный ответ
                string successMessage = "✅ ПК успешно отвязан!\n\n" +
                    "🔌 **СТАТУС: ОТКЛЮЧЕНО**\n\n" +
                    "Теперь вы можете привязать новый ПК, отправив мне Device ID.\n\n" +
                    "Например: /bind XXXX-XXXX";
                    
                await SendMessageAsync(userId, successMessage);
                _logger.LogInfo($"✅ Unbind processed successfully for user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error processing unbind command: {ex.Message}");
                try
                {
                    await SendMessageAsync(userId, 
                        "❌ Ошибка при отвязке ПК\n\n" +
                        "Пожалуйста, попробуйте позже.");
                }
                catch (Exception sendEx)
                {
                    _logger.LogError($"❌ Failed to send error message: {sendEx.Message}");
                }
            }
        }

        /// <summary>
        /// Обрабатывает команду /bind для привязки нового ПК
        /// </summary>
        private async Task HandleBindCommandAsync(long userId, string commandText)
        {
            try
            {
                _logger.LogInfo($"🔗 Processing bind request for user {userId}");
                
                // Извлекаем Device ID из команды (формат: /bind XXXX-XXXX)
                string[] parts = commandText.Split(' ');
                if (parts.Length < 2)
                {
                    await SendMessageAsync(userId,
                        "❌ Неверный формат команды\n\n" +
                        "Используйте: /bind XXXX-XXXX\n" +
                        "Например: /bind AB12-CD34");
                    return;
                }

                string deviceId = parts[1];
                
                // Проверяем формат Device ID (XXXX-XXXX)
                if (!System.Text.RegularExpressions.Regex.IsMatch(deviceId, @"^[A-Z0-9]{4}-[A-Z0-9]{4}$"))
                {
                    await SendMessageAsync(userId,
                        "❌ Неверный формат Device ID\n\n" +
                        "Device ID должен быть в формате: XXXX-XXXX\n" +
                        "Например: AB12-CD34");
                    return;
                }

                // ✅ ДОБАВЛЕНО: Регистрируем сессию пользователя
                RegisterUserSession(userId, $"User_{userId}");
                
                // ✅ ДОБАВЛЕНО: Отправляем уведомление о подключении
                await NotifyPCConnectionAsync(userId, deviceId, "bind");

                string successMessage = $"✅ ПК с ID {deviceId} успешно привязан!\n\n" +
                    "🔗 **СТАТУС: ПОДКЛЮЧЕНО**\n\n" +
                    "Вы можете начать управлять этим ПК через команды бота:\n" +
                    "• /status - Проверить статус системы\n" +
                    "• /connect {ID} - Подключиться к ПК\n" +
                    "• /unbind - Отвязать ПК";
                    
                await SendMessageAsync(userId, successMessage);
                _logger.LogInfo($"✅ Device {deviceId} bound for user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error processing bind command: {ex.Message}");
                try
                {
                    await SendMessageAsync(userId,
                        "❌ Ошибка при привязке ПК\n\n" +
                        "Пожалуйста, попробуйте позже.");
                }
                catch (Exception sendEx)
                {
                    _logger.LogError($"❌ Failed to send error message: {sendEx.Message}");
                }
            }
        }

        /// <summary>
        /// Получает реальные системные метрики
        /// </summary>
        private string GetSystemStatus()
        {
            try
            {
                float cpuUsage = 0;
                float ramUsagePercent = 0;
                long totalMemory = 0;
                float usedRam = 0;
                float availableRam = 0;

                // CPU usage - с повторной попыткой
                try
                {
                    var cpuCounter = new System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total", true);
                    cpuCounter.NextValue(); // Первый вызов подготавливает
                    System.Threading.Thread.Sleep(150);
                    cpuUsage = cpuCounter.NextValue();
                    if (cpuUsage > 100) cpuUsage = 100;
                    if (cpuUsage < 0) cpuUsage = 0;
                }
                catch
                {
                    cpuUsage = 0;
                }

                // RAM usage - полностью переделано
                try
                {
                    // Используем более надежный способ получения памяти
                    var ramCounterAvail = new System.Diagnostics.PerformanceCounter("Memory", "Available MBytes", null, true);
                    availableRam = ramCounterAvail.NextValue();

                    // Получаем полную память через WMI
                    System.Management.ManagementClass memClass = new System.Management.ManagementClass("Win32_ComputerSystem");
                    System.Management.ManagementObject memObject = memClass.GetInstances().Cast<System.Management.ManagementObject>().First();
                    totalMemory = Convert.ToInt64(memObject["TotalPhysicalMemory"]) / 1024 / 1024;

                    usedRam = totalMemory - availableRam;
                    if (usedRam < 0) usedRam = 0;
                    ramUsagePercent = (usedRam / totalMemory) * 100;
                    if (ramUsagePercent > 100) ramUsagePercent = 100;
                }
                catch
                {
                    // Fallback: если WMI не работает, используем базовую информацию
                    try
                    {
                        var ramCounterAvail = new System.Diagnostics.PerformanceCounter("Memory", "Available MBytes", null, true);
                        float availRam = ramCounterAvail.NextValue();
                        totalMemory = (long)(availRam / 0.3); // примерная оценка
                        usedRam = totalMemory - availRam;
                        ramUsagePercent = (usedRam / totalMemory) * 100;
                    }
                    catch
                    {
                        ramUsagePercent = 0;
                    }
                }

                // Сетевое соединение
                bool hasInternet = System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable();
                string networkStatus = hasInternet ? "✅ Подключено" : "❌ Отключено";

                // Форматируем сообщение с реальными данными
                string statusMessage = $"💻 Статус ПК: {_deviceId}\n\n" +
                    $"🟢 Система: Online\n" +
                    $"⏰ Время: {System.DateTime.Now:dd.MM.yyyy HH:mm:ss}\n\n" +
                    $"📊 Ресурсы:\n" +
                    $"• CPU: {cpuUsage:F1}%\n";

                if (totalMemory > 0)
                {
                    statusMessage += $"• RAM: {ramUsagePercent:F1}% ({usedRam:F0}MB/{totalMemory:F0}MB)\n";
                }
                else
                {
                    statusMessage += $"• RAM: {ramUsagePercent:F1}%\n";
                }

                statusMessage += $"• Сеть: {networkStatus}\n\n" +
                    $"🖥️ Компьютер: {System.Environment.MachineName}\n" +
                    $"👤 Пользователь: {System.Environment.UserName}";

                return statusMessage;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"⚠️ Could not get real system metrics: {ex.Message}");
                return $"💻 Статус ПК: {_deviceId}\n\n" +
                    $"🟢 Система: Online\n" +
                    $"⏰ Время: {System.DateTime.Now:dd.MM.yyyy HH:mm:ss}\n\n" +
                    $"📊 Ресурсы: Базовая информация\n" +
                    $"🖥️ Компьютер: {System.Environment.MachineName}\n" +
                    $"👤 Пользователь: {System.Environment.UserName}";
            }
        }

        /// <summary>
        /// Обрабатывает команду /status для проверки статуса ПК
        /// </summary>
        private async Task HandleStatusCommandAsync(long userId, string commandText)
        {
            try
            {
                _logger.LogInfo($"📊 Processing status request for user {userId}");
                
                string statusMessage = GetSystemStatus();
                    
                await SendMessageAsync(userId, statusMessage);
                _logger.LogInfo($"✅ Status sent to user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error processing status command: {ex.Message}");
                try
                {
                    await SendMessageAsync(userId,
                        "❌ Ошибка при получении статуса\n\n" +
                        "Пожалуйста, попробуйте позже.");
                }
                catch (Exception sendEx)
                {
                    _logger.LogError($"❌ Failed to send error message: {sendEx.Message}");
                }
            }
        }

        /// <summary>
        /// Обрабатывает команду /connect для подключения ПК
        /// </summary>
        private async Task HandleConnectCommandAsync(long userId, string commandText)
        {
            try
            {
                _logger.LogInfo($"🔌 Processing connect request for user {userId}");
                
                // Извлекаем Device ID из команды (формат: /connect XXXX-XXXX)
                string[] parts = commandText.Split(new[] { ' ' }, System.StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2)
                {
                    await SendMessageAsync(userId,
                        "❌ Неверный формат команды\n\n" +
                        "Используйте: /connect XXXX-XXXX\n" +
                        "Например: /connect AB12-CD34");
                    return;
                }

                string deviceId = parts[1].Trim().ToUpper();
                
                // Проверяем формат Device ID (XXXX-XXXX)
                if (!System.Text.RegularExpressions.Regex.IsMatch(deviceId, @"^[A-Z0-9]{4}-[A-Z0-9]{4}$"))
                {
                    await SendMessageAsync(userId,
                        "❌ Неверный формат Device ID\n\n" +
                        "Device ID должен быть в формате: XXXX-XXXX\n" +
                        "Например: AB12-CD34");
                    return;
                }

                // Проверяем, совпадает ли Device ID с текущим ПК
                string normalizedCurrentDeviceId = _deviceId.ToUpper();
                if (!deviceId.Equals(normalizedCurrentDeviceId, System.StringComparison.OrdinalIgnoreCase))
                {
                    await SendMessageAsync(userId,
                        $"❌ Device ID не совпадает\n\n" +
                        $"Ваш Device ID: {normalizedCurrentDeviceId}\n" +
                        $"Введённый Device ID: {deviceId}\n\n" +
                        $"Проверьте правильность введённого кода.");
                    _logger.LogWarning($"⚠️ User {userId} tried to connect to wrong device {deviceId}, current is {normalizedCurrentDeviceId}");
                    return;
                }

                // ✅ ДОБАВЛЕНО: Регистрируем сессию пользователя при подключении
                RegisterUserSession(userId, $"User_{userId}");
                
                // ✅ ДОБАВЛЕНО: Отправляем уведомление о подключении
                await NotifyPCConnectionAsync(userId, deviceId, "connect");

                string successMessage = $"✅ Успешно подключены к ПК {deviceId}!\n\n" +
                    "🔌 **СТАТУС: АКТИВНОЕ ПОДКЛЮЧЕНИЕ**\n\n" +
                    "Теперь вы можете управлять этим ПК через команды бота:\n\n" +
                    "/status - Проверить статус\n" +
                    "/screenshot - Скриншот экрана\n" +
                    "/unbind - Отвязать ПК\n\n" +
                    "Выбирайте действие из меню приложения.";
                    
                await SendMessageAsync(userId, successMessage);
                _logger.LogInfo($"✅ User {userId} connected to device {deviceId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error processing connect command: {ex.Message}");
                try
                {
                    await SendMessageAsync(userId,
                        "❌ Ошибка при подключении к ПК\n\n" +
                        "Пожалуйста, попробуйте позже.");
                }
                catch (Exception sendEx)
                {
                    _logger.LogError($"❌ Failed to send error message: {sendEx.Message}");
                }
            }
        }

        /// <summary>
        /// Отправляет сообщение пользователю через Telegram
        /// </summary>
        public async Task SendMessageAsync(long chatId, string text)
        {
            try
            {
                _logger.LogInfo($"📤 Sending message to user {chatId}");
                
                string url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
                
                var payload = new
                {
                    chat_id = chatId,
                    text = text
                };

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInfo($"✅ Message sent to Telegram user {chatId}");
                }
                else
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"❌ Failed to send message: {response.StatusCode} - {errorContent}");
                    _logger.LogError($"📝 Message text: {text}");
                    _logger.LogError($"📝 Chat ID: {chatId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error sending message to Telegram: {ex.Message}");
                _logger.LogError($"📝 Stack trace: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Запускает долгий опрос обновлений от Telegram
        /// </summary>
        public async Task StartPollingAsync(Func<TelegramUpdate, Task> onUpdateReceived)
        {
            try
            {
                _logger.LogInfo("🔄 Starting Telegram polling...");
                _logger.LogInfo($"📱 Bot Token: {_botToken.Substring(0, 20)}...");
                _logger.LogInfo($"🖥️ Device ID: {_deviceId}");
                
                int errorCount = 0;
                const int maxErrorsBeforeRestart = 10;
                
                while (true)
                {
                    try
                    {
                        var updates = await GetUpdatesAsync();
                        
                        if (updates.Count > 0)
                        {
                            _logger.LogInfo($"📨 Got {updates.Count} updates");
                            errorCount = 0; // Reset error counter on success
                        }
                        
                        foreach (var update in updates)
                        {
                            try
                            {
                                await onUpdateReceived(update);
                            }
                            catch (Exception updateEx)
                            {
                                _logger.LogError($"❌ Error processing update: {updateEx.Message}");
                            }
                        }

                        // Небольшая задержка между опросами
                        await Task.Delay(1000);
                    }
                    catch (Exception ex)
                    {
                        errorCount++;
                        _logger.LogError($"❌ Polling error (#{errorCount}): {ex.Message}");
                        
                        if (errorCount >= maxErrorsBeforeRestart)
                        {
                            _logger.LogError($"❌ Too many errors ({errorCount}), restarting polling...");
                            errorCount = 0;
                            _lastUpdateId = 0; // Reset to start from beginning
                        }
                        
                        await Task.Delay(5000);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Telegram polling failed: {ex.Message}");
                _logger.LogError($"📝 Stack trace: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Регистрирует пользователя как подключенного к этому устройству
        /// </summary>
        private void RegisterUserSession(long userId, string username)
        {
            try
            {
                if (!_userSessions.ContainsKey(userId))
                {
                    _userSessions[userId] = new UserSession
                    {
                        UserId = userId,
                        Username = username,
                        ConnectedAt = DateTime.Now,
                        LastActivity = DateTime.Now
                    };
                    _logger.LogInfo($"✅ User session registered: {username} (ID: {userId})");
                }
                else
                {
                    _userSessions[userId].LastActivity = DateTime.Now;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error registering user session: {ex.Message}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Проверяет и удаляет истекшие сессии
        /// </summary>
        private void CleanupExpiredSessions()
        {
            try
            {
                var now = DateTime.Now;
                var expiredSessions = _userSessions
                    .Where(s => (now - s.Value.LastActivity).TotalMinutes > SessionTimeoutMinutes)
                    .Select(s => s.Key)
                    .ToList();

                foreach (var userId in expiredSessions)
                {
                    var username = _userSessions[userId].Username;
                    _userSessions.Remove(userId);
                    _logger.LogInfo($"🔓 Session expired for user: {username} (ID: {userId})");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error cleaning up sessions: {ex.Message}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Получает информацию о активных сессиях
        /// </summary>
        public int GetActiveSessions()
        {
            CleanupExpiredSessions();
            return _userSessions.Count;
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Проверяет авторизацию пользователя
        /// </summary>
        private bool IsUserAuthorized(long userId)
        {
            return _userSessions.ContainsKey(userId) && 
                   (DateTime.Now - _userSessions[userId].LastActivity).TotalMinutes <= SessionTimeoutMinutes;
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Получает список активных пользователей
        /// </summary>
        public List<UserSession> GetActiveUsers()
        {
            CleanupExpiredSessions();
            return _userSessions.Values.ToList();
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Отключает пользователя (удаляет сессию)
        /// </summary>
        public void DisconnectUser(long userId)
        {
            try
            {
                if (_userSessions.ContainsKey(userId))
                {
                    var username = _userSessions[userId].Username;
                    _userSessions.Remove(userId);
                    _logger.LogInfo($"🔓 User disconnected: {username} (ID: {userId})");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error disconnecting user: {ex.Message}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Получает статус сессии конкретного пользователя
        /// </summary>
        public UserSession GetUserSession(long userId)
        {
            if (_userSessions.ContainsKey(userId))
            {
                _userSessions[userId].LastActivity = DateTime.Now;
                return _userSessions[userId];
            }
            return null;
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Отправляет уведомление о подключении пользователя к ПК
        /// </summary>
        private async Task NotifyPCConnectionAsync(long userId, string deviceId, string actionType)
        {
            try
            {
                var connectionInfo = new
                {
                    timestamp = DateTime.Now,
                    action = "DEVICE_CONNECTED",
                    user_id = userId,
                    device_id = deviceId,
                    action_type = actionType, // "bind" или "connect"
                    pc_name = System.Environment.MachineName,
                    username = System.Environment.UserName
                };

                var json = JsonConvert.SerializeObject(connectionInfo, Formatting.Indented);
                _logger.LogInfo($"📱 Connection event: {json}");

                // Строим детальное сообщение о подключении
                string notificationMessage = 
                    $"📱 **СОБЫТИЕ ПОДКЛЮЧЕНИЯ**\n\n" +
                    $"✅ Статус: **ПОДКЛЮЧЕНО**\n" +
                    $"🖥️ Устройство: {deviceId}\n" +
                    $"💻 Компьютер: {System.Environment.MachineName}\n" +
                    $"👤 Пользователь ПК: {System.Environment.UserName}\n" +
                    $"⏰ Время: {DateTime.Now:dd.MM.yyyy HH:mm:ss}\n" +
                    $"🔑 Тип действия: {(actionType == "bind" ? "Привязка" : "Подключение")}\n" +
                    $"📊 Активных сессий: {GetActiveSessions()}\n";

                _logger.LogInfo($"🔌 PC Connection Notification: {notificationMessage}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error notifying PC connection: {ex.Message}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Отправляет уведомление об отключении пользователя от ПК
        /// </summary>
        private async Task NotifyPCDisconnectionAsync(long userId, string actionType)
        {
            try
            {
                var disconnectionInfo = new
                {
                    timestamp = DateTime.Now,
                    action = "DEVICE_DISCONNECTED",
                    user_id = userId,
                    device_id = _deviceId,
                    action_type = actionType, // "unbind"
                    pc_name = System.Environment.MachineName,
                    username = System.Environment.UserName
                };

                var json = JsonConvert.SerializeObject(disconnectionInfo, Formatting.Indented);
                _logger.LogInfo($"📱 Disconnection event: {json}");

                // Строим детальное сообщение об отключении
                string notificationMessage =
                    $"📱 **СОБЫТИЕ ОТКЛЮЧЕНИЯ**\n\n" +
                    $"❌ Статус: **ОТКЛЮЧЕНО**\n" +
                    $"🖥️ Устройство: {_deviceId}\n" +
                    $"💻 Компьютер: {System.Environment.MachineName}\n" +
                    $"👤 Пользователь ПК: {System.Environment.UserName}\n" +
                    $"⏰ Время: {DateTime.Now:dd.MM.yyyy HH:mm:ss}\n" +
                    $"🔑 Тип действия: Отвязка\n" +
                    $"📊 Активных сессий: {GetActiveSessions()}\n";

                _logger.LogInfo($"🔌 PC Disconnection Notification: {notificationMessage}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error notifying PC disconnection: {ex.Message}");
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Получает все события подключения в виде текста
        /// </summary>
        public string GetConnectionStatusInfo()
        {
            try
            {
                var activeSessions = GetActiveUsers();
                
                string statusInfo = $"🖥️ **СТАТУС ПОДКЛЮЧЕНИЙ ПК {_deviceId}**\n\n";
                statusInfo += $"⏰ Время проверки: {DateTime.Now:dd.MM.yyyy HH:mm:ss}\n";
                statusInfo += $"💻 Компьютер: {System.Environment.MachineName}\n";
                statusInfo += $"👤 Пользователь: {System.Environment.UserName}\n\n";
                
                statusInfo += $"📊 **АКТИВНЫЕ СЕССИИ: {activeSessions.Count}**\n\n";

                if (activeSessions.Count > 0)
                {
                    statusInfo += "🟢 **Подключённые пользователи:**\n";
                    foreach (var session in activeSessions)
                    {
                        int durationMinutes = session.SessionDurationMinutes;
                        statusInfo += $"• {session.Username} - подключен {durationMinutes} мин (последняя активность: {DateTime.Now.Subtract(session.LastActivity).TotalSeconds:F0}с назад)\n";
                    }
                }
                else
                {
                    statusInfo += "⚫ **Нет активных подключений**\n";
                }

                statusInfo += $"\n📈 Всего зарегистрировано сессий: {_userSessions.Count}";

                return statusInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error getting connection status: {ex.Message}");
                return $"❌ Ошибка при получении статуса подключений: {ex.Message}";
            }
        }

        /// <summary>
        /// ✅ ДОБАВЛЕНО: Отправляет отчёт о всех подключениях на текущий момент
        /// </summary>
        public async Task SendConnectionReportAsync(long chatId)
        {
            try
            {
                string report = GetConnectionStatusInfo();
                await SendMessageAsync(chatId, report);
                _logger.LogInfo($"✅ Connection report sent to user {chatId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error sending connection report: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Класс для представления обновления от Telegram
    /// </summary>
    public class TelegramUpdate
    {
        public long UpdateId { get; set; }
        public long UserId { get; set; }
        public string Username { get; set; }
        public string Text { get; set; }
        public string DeviceId { get; set; }
    }

    /// <summary>
    /// Внутренний класс для десериализации ответа Telegram API
    /// </summary>
    internal class TelegramApiResponse
    {
        [JsonProperty("ok")]
        public bool Ok { get; set; }

        [JsonProperty("result")]
        public List<TelegramUpdateInternal> Result { get; set; }
    }

    internal class TelegramUpdateInternal
    {
        [JsonProperty("update_id")]
        public long UpdateId { get; set; }

        [JsonProperty("message")]
        public TelegramMessage Message { get; set; }
    }

    internal class TelegramMessage
    {
        [JsonProperty("message_id")]
        public int MessageId { get; set; }

        [JsonProperty("from")]
        public TelegramUser From { get; set; }

        [JsonProperty("text")]
        public string Text { get; set; }
    }

    internal class TelegramUser
    {
        [JsonProperty("id")]
        public long Id { get; set; }

        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("first_name")]
        public string FirstName { get; set; }
    }

    /// <summary>
    /// ✅ ДОБАВЛЕНО: Класс для управления сессией пользователя
    /// </summary>
    public class UserSession
    {
        public long UserId { get; set; }
        public string Username { get; set; }
        public DateTime ConnectedAt { get; set; }
        public DateTime LastActivity { get; set; }

        public int SessionDurationMinutes
        {
            get { return (int)(DateTime.Now - ConnectedAt).TotalMinutes; }
        }

        public bool IsActive
        {
            get { return (DateTime.Now - LastActivity).TotalMinutes < 30; }
        }
    }
}
