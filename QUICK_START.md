# 🚀 БЫСТРЫЙ СТАРТ - PC Remote Control

## 5 минут до запуска

### 1. Cloudflare Worker (2 минуты)

```bash
# Установите wrangler
npm install -g wrangler

# Войдите в Cloudflare
wrangler login

# Создайте KV namespace
wrangler kv:namespace create "USERS_KV"
wrangler kv:namespace create "DEVICES_KV"
wrangler kv:namespace create "COMMANDS_KV"
wrangler kv:namespace create "RESULTS_KV"
wrangler kv:namespace create "PAIRING_KV"

# Запишите ID из вывода и обновите wrangler.toml

# Разверните Worker
cd cloudflare-worker
wrangler deploy
```

**Результат:** Вы получите URL вида `https://pc-remote-control.ваш-username.workers.dev`

---

### 2. Telegram Бот (1 минута)

```bash
# Получите токен у @BotFather в Telegram
# Получите Chat ID у @userinfobot

# Настройте .env
cd ../telegram-bot-node
cp .env.example .env

# Отредактируйте .env:
# BOT_TOKEN=ваш_токен
# CLOUDFLARE_WORKER_URL=https://...workers.dev
# ADMIN_CHAT_ID=ваш_chat_id

# Запустите бота
npm install
npm start
```

**Результат:** Бот запущен и готов к работе

---

### 3. Desktop Приложение (2 минуты)

```bash
# Установите зависимости
cd ../app/desktop
npm install

# Запустите
npm run dev
```

**Настройка в приложении:**
1. Откройте **Настройки**
2. Введите **Worker URL** (из шага 1)
3. Нажмите **Генерировать** Device ID
4. Нажмите **Проверить подключение**
5. Нажмите **Сохранить**

**Результат:** Приложение готово к работе

---

### 4. Подключение Telegram к ПК (30 секунд)

1. Откройте бота в Telegram
2. Отправьте `/connect ВАШ_DEVICE_ID`
3. Подтвердите подключение в приложении на ПК
4. Готово!

---

## Проверка работы

### Telegram → ПК

1. Нажмите **⚡ Рестарт** в боте
2. ПК должен начать перезагрузку

### ПК → Telegram

1. Статус в боте должен быть **🟢 Online**
2. Команда `/start` показывает панель управления

---

## Структура проекта

```
c:\conrol pc/
├── cloudflare-worker/     # API сервер (Cloudflare)
├── telegram-bot-node/     # Telegram бот (Node.js)
├── app/desktop/          # Desktop приложение (Electron)
└── README.md             # Полная документация
```

---

## Команды

| Где | Команда | Что делает |
|-----|---------|------------|
| Telegram | `/start` | Главное меню |
| Telegram | `/connect XXXX-XXXX` | Подключить ПК |
| Telegram | `/help` | Справка |
| Desktop | Настройки | Конфигурация |

---

## Troubleshooting

### Бот не запускается
```bash
cd telegram-bot-node
cat .env  # Проверьте токен
npm start # Смотрите ошибки
```

### Worker не работает
```bash
cd cloudflare-worker
wrangler deploy --dry  # Проверка
wrangler tail          # Логи
```

### Desktop не подключается
1. Проверьте Worker URL
2. Проверьте что Device ID существует
3. Перезапустите приложение

---

## Следующие шаги

1. ✅ Настроить автозапуск бота (PM2)
2. ✅ Собрать desktop приложение в EXE
3. ✅ Добавить новые команды
4. ✅ Настроить уведомления

---

## Документация

- **Полная:** `README.md`
- **Worker:** `cloudflare-worker/DEPLOYMENT.md`
- **Бот:** `telegram-bot-node/README.md`
- **Desktop:** `app/desktop/README.md`

---

## Поддержка

При проблемах:
1. Проверьте логи
2. Убедитесь что все 5 KV namespace созданы
3. Проверьте что Worker URL правильный
4. Перечитайте эту инструкцию 😊

**Всё должно работать!** 🎉
