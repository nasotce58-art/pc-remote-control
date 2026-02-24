# Архитектура Telegram-бота с Device Pairing

## Обзор системы

Telegram-бот работает с тремя компонентами:
1. **Telegram Bot** - взаимодействует с пользователем
2. **Desktop App** - управляет ПК, показывает подтверждение pairing
3. **Cloudflare Worker** - хранилище и брокер сообщений

## Модули Telegram-бота

### 1. **device-storage.js**
Управление привязками устройств через Worker KV Storage.

**API методы:**
- `linkUserToDevice(userId, deviceId, username)` - привязать пользователя к устройству
- `checkUserDevice(userId)` - проверить привязанное устройство
- `unlinkUser(userId)` - отвязать пользователя
- `checkDeviceStatus(deviceId)` - проверить статус устройства
- `isValidDeviceId(deviceId)` - валидировать формат Device ID (XXXX-XXXX)

**Хранилище (Worker KV):**
```
user:{userId} → {deviceId, timestamp}
device:{deviceId} → {boundUserId, status, lastSeen}
```

### 2. **pairing-handler.js**
Обработка команды `/connect XXXX-XXXX` для инициирования pairing.

**Поток:**
1. Пользователь отправляет `/connect X7K9-LP21`
2. Валидация формата Device ID
3. Проверка, что пользователь ещё не привязан
4. Отправка паiring-запроса в Desktop App через Worker API
5. **Polling** результата подтверждения (120 секунд)
6. При подтверждении - отправка Dashboard, при отказе - уведомление об ошибке

**Endpoints:**
- `POST /api/pairing/request` - инициировать pairing
- `GET /api/pairing/result` - получить результат подтверждения

### 3. **unbind-handler.js**
Обработка команды `/unbind` для отвязки устройства.

**Поток:**
1. Пользователь отправляет `/unbind`
2. Проверка, что пользователь привязан к устройству
3. Запрос подтверждения отвязки (inline кнопка)
4. При подтверждении - отправка запроса в Desktop и удаление привязки
5. Уведомление пользователю об успехе

**Callbacks:**
- `confirm_unbind_{deviceId}` - подтвердить отвязку
- `cancel_unbind` - отменить отвязку

### 4. **command-dispatcher.js**
Отправка команд от пользователя на Desktop App с проверкой авторизации.

**Поток:**
1. Пользователь нажимает кнопку (e.g., "Рестарт")
2. Проверка: `user_id` совпадает с привязанным на `device_id`?
3. Если да - отправка команды на Desktop через Worker API
4. Получение результата выполнения
5. Отправка результата пользователю

**Методы команд:**
- `sendPowerCommand(userId, deviceId, action)` - restart, sleep, shutdown, wake
- `sendMonitorCommand(userId, deviceId, state)` - monitor on/off
- `sendVolumeCommand(userId, deviceId, action, level)` - volume up/down/mute
- `getSystemStatus(userId, deviceId)` - CPU, RAM, Battery, Network
- `getScreenshot(userId, deviceId)` - получить скриншот
- `getClipboard(userId, deviceId)` - получить буфер обмена
- `setClipboard(userId, deviceId, content)` - установить буфер обмена
- `getProcessList(userId, deviceId)` - список процессов
- `killProcess(userId, deviceId, pid)` - завершить процесс
- `launchProgram(userId, deviceId, programPath)` - запустить программу

**Endpoint:**
- `POST /api/device/{deviceId}/command` - отправить команду

### 5. **pairing-confirmation-bridge.js**
Мост для обмена сообщениями между Desktop App и Bot при подтверждении pairing.

**Поток:**
1. Bot отправляет паiring-запрос на Desktop (через pairing-handler)
2. Desktop показывает диалог подтверждения пользователю
3. Пользователь нажимает "Да" или "Нет" на Desktop
4. Desktop App вызывает `setPairingResult()` через Worker API
5. Bot polling'ит `getPairingResult()` и получает ответ
6. Bot уведомляет Telegram-пользователя о результате

**Методы:**
- `setPairingResult(deviceId, userId, confirmed, reason)` - отправить результат (Desktop)
- `getPairingResult(deviceId, userId)` - получить результат (Bot)
- `registerPairingRequest(deviceId, userId, username)` - зарегистрировать запрос
- `getPendingConfirmation(deviceId)` - получить ожидающий запрос (Desktop)
- `cleanupExpiredRequests(timeoutMs)` - удалить истекшие запросы

**Endpoints:**
- `POST /api/pairing/result` - отправить результат подтверждения
- `GET /api/pairing/result` - получить результат подтверждения
- `POST /api/pairing/register` - зарегистрировать запрос
- `GET /api/pairing/pending` - получить ожидающий запрос

## Логика взаимодействия

### Сценарий 1: Новый пользователь подключается к ПК

```
1. Пользователь → /start
   Bot: "У вас нет привязанного ПК. Введите /connect XXXX-XXXX"

2. Пользователь → /connect X7K9-LP21
   ↓
   Bot валидирует формат
   ↓
   Bot → Worker API: POST /api/pairing/request
     {deviceId, userId, username}
   ↓
   Worker отправляет request на Desktop через KV Storage
   ↓
   Desktop PollingService получает запрос
   ↓
   Desktop показывает диалог:
     "Пользователь @username хочет подключиться. Разрешить?"
     [Да] [Нет]

3. Пользователь ПК нажимает "Да"
   ↓
   Desktop → Worker API: POST /api/pairing/result
     {deviceId, userId, confirmed: true}
   ↓
   Worker сохраняет результат

4. Bot polling'ит результат
   ↓
   Bot получает confirmed: true
   ↓
   Bot → Worker API: POST /api/link-device
     {userId, deviceId, username}
   ↓
   Worker создаёт привязку

5. Bot → Пользователь:
   "✅ Подключение выполнено!"
   Отправляет Dashboard с кнопками
```

### Сценарий 2: Привязанный пользователь выполняет команду

```
1. Пользователь нажимает кнопку "Рестарт"
   ↓
   Bot проверяет:
     - User привязан к этому Device?
     - User ID совпадает с Device.boundUserId?
   ↓
   Если ДА → Bot → Worker API: POST /api/device/{deviceId}/command
     {commandType: 'restart', userId, timestamp}
   ↓
   Worker отправляет команду на Desktop

2. Desktop PollingService получает команду
   ↓
   Desktop проверяет:
     - Command.userId совпадает с SessionManager.BoundUserId?
     - SecurityValidator пройдена?
     - UpdateTracker не дублирует?
   ↓
   Если ДА → выполняет команду
   ↓
   Desktop отправляет результат: {success: true, message: "ПК перезагружается"}

3. Bot получает результат
   ↓
   Bot → Пользователь: "⚡ ПК перезагружается..."
```

### Сценарий 3: Пользователь отвязывается

```
1. Пользователь → /unbind
   ↓
   Bot проверяет, что привязан
   ↓
   Bot показит: "Вы действительно отвязать ПК?"
     [Да, отвязать] [Отмена]

2. Пользователь нажимает "Да, отвязать"
   ↓
   Bot → Worker API: DELETE /api/unlink-device
     {userId}
   ↓
   Bot → Worker API: POST /api/device/{deviceId}/unbind
     {userId} - уведомить Desktop

3. Desktop PollingService получает запрос unbind
   ↓
   Desktop SessionManager:
     - Проверяет, что userId совпадает
     - Revoke session
     - Очищает привязку

4. Bot → Пользователь: "✅ ПК успешно отвязан"
```

## Worker API Endpoints

### Pairing Endpoints

```
POST /api/pairing/request
  Input: {deviceId, telegramUserId, telegramUsername, timestamp}
  Output: {success, error?}

GET /api/pairing/result?deviceId=X&userId=Y
  Output: {confirmed, denied, expired, pending}

POST /api/pairing/result
  Input: {deviceId, telegramUserId, confirmed, denied, reason?, timestamp}
  Output: {success}

POST /api/pairing/register
  Input: {deviceId, telegramUserId, telegramUsername, timestamp}
  Output: {success}

GET /api/pairing/pending?deviceId=X
  Output: {pending, telegramUserId?, telegramUsername?}
```

### Device Management Endpoints

```
GET /api/user/{userId}/device
  Output: {linked, deviceId?, status?}

POST /api/link-device
  Input: {telegramUserId, telegramUsername, deviceId, timestamp}
  Output: {success, sessionToken?, error?}

DELETE /api/unlink-device
  Input: {telegramUserId}
  Output: {success, error?}

GET /api/device/{deviceId}/status
  Output: {online, lastSeen?, boundUser?}

POST /api/device/{deviceId}/unbind
  Input: {telegramUserId, telegramUsername, timestamp}
  Output: {success, error?}
```

### Command Endpoints

```
POST /api/device/{deviceId}/command
  Input: {commandType, parameters?, telegramUserId, timestamp}
  Output: {success, message?, data?, error?}
```

## Безопасность

### На уровне Bot:
1. ✅ Проверка user привязан ли к device перед отправкой команды
2. ✅ Логирование всех попыток подключения и команд
3. ✅ Device ID одноразовый для pairing (с timeout 120 сек)
4. ✅ Паролей/токенов не в коде (только в Worker KV)

### На уровне Desktop (PollingService):
1. ✅ SessionManager проверяет user_id
2. ✅ SecurityValidator 7-слойная валидация
3. ✅ UpdateTracker защита от replay-атак
4. ✅ Диалог подтверждения на уровне UI

### На уровне Worker:
1. ✅ Привязка user_id → device_id в KV Storage
2. ✅ Сессионные токены (если реализованы)
3. ✅ Audit logging всех операций

## Переменные окружения

```env
BOT_TOKEN=123456:ABC...
CLOUDFLARE_WORKER_URL=https://worker.example.com
ADMIN_CHAT_ID=12345678
```

## Зависимости

```json
{
  "telegraf": "^4.14.0",
  "axios": "^1.6.0",
  "dotenv": "^16.0.0"
}
```

## Инициализация в bot.js

```javascript
const deviceStorage = createDeviceStorage(CLOUDFLARE_WORKER_URL);
const commandDispatcher = createCommandDispatcher(CLOUDFLARE_WORKER_URL);
const pairingBridge = createPairingBridge(CLOUDFLARE_WORKER_URL);

registerPairingHandler(bot, CLOUDFLARE_WORKER_URL);
registerUnbindHandler(bot, CLOUDFLARE_WORKER_URL);
```

Все модули проектированы для полной интеграции с Desktop App через Long Polling и Worker API.
