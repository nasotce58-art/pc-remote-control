# Cloudflare Worker - PC Remote Control

## Описание

Cloudflare Worker служит промежуточным слоем для управления подключением ПК к Telegram Bot через KV Storage.

## Требования

- Cloudflare Account
- Wrangler CLI
- Node.js 18+

## Установка Wrangler

```bash
npm install -g wrangler
```

## Конфигурация KV Namespaces

1. Создайте три KV Namespaces в Cloudflare Dashboard:
   - `USERS_KV` — хранение связей user_id → device_id
   - `DEVICES_KV` — информация о зарегистрированных устройствах
   - `COMMANDS_KV` — очередь команд для ПК

2. Обновите `wrangler.toml` с ID ваших namespaces:

```toml
[[kv_namespaces]]
binding = "USERS_KV"
id = "YOUR_USERS_KV_ID"

[[kv_namespaces]]
binding = "DEVICES_KV"
id = "YOUR_DEVICES_KV_ID"

[[kv_namespaces]]
binding = "COMMANDS_KV"
id = "YOUR_COMMANDS_KV_ID"
```

## Разработка локально

```bash
cd cloudflare-worker
npm install
npm run start
```

Worker будет доступен на `http://localhost:8787`

## Deployment

```bash
npm run deploy
```

## API Endpoints

### 1. Register Device
```
POST /api/register
Content-Type: application/json

{
  "deviceId": "DEVICE_ID_ABC123",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "osVersion": "Windows 11"
}

Response:
{
  "ok": true,
  "deviceToken": "uuid-v4"
}
```

### 2. Check User Device Link
```
GET /api/user/{userId}/device
X-User-Id: {userId}

Response:
{
  "ok": true,
  "deviceId": "DEVICE_ID_ABC123",
  "linked": true
}

// If not linked:
{
  "ok": true,
  "deviceId": null,
  "linked": false
}
```

### 3. Link User to Device
```
POST /api/user/{userId}/link/{deviceId}

Response:
{
  "ok": true,
  "message": "Device linked successfully"
}
```

## KV Storage Schema

### USERS_KV
```
Key: user:{userId}
Value: {
  "userId": 5649053560,
  "deviceId": "DEVICE_ID_ABC123",
  "linkedAt": "2026-02-15T12:00:00Z"
}
```

### DEVICES_KV
```
Key: device:{deviceId}
Value: {
  "deviceId": "DEVICE_ID_ABC123",
  "deviceToken": "uuid-v4",
  "registeredAt": "2026-02-15T12:00:00Z",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "osVersion": "Windows 11"
}
```

### COMMANDS_KV (future)
```
Key: command:{deviceId}:{commandId}
Value: {
  "id": "uuid-v4",
  "type": "shutdown",
  "status": "pending",
  ...
}
```

## Тестирование

### cURL примеры

#### Register Device
```bash
curl -X POST https://your-worker.your-domain.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TEST_DEVICE_001",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "osVersion": "Windows 11"
  }'
```

#### Check User Device
```bash
curl -X GET https://your-worker.your-domain.workers.dev/api/user/5649053560/device
```

#### Link User to Device
```bash
curl -X POST https://your-worker.your-domain.workers.dev/api/user/5649053560/link/TEST_DEVICE_001
```

## Безопасность

- Все endpoints возвращают CORS headers
- Валидация входных данных на каждом endpoint
- Будущие версии добавят HMAC-SHA256 подписи для POST requests
