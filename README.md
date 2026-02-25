# 🖥️ PC Remote Control v2.0

Управление компьютером через Telegram бота с использованием Cloudflare Worker.

---

## 🚀 Быстрый старт

### 1. Cloudflare Worker

```bash
cd cloudflare-worker
wrangler deploy
```

URL после деплоя: `https://your-worker.workers.dev`

### 2. Telegram Bot

Создайте `.env` в корне проекта:

```env
BOT_TOKEN=your_bot_token
CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev
ADMIN_CHAT_ID=your_chat_id
```

Запуск:

```bash
cd telegram-bot-node
npm install
npm start
```

### 3. Desktop Приложение

```bash
cd app/desktop
npm install
npm run dev
```

Откройте: http://localhost:5173

---

## 📱 Telegram Bot

### Команды:

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню с кнопками |
| `/connect DEVICE_ID` | Подключить ПК |
| `/unbind` | Отвязать ПК |
| `/stats` | Статистика (админ) |
| `/help` | Справка |

### Кнопки:

- ⚡ **Рестарт** - Перезагрузка ПК
- 💤 **Сон** - Спящий режим
- ⏹️ **Выключить** - Выключение ПК
- 🔒 **Блокировка** - Блокировка экрана
- 📊 **Статус** - Статус системы
- 🔌 **Отвязать** - Отвязать ПК

---

## 🖥️ Desktop Приложение

### Настройка:

1. Откройте http://localhost:5173
2. Введите **Worker URL**
3. Введите **Device ID** (или сгенерируйте)
4. Нажмите **Сохранить**

Приложение автоматически отправляет heartbeat каждые 30 секунд.

---

## 🏗️ Архитектура

```
┌─────────────────┐
│  Telegram Bot   │
│   (Node.js)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Cloudflare      │
│ Worker          │
│  (API + KV)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Desktop App    │
│ (Electron +     │
│  React)         │
└─────────────────┘
```

---

## 📁 Структура проекта

```
c:\conrol pc/
├── telegram-bot-node/     # Telegram бот
│   ├── bot.js            # Основной файл
│   └── package.json
│
├── cloudflare-worker/     # Cloudflare Worker
│   ├── src/index.ts      # API сервер
│   └── wrangler.toml
│
├── app/desktop/          # Desktop приложение
│   ├── public/index.html # UI
│   ├── main.js          # Electron
│   └── package.json
│
└── README.md             # Эта инструкция
```

---

## 🔧 Настройка

### 1. Получите токен бота

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/newbot`
3. Скопируйте токен

### 2. Разверните Cloudflare Worker

```bash
cd cloudflare-worker
wrangler login
wrangler deploy
```

### 3. Настройте .env

```env
BOT_TOKEN=8433887802:YOUR_TOKEN
CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev
ADMIN_CHAT_ID=your_chat_id
```

### 4. Запустите бота

```bash
cd telegram-bot-node
npm install
npm start
```

### 5. Запустите Desktop

```bash
cd app/desktop
npm install
npm run dev
```

---

## ✅ Проверка работы

1. **Откройте бота** в Telegram
2. **`/start`** - должны появиться кнопки
3. **Откройте Desktop** приложение
4. **Сохраните настройки** (Worker URL + Device ID)
5. **`/connect DEVICE_ID`** в боте
6. **Нажмите кнопки** в боте - ПК должен реагировать!

---

## 🐛 Troubleshooting

### Бот не отвечает

1. Проверьте токен в `.env`
2. Проверьте логи Railway/локально
3. Убедитесь что Worker доступен

### Desktop не подключается

1. Проверьте Worker URL
2. Проверьте Device ID
3. Посмотрите логи в приложении

### Ошибка 404

1. Проверьте что Worker развернут
2. Проверьте URL в `.env`
3. Пересоздайте KV namespaces

---

## 📊 API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/register` | POST | Регистрация устройства |
| `/api/device/{id}/heartbeat` | POST | Heartbeat |
| `/api/device/{id}/status` | GET | Статус устройства |
| `/api/user/{id}/device` | GET | Устройство пользователя |
| `/api/user/{id}/link/{deviceId}` | POST | Привязка устройства |
| `/api/user/{id}/unlink` | DELETE | Отвязка устройства |
| `/api/commands/{deviceId}` | POST | Отправка команды |
| `/api/users/stats` | GET | Статистика |
| `/api/users/list` | GET | Список пользователей |

---

## 🎯 Команды ПК

| Команда | Описание |
|---------|----------|
| `restart` | Перезагрузка |
| `shutdown` | Выключение |
| `sleep` | Спящий режим |
| `lock` | Блокировка |
| `system_stats` | Статус системы |

---

## 📝 Лицензия

MIT

---

## 🤝 Поддержка

Создайте issue в репозитории.
