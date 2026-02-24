# 🖥️ Desktop App - Инструкция

## Требования

- Node.js 18+
- Windows 10/11, Linux или macOS
- Доступ к Cloudflare Worker

---

## Установка

```bash
cd app/desktop
npm install
```

## Запуск

### Development режим

```bash
npm run dev
```

Приложение откроется в Electron окне с DevTools.

### Production сборка

```bash
npm run build
```

Сборка будет в папке `dist/`.

---

## Настройка

### Первый запуск

1. Запустите приложение
2. Перейдите в **⚙️ Настройки** (в меню Файл или Sidebar)
3. Введите **Worker URL**
4. Нажмите **Генерировать** для создания Device ID
5. Нажмите **Проверить подключение**
6. Нажмите **Сохранить настройки**

### Конфигурация

Конфигурация хранится в:

- **Windows:** `%APPDATA%\pc-remote-control-desktop\config.json`
- **Linux:** `~/.config/pc-remote-control-desktop/config.json`
- **macOS:** `~/Library/Application Support/pc-remote-control-desktop/config.json`

---

## Структура

```
app/desktop/
├── main.js                  # Electron main process
├── preload.js              # Preload script
├── src/
│   ├── cloudflare-client.js    # Worker API client
│   ├── command-executor.js     # Command execution
│   ├── App.jsx                # Main React component
│   └── components/
│       ├── Dashboard.jsx      # Главная панель
│       ├── Settings.jsx       # Настройки
│       ├── PowerControl.jsx   # Управление питанием
│       ├── SystemMonitor.jsx  # Мониторинг
│       └── FileManager.jsx    # Файловый менеджер
└── package.json
```

---

## Команды

Desktop приложение выполняет команды от Telegram бота:

### Питание

- `restart` - Перезагрузка
- `shutdown` - Выключение
- `sleep` - Спящий режим
- `lock` - Блокировка экрана

### Мониторинг

- `system_stats` - Статус системы
- `process_list` - Список процессов
- `screenshot` - Скриншот

### Управление

- `volume_up/down` - Громкость
- `clipboard_get/set` - Буфер обмена
- `process_kill` - Завершить процесс

---

## Добавление новых команд

### 1. Откройте command-executor.js

Добавьте обработчик:

```javascript
class CommandExecutor {
  constructor() {
    this.commandHandlers = {
      'my_command': this.myCommand.bind(this)
    };
  }

  async myCommand(argument, parameters) {
    // Ваша логика
    return { success: true, result: '...' };
  }
}
```

### 2. Обработка в main.js

```javascript
cloudflareClient.on('onCommand', async (command) => {
  const result = await commandExecutor.execute(command);
  return result;
});
```

---

## Сборка в EXE (Windows)

### Установка electron-builder

```bash
npm install --save-dev electron-builder
```

### Добавьте в package.json

```json
{
  "build": {
    "appId": "com.pcremotecontrol.app",
    "win": {
      "target": "nsis"
    }
  }
}
```

### Сборка

```bash
npm run build
npx electron-builder --win
```

---

## Troubleshooting

### Приложение не запускается

```bash
# Очистите кэш
rm -rf node_modules
rm package-lock.json
npm install
```

### Нет подключения к Worker

1. Проверьте URL в настройках
2. Проверьте что Worker доступен
3. Проверьте firewall

### Команды не выполняются

1. Проверьте логи в DevTools
2. Убедитесь что права администратора есть
3. Проверьте антивирус

---

## Разработка

### Hot reload

```bash
npm run dev
```

Изменения в React компонентах применяются автоматически.

### Debugging

Откройте DevTools:

- Ctrl+Shift+I (Windows/Linux)
- Cmd+Option+I (macOS)

### Логирование

Логи выводятся в:

- Консоль DevTools (Renderer)
- Консоль main процесса (запуск с `ELECTRON_ENABLE_LOGGING=1`)

---

## Безопасность

- Не запускать от имени администратора без необходимости
- Проверять входящие команды
- Ограничить доступ к критическим функциям
- Использовать HTTPS для Worker URL

---

## Производительность

- Polling команд: 3 секунды (настраивается)
- Heartbeat: 30 секунд
- Минимальное использование CPU в простое

---

## Зависимости

- **Electron** - Фреймворк для desktop приложений
- **React** - UI библиотека
- **Axios** - HTTP клиент
- **Vite** - Сборщик
