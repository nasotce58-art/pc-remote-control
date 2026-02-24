# 📦 Cloudflare Worker - Инструкция по развертыванию

## Требования

- Аккаунт Cloudflare (бесплатного достаточно)
- Wrangler CLI (`npm install -g wrangler`)
- Node.js 18+

---

## Шаг 1: Установка Wrangler

```bash
npm install -g wrangler
```

## Шаг 2: Аутентификация

```bash
wrangler login
```

Откроется браузер для входа в Cloudflare.

## Шаг 3: Создание KV Namespaces

Выполните команды по очереди:

```bash
wrangler kv:namespace create "USERS_KV"
wrangler kv:namespace create "DEVICES_KV"
wrangler kv:namespace create "COMMANDS_KV"
wrangler kv:namespace create "RESULTS_KV"
wrangler kv:namespace create "PAIRING_KV"
```

Запишите ID каждого namespace (выведется в консоли).

## Шаг 4: Обновление wrangler.toml

Откройте `wrangler.toml` и замените ID namespace на ваши:

```toml
[[kv_namespaces]]
binding = "USERS_KV"
id = "ВАШ_ID_ИЗ_ШАГА_3"

[[kv_namespaces]]
binding = "DEVICES_KV"
id = "ВАШ_ID_ИЗ_ШАГА_3"

# ... и так далее для всех 5
```

## Шаг 5: Развертывание Worker

```bash
cd cloudflare-worker
wrangler deploy
```

После успешного развертывания вы увидите URL Worker.

## Шаг 6: Проверка

Откройте в браузере:

```
https://ВАШ_WORKER.workers.dev/api/register
```

Должны увидеть:

```json
{"ok":false,"error":"Missing required fields"}
```

Это нормально - значит API работает.

---

## Локальное тестирование

```bash
cd cloudflare-worker
wrangler dev
```

Worker запустится на `http://localhost:8787`

---

## Обновление Worker

После изменений в коде:

```bash
wrangler deploy
```

---

## Мониторинг

### Логи в реальном времени

```bash
wrangler tail
```

### Просмотр KV данных

```bash
wrangler kv:key list --namespace-id=ВАШ_ID
```

---

## Troubleshooting

### Ошибка: "namespace not found"

1. Проверьте что KV namespace создан
2. Проверьте ID в wrangler.toml
3. Перезапустите `wrangler dev`

### Ошибка: "unauthorized"

```bash
wrangler logout
wrangler login
```

### Worker не отвечает

1. Проверьте статус в Cloudflare Dashboard
2. Проверьте логи: `wrangler tail`
3. Убедитесь что deployment успешен

---

## Стоимость

Бесплатный план Cloudflare Workers включает:

- 100,000 запросов/день
- 10ms CPU time/запрос
- 30 секунд wall time/запрос
- KV Storage: 1GB хранилище, 100K чтений/день

Для личного использования достаточно бесплатного плана.
