# 🤖 Telegram Bot - Инструкция

## Требования

- Node.js 18+
- Telegram Bot Token
- Доступ к Cloudflare Worker

---

## Установка

```bash
cd telegram-bot-node
npm install
```

## Настройка

### 1. Создайте .env файл

```bash
cp .env.example .env
```

### 2. Получите токен бота

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Введите имя бота
4. Введите username бота (должен заканчиваться на `bot`)
5. Скопируйте полученный токен

### 3. Получите ваш Chat ID

1. Откройте [@userinfobot](https://t.me/userinfobot)
2. Отправьте любое сообщение
3. Скопируйте ваш Chat ID

### 4. Заполните .env

```env
BOT_TOKEN=8433887802:AAHO8MqAXIujaKZJvENvNgmuiZH3BN5H8o4
CLOUDFLARE_WORKER_URL=https://pc-remote-control.ваш-username.workers.dev
ADMIN_CHAT_ID=5649053560
```

---

## Запуск

### Development режим

```bash
npm start
```

### Production (с PM2)

```bash
npm install -g pm2
pm2 start bot.js --name pc-bot
pm2 save
pm2 startup
```

---

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню |
| `/connect DEVICE_ID` | Подключить ПК |
| `/unbind` | Отвязать ПК |
| `/help` | Справка |

---

## Структура

```
telegram-bot-node/
├── bot.js                    # Основной файл
├── functions/
│   ├── power-control/       # Управление питанием
│   │   ├── index.js
│   │   ├── restart.js
│   │   ├── shutdown.js
│   │   ├── sleep.js
│   │   └── lock.js
│   ├── monitoring/          # Мониторинг
│   │   ├── index.js
│   │   ├── stats.js
│   │   └── screenshot.js
│   ├── pairing-handler.js   # Подключение устройств
│   ├── unbind-handler.js    # Отвязка устройств
│   ├── command-dispatcher.js # Отправка команд
│   └── device-storage.js    # Хранение устройств
└── .env
```

---

## Добавление новых команд

### 1. Создайте файл команды

`functions/power-control/new-command.js`:

```javascript
const axios = require('axios');

async function handleNewCommand(ctx, userId, workerUrl) {
  try {
    // Получить device ID пользователя
    const response = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = response.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      return;
    }

    // Отправить команду
    const result = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      { command: 'new_command' }
    );

    await ctx.reply('✅ Команда выполнена');
  } catch (error) {
    await ctx.reply('❌ Ошибка: ' + error.message);
  }
}

module.exports = { handleNewCommand };
```

### 2. Добавьте в index.js

```javascript
const { handleNewCommand } = require('./new-command');

bot.action('new_command', async (ctx) => {
  const userId = ctx.from?.id;
  await handleNewCommand(ctx, userId, workerUrl);
});
```

---

## Troubleshooting

### Бот не запускается

```bash
# Проверьте .env
cat .env

# Проверьте логи
npm start 2>&1 | tee bot.log
```

### Бот не отвечает на команды

1. Проверьте что Worker доступен
2. Проверьте логи бота
3. Убедитесь что Chat ID правильный

### Ошибки API

```javascript
// Включите логирование
process.env.DEBUG = 'telegraf:*'
```

---

## Безопасность

- Никогда не публикуйте `.env` файл
- Используйте `.gitignore` для `.env`
- Ограничьте доступ по Chat ID
- Регулярно обновляйте зависимости

```bash
npm audit
npm update
```

---

## Мониторинг

### Логи

```bash
tail -f logs/bot.log
```

### Статус

```bash
pm2 status
pm2 logs pc-bot
```

### Перезапуск

```bash
pm2 restart pc-bot
```
