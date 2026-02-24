# PC Remote Control Client - Windows Desktop

Приложение для Windows, которое получает команды от Telegram через Cloudflare KV и выполняет их на ПК.

## 🎯 Возможности

### 🔌 Управление питанием
- Вкл/Выкл ПК (Wake-on-LAN / Sleep)
- Выключение (shutdown)
- Перезагрузка (restart)
- Блокировка системы (Win+L)
- Таймер выключения
- Управление монитором

### 📊 Мониторинг
- CPU, RAM, GPU usage в реальном времени
- Температура процессора
- Сетевая активность
- Скриншоты
- Список процессов (top-10)

### 📁 Файлы и приложения
- Launcher для добавленных приложений
- Поиск и открытие файлов
- Скачивание файлов с ПК (до 50МБ)
- Загрузка файлов на ПК

### ⌨️ Управление
- Буфер обмена (чтение/запись)
- Громкость (Mute, ±10%, 100%)
- Терминал (CMD)
- Блокировка ввода

## 🛠️ Архитектура

### Структура проекта

```
windows-client/
├── Models/
│   ├── Command.cs              # Модели команд
│   └── AppSettings.cs          # Настройки и статус
├── Services/
│   ├── CloudflareClient.cs     # Long Polling + KV
│   ├── CommandProcessor.cs     # Обработка команд
│   └── PollingService.cs       # Основной цикл
├── ViewModels/
│   └── MainViewModel.cs        # Логика UI
├── Views/
│   ├── MainWindow.xaml         # Главное окно
│   ├── MainWindow.xaml.cs      # Code-behind
│   └── SettingsWindow.xaml     # Настройки
├── Utils/
│   └── Logger.cs               # Логирование
├── Logs/                       # Логи приложения
├── App.xaml                    # Ресурсы приложения
├── App.xaml.cs                 # Инициализация
└── PCRemoteControl.csproj      # Проект
```

### Основные компоненты

**CloudflareClient** - Взаимодействие с KV:
- Polling каждые 2-3 сек
- Получение команд для device_id
- Отправка результатов
- Обновление статуса

**CommandProcessor** - Обработка команд:
- 7 типов команд (power, monitor, system, file, app, input, network)
- ~30 действий
- Обработка параметров
- Логирование всех операций

**PollingService** - Основной цикл:
- Long Polling в отдельном потоке
- Автоматический перезапуск при ошибках
- Экспоненциальная задержка при сбоях
- События для UI обновлений

**MainViewModel** - MVVM логика:
- Binding данных на UI
- Events для status изменений
- Управление приложениями

**Logger** - Логирование:
- Вывод в UI TextBox (последние 1000)
- Запись в файл (Logs/log_yyyy-MM-dd.txt)
- Разные уровни (INFO, ERROR, WARNING, SUCCESS)

## 📋 Требования

- Windows 10/11
- .NET 8.0 Runtime
- Права администратора (для управления питанием)

## 🚀 Установка

### Из исходного кода

```bash
cd app/windows-client

# Восстановление зависимостей
dotnet restore

# Сборка
dotnet build -c Release

# Запуск
dotnet run
```

### Скомпилированная версия

```bash
# Сборка Self-Contained exe
dotnet publish -c Release -r win-x64 --self-contained

# Exe будет в: bin/Release/net8.0-windows/win-x64/publish/
```

## ⚙️ Конфигурация

Отредактировать App.xaml.cs:

```csharp
var cloudflareClient = new CloudflareClient(
    apiToken: "YOUR_CLOUDFLARE_API_TOKEN",
    accountId: "YOUR_ACCOUNT_ID",
    namespaceId: "YOUR_KV_NAMESPACE_ID",
    logger: logger
);
```

Получить значения:
1. Перейти в Cloudflare Dashboard
2. Скопировать API Token и Account ID
3. Создать KV Namespace (или использовать существующий)

## 🔄 Как работает

1. **Запуск** → App инициализирует сервисы и начинает polling
2. **Polling** → Каждые 3 сек проверяет Cloudflare KV на наличие команд
3. **Получение** → Если команды есть → забирает для device_id
4. **Обработка** → CommandProcessor выполняет команду
5. **Результат** → Отправляет результат в Cloudflare KV
6. **Удаление** → Удаляет команду из KV

## 📊 Лог события

Все действия записываются:
- **Консоль** - TextBox в UI (последние 1000 строк)
- **Файл** - `Logs/log_yyyy-MM-dd.txt` (ежедневно)

Пример лога:
```
[2024-02-15 14:00:00] INFO: Application started
[2024-02-15 14:00:00] INFO: Device ID: ABC123XYZ
[2024-02-15 14:00:03] INFO: Fetched 1 commands from Cloudflare
[2024-02-15 14:00:03] INFO: Processing command: power/shutdown
[2024-02-15 14:00:03] INFO: Shutdown initiated
[2024-02-15 14:00:03] SUCCESS: Result sent for command cmd-123
```

## 🛡️ Безопасность

- Context isolation (Cloudflare API)
- HTTPS для всех запросов
- Device ID в параметрах KV
- Обработка ошибок и валидация входа
- Логирование всех действий

## 💾 Ресурсы

- **RAM:** ~30-50 МБ в покое
- **CPU:** ~0.1% без нагрузки
- **Размер .exe:** ~15-20 МБ (Self-contained)

## 🔧 Решение проблем

**Приложение не запускается:**
- Проверить .NET 8 Runtime установлен
- Запустить от администратора

**Polling не работает:**
- Проверить Cloudflare credentials в App.xaml.cs
- Проверить интернет соединение
- Посмотреть логи в Logs/

**Команды не выполняются:**
- Проверить rights (может быть нужны права админа)
- Посмотреть ошибку в логе
- Проверить параметры команды

## 📝 API Команд

### Power Commands
```
power/shutdown - выключение
power/restart - перезагрузка
power/sleep - спящий режим
power/lock - блокировка
power/monitor_on - включить монитор
power/monitor_off - выключить монитор
power/timer_shutdown {minutes: 30} - таймер
```

### Monitor Commands
```
monitor/screenshot - скриншот
monitor/system_info - информация о системе
monitor/process_list - список процессов
monitor/kill_process {pid: 1234} - убить процесс
```

### System Commands
```
system/status - статус ПК
system/network_info - сетевая информация
```

### File Commands
```
file/list_files {path: "C:\\"} - список файлов
file/download {path: "file.exe"} - скачать
file/upload {path: "file.exe"} - загрузить
```

### App Commands
```
app/launch {path: "C:\\app.exe"} - запустить приложение
app/get_list - список приложений
```

### Input Commands
```
input/clipboard_get - буфер обмена (чтение)
input/clipboard_set {text: "hello"} - буфер обмена (запись)
input/volume_mute - отключить звук
input/volume_up - увеличить громкость
input/volume_down - уменьшить громкость
```

## 📚 Документация

- [Cloudflare KV Storage](https://developers.cloudflare.com/kv)
- [.NET 8 WPF](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview)
- [System.Diagnostics](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics)

## 📄 Лицензия

MIT

## 👨‍💻 Автор

PC Remote Control Team
