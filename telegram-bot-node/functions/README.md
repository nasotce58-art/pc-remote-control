# 📁 СТРУКТУРА ФУНКЦИЙ

---

## 🎯 Организация по разделам

```
telegram-bot-node/
└── functions/
    ├── power-control/          ← ⚡ Питание и сеть
    │   ├── index.js            (регистрация обработчиков)
    │   ├── monitor.js          (💻 Монитор Вкл/Выкл)
    │   ├── lock.js             (🔒 Блокировка системы)
    │   ├── timer.js            (⏱️ Таймер выключения)
    │   ├── sleep.js            (💤 Спящий режим)
    │   ├── restart.js          (⚡ Перезагрузка)
    │   └── shutdown.js         (⏹️ Выключить)
    │
    └── monitoring/             ← 📊 Мониторинг и экран
        ├── index.js            (регистрация обработчиков)
        ├── stats.js            (📊 Статус системы)
        ├── screenshot.js       (📸 Скриншот)
        ├── webcam.js           (📷 Веб-камера)
        └── processes.js        (📋 Процессы)
```

---

## ⚡ РАЗДЕЛ 1: ПИТАНИЕ И СЕТЬ

### Содержит 6 функций:

1. **monitor.js** - handleMonitorToggle()
   - Выключить/включить монитор
   - Команда: `monitor_toggle`
   - Windows: `SendMessage SC_MONITORPOWER`

2. **lock.js** - handleLockPC()
   - Заблокировать ПК
   - Команда: `lock`
   - Windows: `Win + L`

3. **timer.js** - handleShutdownTimer(), handleTimerSelection()
   - Таймер выключения (3 варианта)
   - Команда: `shutdown_timer`
   - Варианты: 30 мин (1800 сек), 1 час (3600 сек), 2 часа (7200 сек)

4. **sleep.js** - handleSleepPC()
   - Спящий режим
   - Команда: `sleep`
   - Windows: `Application.SetSuspendState`

5. **restart.js** - handleRestartPC()
   - Перезагрузка ПК
   - Команда: `restart`
   - Windows: `shutdown /r /t 0`

6. **shutdown.js** - handleShutdownPC()
   - Выключение ПК
   - Команда: `shutdown`
   - Windows: `shutdown /s /t 0`

### index.js - registerPowerControlHandlers()
- Регистрирует все обработчики callback
- Экспортирует все функции для использования в bot.js

---

## 📊 РАЗДЕЛ 2: МОНИТОРИНГ И ЭКРАН

### Содержит 4 функции:

1. **stats.js** - handleSystemStats()
   - Получить статус системы
   - Команда: `system_stats`
   - Информация: CPU, RAM, GPU, Network, Time, Uptime

2. **screenshot.js** - handleScreenshot()
   - Скриншот всех мониторов
   - Команда: `screenshot`
   - Отправляет картинку в Telegram

3. **webcam.js** - handleWebcamPhoto()
   - Фото с веб-камеры
   - Команда: `webcam_photo`
   - Функция "Охранник" для безопасности
   - Обработка случая "камера не найдена"

4. **processes.js** - handleProcessList(), handleKillProcess()
   - Список ТОП-10 тяжелых процессов
   - Команда: `process_list`
   - Функция убить процесс: `kill_process` + имя процесса

### index.js - registerMonitoringHandlers()
- Регистрирует все обработчики callback
- Экспортирует все функции для использования в bot.js

---

## 🔗 ИНТЕГРАЦИЯ В BOT.JS

### Используется в bot.js:

```javascript
// Импорт функций из папок
const { registerPowerControlHandlers } = require('./functions/power-control');
const { registerMonitoringHandlers } = require('./functions/monitoring');

// После инициализации бота
registerPowerControlHandlers(bot, CLOUDFLARE_WORKER_URL);
registerMonitoringHandlers(bot, CLOUDFLARE_WORKER_URL);
```

### Callback_data привязки:

**⚡ Питание и сеть:**
- `monitor_toggle` → handleMonitorToggle()
- `lock_pc` → handleLockPC()
- `shutdown_timer` → handleShutdownTimer()
- `timer_30min` → handleTimerSelection(30)
- `timer_60min` → handleTimerSelection(60)
- `timer_120min` → handleTimerSelection(120)
- `sleep_pc_menu` → handleSleepPC()
- `restart_pc_menu` → handleRestartPC()
- `shutdown_pc_menu` → handleShutdownPC()

**📊 Мониторинг и экран:**
- `system_stats` → handleSystemStats()
- `screenshot` → handleScreenshot()
- `webcam_photo` → handleWebcamPhoto()
- `process_list` → handleProcessList()
- `kill_process` → handleKillProcess()

---

## 📐 СТРУКТУРА ФАЙЛА

### Каждый файл функции содержит:

```javascript
// 1. Заголовок с информацией
// Functions Name
// Раздел: название раздела
// Функция: название функции

// 2. Импорты
const axios = require('axios');
const fs = require('fs');

// 3. Основная функция
async function handleFunctionName(ctx, userId, workerUrl) {
  try {
    // Get device ID
    // Send command to Worker
    // Send response to user
    // Handle errors
  } catch (error) {
    // Error handling
  }
}

// 4. Экспорт
module.exports = {
  handleFunctionName
};
```

### Каждый index.js содержит:

```javascript
// 1. Импорт всех функций из папки
const { func1 } = require('./file1');
const { func2, func3 } = require('./file2');

// 2. Основная функция регистрации
function registerHandlers(bot, workerUrl) {
  bot.action('callback_data', async (ctx) => {
    const userId = ctx.from?.id;
    await handleFunction(ctx, userId, workerUrl);
  });
}

// 3. Экспорт регистратора и всех функций
module.exports = {
  registerHandlers,
  func1,
  func2,
  func3
};
```

---

## 🔧 СТАНДАРТНЫЙ ПАТТЕРН ФУНКЦИИ

Все функции следуют одному паттерну:

```javascript
async function handleFunction(ctx, userId, workerUrl) {
  console.log(`[functionName] Starting for user ${userId}`);

  try {
    // 1. Получить Device ID
    const checkDeviceResponse = await axios.get(
      `${workerUrl}/api/user/${userId}/device`
    );
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // 2. Отправить команду Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'command_name',
        argument: null // или значение
      }
    );

    // 3. Ответить пользователю
    await ctx.reply('✅ Команда выполнена');
    await ctx.answerCbQuery('✅ OK');
    
  } catch (error) {
    // 4. Обработка ошибок
    console.error('[functionName] Error:', error.message);
    await ctx.reply('⚠️ Ошибка');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}
```

---

## ✅ ДОБАВЛЕНИЕ НОВОЙ ФУНКЦИИ

### Шаг 1: Создать файл в нужной папке
```bash
functions/
└── section-name/
    └── new-function.js
```

### Шаг 2: Написать функцию по шаблону

### Шаг 3: Добавить в index.js

```javascript
// Импорт
const { handleNewFunction } = require('./new-function');

// Регистрация
bot.action('new_callback', async (ctx) => {
  const userId = ctx.from?.id;
  await handleNewFunction(ctx, userId, workerUrl);
});

// Экспорт
module.exports = {
  registerHandlers,
  handleNewFunction  // Добавить
};
```

### Шаг 4: Использовать в bot.js

```javascript
[{ text: '🆕 Новая кнопка', callback_data: 'new_callback' }]
```

---

## 📊 СТАТИСТИКА

```
Всего функций:           10
Разделов:                2
Файлов:                  12 (10 + 2 index.js)

⚡ Питание и сеть:       6 функций
📊 Мониторинг и экран:  4 функции

Следующие разделы:
🔒 Безопасность         (future)
📁 Файлы                (future)
🌐 Интернет             (future)
```

---

## 🚀 ИСПОЛЬЗОВАНИЕ

### В bot.js:

```javascript
const { registerPowerControlHandlers } = require('./functions/power-control');
const { registerMonitoringHandlers } = require('./functions/monitoring');

// После инициализации бота Telegraf
registerPowerControlHandlers(bot, CLOUDFLARE_WORKER_URL);
registerMonitoringHandlers(bot, CLOUDFLARE_WORKER_URL);
```

### В меню:

```javascript
const settingsMessage = `⚙️ Дополнительные функции

1️⃣ ⚡ Питание и сеть
2️⃣ 📊 Мониторинг и экран`;

// Кнопки
inline_keyboard: [
  [{ text: '💻 Монитор', callback_data: 'monitor_toggle' }],
  [{ text: '📊 Статус', callback_data: 'system_stats' }],
  // ... остальные кнопки
]
```

---

## 📝 ПРАВИЛА

✅ **НИКОГДА:**
- ❌ Не удаляй старый код
- ❌ Не переименовывай функции
- ❌ Не меняй архитектуру
- ❌ Не рефакторь без запроса

✅ **ТОЛЬКО:**
- ✅ Добавляй новые функции
- ✅ Исправляй реальные ошибки
- ✅ Дополняй существующее
- ✅ Следуй паттерну

---

**Version:** 2.0  
**Status:** Structure Organized  
**Modular:** Yes ✅  

