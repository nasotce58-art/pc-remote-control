# 🚀 QUICK START - Commands Implementation

## За 5 минут до запуска

### 1️⃣ Проверить файлы (30 сек)

```bash
# Все файлы должны быть в проекте:
Commands/
  ├── Power/
  ├── Monitoring/
  ├── Input/
  ├── Files/
  ├── Settings/
  └── CommandDispatcher.cs

Services/
  ├── CommandValidator.cs        ✅
  ├── PermissionChecker.cs       ✅
  ├── SystemHealthService.cs     ✅
  ├── CommandErrorHandler.cs     ✅
  └── PollingServiceWithCommands.cs  ✅

Models/
  ├── CommandValidationResult.cs           ✅
  └── ExtendedCommandExecutionResult.cs    ✅
```

### 2️⃣ Инициализировать в App.xaml.cs (1 мин)

```csharp
using PCRemoteControl.Commands;
using PCRemoteControl.Services;

public partial class App : Application
{
    private CommandDispatcher _commandDispatcher;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        InitializeCommandDispatcher();
    }

    private void InitializeCommandDispatcher()
    {
        var logger = new Logger();
        var permissionChecker = new PermissionChecker(logger);
        var healthService = new SystemHealthService(logger);
        var errorHandler = new CommandErrorHandler(logger);
        var validator = new CommandValidator(logger);

        _commandDispatcher = new CommandDispatcher(
            logger,
            permissionChecker,
            healthService,
            errorHandler,
            validator
        );
    }
}
```

### 3️⃣ Использовать в PollingService (2 мин)

```csharp
// В Services/PollingService.cs замените:

// ❌ ДО:
private async Task ProcessCommandAsync(Command command)
{
    var result = await _commandProcessor.ProcessCommandAsync(command);
}

// ✅ ПОСЛЕ:
private async Task ProcessCommandAsync(Command command)
{
    var result = await _commandDispatcher.DispatchAsync(command);
    
    // Отправить результат на Cloudflare
    var json = JsonConvert.SerializeObject(result);
    await _cloudflareClient.SendResultAsync(_deviceId, result.CommandId, json);
}
```

### 4️⃣ Протестировать (1 мин)

```csharp
// В главном окне добавить кнопку для теста:

private async void TestButton_Click(object sender, RoutedEventArgs e)
{
    var command = new Command
    {
        Id = Guid.NewGuid().ToString(),
        Type = "monitor",
        Action = "system_stats",
        DeviceId = "test-device",
        CreatedAt = DateTime.Now
    };

    var result = await _commandDispatcher.DispatchAsync(command);
    
    MessageBox.Show(
        $"Success: {result.Success}\n" +
        $"Message: {result.Message}\n" +
        $"Duration: {result.DurationMs}ms"
    );
}
```

## 📋 Примеры команд (Copy-Paste)

### Перезагрузка
```csharp
await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "power",
    Action = "restart",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now
});
```

### Скриншот
```csharp
var result = await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "monitor",
    Action = "screenshot",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object> { { "quality", 85 } }
});

// Отправить скриншот:
if (result.Success && result.Data.ContainsKey("base64"))
{
    byte[] imageBytes = Convert.FromBase64String(result.Data["base64"].ToString());
    // Отправить imageBytes...
}
```

### Статус системы
```csharp
var result = await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "monitor",
    Action = "system_stats",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now
});

// result.Data содержит:
// - "cpu_usage" (float)
// - "ram_usage" (float)
// - "disk_free_gb" (long)
// - "internet" (string: "online"/"offline")
```

### CMD команда
```csharp
var result = await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "input",
    Action = "cmd_execute",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object>
    {
        { "command", "ipconfig" }  // Макс 30 секунд выполнения
    }
});

// result.Data содержит:
// - "output" (string)
// - "error" (string)
```

### Убить процесс
```csharp
var result = await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "monitor",
    Action = "kill_process",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object>
    {
        { "processName", "chrome.exe" }
    }
});
```

### Управление громкостью
```csharp
// Отключить звук
await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "input",
    Action = "volume_mute",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now
});

// Установить на 50%
await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "input",
    Action = "volume_set",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object> { { "level", 50 } }
});
```

### Буфер обмена
```csharp
// Записать текст
await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "input",
    Action = "clipboard_write",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object>
    {
        { "text", "Hello World!" }
    }
});

// Прочитать текст
var result = await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "input",
    Action = "clipboard_read",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now
});

string clipboardContent = result.Data["content"].ToString();
```

### Таймер выключения
```csharp
await _commandDispatcher.DispatchAsync(new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "power",
    Action = "timer",
    DeviceId = "device-123",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object>
    {
        { "minutes", 30 }  // Выключить через 30 минут
    }
});
```

## ✅ Проверка работоспособности

Все команды должны:

- ✅ Возвращать результат в течение разумного времени
- ✅ Логировать операцию в файл логов
- ✅ Заполнять все поля результата
- ✅ Обрабатывать ошибки без падения приложения

### Просмотр логов

```bash
# Логи находятся в:
c:\conrol pc\app\windows-client\Logs\PCRemoteControl_YYYYMMDD.log

# Ищите строки:
[INFO] Executing COMMAND command
[ERROR] Error executing COMMAND command
```

## 🐛 Если что-то не работает

### Ошибка: "PERMISSION_DENIED"
→ Запустите приложение как администратор

### Ошибка: "FILE_NOT_FOUND"
→ Проверьте пути в команде, используйте полные пути

### Ошибка: "TIMEOUT"
→ Команда выполнялась слишком долго (max 30s для CMD)

### Ошибка: "VALIDATION_ERROR"
→ Проверьте обязательные поля команды:
- Id ✅
- Type ✅ (power, monitor, input, file, settings)
- Action ✅
- DeviceId ✅

## 📊 Мониторинг команд

Добавьте в окне для отслеживания команд:

```csharp
private List<string> _commandLog = new();

private async Task LogCommand(Command command, ExtendedCommandExecutionResult result)
{
    var logEntry = $"[{DateTime.Now:HH:mm:ss}] {command.Type}/{command.Action} - " +
                   $"{(result.Success ? "✅" : "❌")} ({result.DurationMs}ms)";
    
    _commandLog.Add(logEntry);
    
    // Вывести в UI
    CommandLogTextBlock.Text = string.Join("\n", _commandLog.TakeLast(10));
}
```

## 🎯 Все 20+ команд готовы

```
⚡ Power        - 7 команд (restart, shutdown, sleep, force_shutdown, monitor, lock, timer)
📊 Monitoring   - 4 команды (stats, processes, kill, screenshot)
⌨️  Input        - 7 команд (clipboard read/write, volume, cmd)
📁 Files        - 2 команды (launcher, search)
⚙️  Settings     - 2 команды (autorun, about)
```

## 🚀 Готово к production

Все команды:
- Валидируют входные данные
- Проверяют права администратора
- Имеют таймауты
- Логируют результаты
- Возвращают детальную информацию об ошибках

---

**Время на интеграцию**: ~5 минут  
**Статус**: ✅ Production Ready  
**Тестирование**: Включено для каждой команды
