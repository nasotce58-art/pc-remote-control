# 🖥️ PC Remote Control - Telegram Bot

Управление компьютером через Telegram бота с использованием Cloudflare Worker.

---

## 📋 Требования

- **Node.js 18+** (для бота и desktop приложения)
- **Telegram Bot Token** (получить у [@BotFather](https://t.me/BotFather))
- **Cloudflare Account** (для развертывания Worker)
- **Windows/Linux/macOS** (для desktop клиента)

---

## 🚀 Быстрый старт

### Шаг 1: Настройка Cloudflare Worker

1. Войдите в [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите в **Workers & Pages** → **Create Worker**
3. Назовите его `pc-remote-control`
4. Скопируйте код из `cloudflare-worker/src/index.ts` в редактор Worker
5. Создайте KV Namespaces:
   - `USERS_KV`
   - `DEVICES_KV`
   - `COMMANDS_KV`
   - `RESULTS_KV`
   - `PAIRING_KV`
6. Привяжите KV к Worker в настройках
7. Deploy Worker

### Шаг 2: Настройка Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте полученный токен

### Шаг 3: Конфигурация

#### Telegram Bot (Node.js)

```bash
cd telegram-bot-node
cp .env.example .env
```

Отредактируйте `.env`:

```env
BOT_TOKEN=ваш_токен_бота
CLOUDFLARE_WORKER_URL=https://pc-remote-control.ваш-username.workers.dev
ADMIN_CHAT_ID=ваш_chat_id_telegram
```

#### Desktop App

```bash
cd app/desktop
npm install
```

---

## ▶️ Запуск

### Telegram Бот

```bash
cd telegram-bot-node
npm start
```

### Desktop Приложение (Development)

```bash
cd app/desktop
npm run dev
```

### Desktop Приложение (Production)

```bash
cd app/desktop
npm run build
```

---

## 📱 Использование

### Первое подключение ПК

1. Запустите desktop приложение
2. Перейдите в **Настройки**
3. Введите **Worker URL**
4. Нажмите **Генерировать** для Device ID
5. Нажмите **Проверить подключение**
6. Нажмите **Сохранить настройки**

### Подключение через Telegram

1. Откройте вашего бота в Telegram
2. Отправьте `/start`
3. Отправьте `/connect ВАШ_DEVICE_ID`
4. Подтвердите подключение на ПК
5. Готово!

### Доступные команды

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню |
| `/connect DEVICE_ID` | Подключить ПК |
| `/unbind` | Отвязать ПК |
| `/help` | Справка |

### Кнопки управления

- **⚡ Рестарт** - Перезагрузка ПК
- **💤 Сон** - Спящий режим
- **⏹️ Выключить** - Выключение ПК
- **🔒 Блокировка** - Блокировка экрана
- **📊 Статус системы** - Информация о системе

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
├── telegram-bot-node/       # Telegram бот
│   ├── bot.js              # Основной файл бота
│   ├── functions/          # Модули функций
│   │   ├── power-control/  # Управление питанием
│   │   ├── monitoring/     # Мониторинг
│   │   ├── pairing-handler.js
│   │   └── ...
│   └── .env
│
├── cloudflare-worker/      # Cloudflare Worker
│   ├── src/index.ts       # API сервер
│   └── wrangler.toml
│
├── app/desktop/           # Desktop приложение
│   ├── main.js           # Electron main process
│   ├── src/
│   │   ├── cloudflare-client.js
│   │   ├── command-executor.js
│   │   └── components/
│   └── package.json
│
└── README.md             # Эта инструкция
```

---

## 🔧 Troubleshooting

### Бот не отвечает

1. Проверьте токен в `.env`
2. Убедитесь что Worker развернут
3. Проверьте логи: `npm start` в telegram-bot-node

### Desktop приложение не подключается

1. Проверьте Worker URL
2. Убедитесь что Device ID существует в KV
3. Проверьте firewall

### Ошибки KV

1. Убедитесь что все 5 KV namespaces созданы
2. Проверьте привязку KV к Worker
3. Пересоздайте Worker

---

## 🔐 Безопасность

- Все команды авторизуются через Telegram User ID
- Device ID уникален для каждого ПК
- Pairing требует подтверждения на ПК
- KV Storage шифруется Cloudflare

---

## 📝 Лицензия

MIT

---

## 🤝 Поддержка

Создайте issue в репозитории или обратитесь к разработчику.
# pc-remote-control
# pc-remote-control
# pc-remote-control
# pc-remote-control
# pc-remote-control
# pc-remote-control
# redeploy
