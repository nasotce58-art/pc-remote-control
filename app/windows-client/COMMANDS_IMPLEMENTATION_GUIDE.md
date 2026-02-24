# PC Remote Control - Commands Implementation Guide

## 📋 Структура команд

Все команды находятся в отдельной папке `Commands/` в структуре:

```
Commands/
├── Power/              # Команды управления питанием
│   ├── RestartCommand.cs
│   ├── ShutdownCommand.cs
│   ├── SleepCommand.cs
│   ├── ForceShutdownCommand.cs
│   ├── MonitorCommand.cs
│   ├── LockCommand.cs
│   └── ShutdownTimerCommand.cs
├── Monitoring/         # Команды мониторинга и экрана
│   ├── SystemStatsCommand.cs
│   ├── ProcessListCommand.cs
│   ├── KillProcessCommand.cs
│   └── ScreenshotCommand.cs
├── Input/              # Команды управления вводом
│   ├── CmdExecuteCommand.cs
│   ├── ClipboardCommand.cs
│   └── VolumeCommand.cs
├── Files/              # Команды управления файлами
│   ├── LauncherCommand.cs
│   └── SearchFilesCommand.cs
├── Settings/           # Команды настроек
│   ├── AutorunCommand.cs
│   └── AboutCommand.cs
└── CommandDispatcher.cs  # Главный диспетчер всех команд
```

## 🔧 Инфраструктурные компоненты

### Services/

#### `CommandValidator.cs`
- Валидирует команды перед выполнением
- Проверяет обязательные поля
- Валидирует параметры для каждого типа команды

#### `PermissionChecker.cs`
- Проверяет права администратора
- Контролирует доступ к файловой системе
- Проверяет разрешения для критических команд

#### `SystemHealthService.cs`
- Получает статус CPU, RAM, диск
- Проверяет наличие интернета
- Проверяет наличие веб-камеры
- Собирает информацию о системе

#### `CommandErrorHandler.cs`
- Обрабатывает ошибки команд
- Логирует результаты
- Определяет возможность повторного выполнения

### Models/

#### `CommandValidationResult.cs`
- Результат валидации команды

#### `ExtendedCommandExecutionResult.cs`
- Расширенный результат выполнения с полной информацией
- Включает время выполнения, статус интернета, попытки повтора

## 🚀 Использование

### 1. Инициализация диспетчера в главном приложении

```csharp
// В App.xaml.cs или главном окне
private CommandDispatcher _commandDispatcher;

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
```

### 2. Выполнение команды

```csharp
// Создаем команду
var command = new Command
{
    Id = Guid.NewGuid().ToString(),
    Type = "power",
    Action = "restart",
    DeviceId = "your-device-id",
    CreatedAt = DateTime.Now,
    Parameters = new Dictionary<string, object>()
};

// Выполняем команду через диспетчер
var result = await _commandDispatcher.DispatchAsync(command);

// Проверяем результат
if (result.Success)
{
    Console.WriteLine(result.Message);
    // Обрабатываем успех
}
else
{
    Console.WriteLine($"Error: {result.ErrorMessage}");
    // Обрабатываем ошибку
}
```

### 3. Отправка результата на Cloudflare

```csharp
// После выполнения команды, результат отправляется на worker
var jsonResult = JsonConvert.SerializeObject(result);
await _cloudflareClient.SendResultAsync(result.CommandId, jsonResult);
```

## 📋 Команды и их параметры

### Power Commands

#### Restart
```csharp
new Command
{
    Type = "power",
    Action = "restart",
    // Параметров нет
}
```

#### Shutdown (выключение через 10 сек)
```csharp
new Command
{
    Type = "power",
    Action = "shutdown"
}
```

#### Sleep (режим сна)
```csharp
new Command
{
    Type = "power",
    Action = "sleep"
}
```

#### Force Shutdown (принудительное выключение)
```csharp
new Command
{
    Type = "power",
    Action = "force_shutdown"
}
```

#### Monitor On/Off
```csharp
new Command
{
    Type = "power",
    Action = "monitor_on"  // или "monitor_off"
}
```

#### Lock PC
```csharp
new Command
{
    Type = "power",
    Action = "lock"
}
```

#### Timer (таймер выключения)
```csharp
new Command
{
    Type = "power",
    Action = "timer",
    Parameters = new Dictionary<string, object>
    {
        { "minutes", 30 }  // 1-1440 минут
    }
}
```

### Monitoring Commands

#### System Stats
```csharp
new Command
{
    Type = "monitor",
    Action = "system_stats"
}
// Результат содержит: CPU%, RAM%, Disk Free, Internet Status, Network Interfaces
```

#### Process List
```csharp
new Command
{
    Type = "monitor",
    Action = "process_list",
    Parameters = new Dictionary<string, object>
    {
        { "filter", "chrome" }  // опционально
    }
}
// Результат: список процессов с PID, memory, threads
```

#### Kill Process
```csharp
new Command
{
    Type = "monitor",
    Action = "kill_process",
    Parameters = new Dictionary<string, object>
    {
        { "processName", "chrome.exe" }  // или PID как строка
    }
}
```

#### Screenshot
```csharp
new Command
{
    Type = "monitor",
    Action = "screenshot",
    Parameters = new Dictionary<string, object>
    {
        { "quality", 80 }  // 10-100, опционально
    }
}
// Результат содержит base64-кодированное изображение
```

### Input Commands

#### Clipboard Read
```csharp
new Command
{
    Type = "input",
    Action = "clipboard_read"
}
// Результат: содержимое буфера обмена
```

#### Clipboard Write
```csharp
new Command
{
    Type = "input",
    Action = "clipboard_write",
    Parameters = new Dictionary<string, object>
    {
        { "text", "текст для копирования" }
    }
}
```

#### Volume Control
```csharp
// Mute
new Command
{
    Type = "input",
    Action = "volume_mute"
}

// Unmute
new Command
{
    Type = "input",
    Action = "volume_unmute"
}

// Increase (+10%)
new Command
{
    Type = "input",
    Action = "volume_up"
}

// Decrease (-10%)
new Command
{
    Type = "input",
    Action = "volume_down"
}

// Set to specific level
new Command
{
    Type = "input",
    Action = "volume_set",
    Parameters = new Dictionary<string, object>
    {
        { "level", 50 }  // 0-100
    }
}
```

#### CMD Execute
```csharp
new Command
{
    Type = "input",
    Action = "cmd_execute",
    Parameters = new Dictionary<string, object>
    {
        { "command", "dir C:\\" }
    }
}
// Результат содержит stdout и stderr
// Максимальное время выполнения: 30 секунд
```

### File Commands

#### Launcher
```csharp
new Command
{
    Type = "file",
    Action = "launcher",
    Parameters = new Dictionary<string, object>
    {
        { "path", "C:\\Users\\User\\AppData\\Local\\Programs\\Notepad++\\notepad++.exe" }
    }
}
```

#### Search Files
```csharp
new Command
{
    Type = "file",
    Action = "search_files",
    Parameters = new Dictionary<string, object>
    {
        { "pattern", "*.txt" },
        { "directory", "C:\\Users\\User\\Documents" }  // опционально
    }
}
// Результат: до 100 файлов с полной информацией
```

### Settings Commands

#### Autorun Enable/Disable
```csharp
// Включить автозагрузку
new Command
{
    Type = "settings",
    Action = "autorun_enable"
}

// Отключить автозагрузку
new Command
{
    Type = "settings",
    Action = "autorun_disable"
}
```

#### About
```csharp
new Command
{
    Type = "settings",
    Action = "about"
}
// Результат: полная информация о приложении и системе
```

## 🔍 Результаты команд

Все команды возвращают `ExtendedCommandExecutionResult` с полями:

```csharp
public class ExtendedCommandExecutionResult
{
    public string? CommandId { get; set; }              // ID команды
    public string? DeviceId { get; set; }              // ID устройства
    public string? CommandType { get; set; }           // Тип команды
    public string? Action { get; set; }                // Действие
    public bool Success { get; set; }                  // Успех выполнения
    public string? Message { get; set; }               // Основное сообщение
    public string? ErrorMessage { get; set; }          // Сообщение об ошибке
    public string? ErrorCode { get; set; }             // Код ошибки
    public Dictionary<string, object>? Data { get; set; }  // Данные результата
    public DateTime ExecutedAt { get; set; }           // Время выполнения
    public long DurationMs { get; set; }               // Длительность (мс)
    public bool WasRetried { get; set; }               // Был ли повтор
    public int AttemptNumber { get; set; }             // Номер попытки
    public bool InternetAvailable { get; set; }        // Был ли интернет
    public string? StackTrace { get; set; }            // Стек ошибки (для логов)
}
```

## ⚙️ Коды ошибок

- `TIMEOUT` - Команда превысила время выполнения
- `ACCESS_DENIED` - Нет доступа к файлу/функции
- `PERMISSION_DENIED` - Недостаточно прав администратора
- `FILE_NOT_FOUND` - Файл не найден
- `PROCESS_NOT_FOUND` - Процесс не найден
- `PROCESS_START_FAILED` - Не удалось запустить процесс
- `INVALID_PARAMETER` - Неверный параметр команды
- `VALIDATION_ERROR` - Ошибка валидации команды
- `NETWORK_ERROR` - Ошибка сети
- `EXCEPTION` - Необработанное исключение

## 📝 Логирование

Все команды логируют:
- Начало выполнения
- Промежуточные шаги
- Успешное завершение или ошибку
- Детальные ошибки в случае падения

Логи сохраняются в папке `Logs/` с названием `PCRemoteControl_YYYYMMDD.log`

## 🛡️ Проверки безопасности

1. **Права администратора** - проверяются для критических команд
2. **Валидация входных данных** - все параметры проверяются перед использованием
3. **Защита файловой системы** - запрещен доступ к системным папкам
4. **Ограничение размера файлов** - скриншоты ограничены 5MB
5. **Таймауты** - команды имеют максимальное время выполнения

## 🔄 Интеграция с PollingService

В `PollingService.cs` необходимо использовать диспетчер:

```csharp
public class PollingService
{
    private CommandDispatcher _commandDispatcher;

    private async Task ProcessCommandAsync(Command command)
    {
        var result = await _commandDispatcher.DispatchAsync(command);
        
        // Отправляем результат на Cloudflare
        await _cloudflareClient.SendResultAsync(result.CommandId, result);
    }
}
```

## 📊 Результаты команд в JSON

Пример результата для скриншота:

```json
{
    "commandId": "cmd-123",
    "success": true,
    "message": "Скриншот получен",
    "action": "screenshot",
    "durationMs": 450,
    "data": {
        "filename": "screenshot_20260217_120530.jpg",
        "size_kb": 245,
        "base64": "iVBORw0KGgoAAAANSUhEUg...",
        "format": "jpeg",
        "quality": 80
    },
    "executedAt": "2026-02-17T12:05:30.1234567+03:00",
    "internetAvailable": true
}
```

---

## ✅ Чек-лист интеграции

- [ ] Скопировать папку `Commands/` в проект
- [ ] Добавить новые Services в проект
- [ ] Добавить новые Models в проект
- [ ] Инициализировать `CommandDispatcher` в главном окне
- [ ] Интегрировать диспетчер в `PollingService`
- [ ] Добавить обработку результатов команд
- [ ] Протестировать каждую команду
- [ ] Проверить логирование
- [ ] Проверить обработку ошибок
- [ ] Развернуть на продакшене

---

**Автор**: PC Remote Control Team  
**Версия**: 1.0.0  
**Дата**: 17 февраля 2026
