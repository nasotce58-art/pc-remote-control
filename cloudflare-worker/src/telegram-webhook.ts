/**
 * Telegram Webhook Handler for Cloudflare Worker
 * Обрабатывает входящие сообщения от Telegram Bot API
 */

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; username?: string };
  };
  callback_query?: {
    id: string;
    message: { chat: { id: number } };
    data?: string;
    from?: { id: number };
  };
}

interface Env {
  BOT_TOKEN: string;
  USERS_KV: KVNamespace;
  DEVICES_KV: KVNamespace;
  COMMANDS_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Обработка webhook от Telegram
    if (url.pathname === '/telegram/webhook' && request.method === 'POST') {
      return await handleTelegramWebhook(request, env);
    }
    
    // Установка webhook
    if (url.pathname === '/telegram/set-webhook' && request.method === 'POST') {
      return await handleSetWebhook(request, env);
    }
    
    // Удаление webhook
    if (url.pathname === '/telegram/remove-webhook' && request.method === 'POST') {
      return await handleRemoveWebhook(env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('Telegram update:', JSON.stringify(update));
    
    // Обработка сообщений
    if (update.message) {
      await handleMessage(update.message, env);
    }
    
    // Обработка callback query (кнопки)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, env);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleMessage(message: any, env: Env): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from?.id;
  
  console.log(`Message from ${userId}: ${text}`);
  
  // Команда /start
  if (text === '/start') {
    await sendMessage(chatId, '🖥️ <b>PC Remote Control</b>\n\nБот готов к работе!', env);
    return;
  }
  
  // Команда /stats (только для админа)
  if (text === '/stats') {
    const adminId = parseInt(env.BOT_TOKEN.split(':')[0]); // Заглушка
    if (userId === adminId) {
      await sendMessage(chatId, '📊 Статистика будет здесь', env);
    } else {
      await sendMessage(chatId, '❌ Доступ запрещен', env);
    }
    return;
  }
  
  // Команда /broadcast (только для админа)
  if (text === '/broadcast') {
    const adminId = parseInt(env.BOT_TOKEN.split(':')[0]);
    if (userId === adminId) {
      await sendMessage(chatId, '📢 Отправьте сообщение для рассылки', env);
    } else {
      await sendMessage(chatId, '❌ Доступ запрещен', env);
    }
    return;
  }
}

async function handleCallbackQuery(callbackQuery: any, env: Env): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  console.log(`Callback from ${chatId}: ${data}`);
  
  // Обработка кнопок
  if (data === 'restart_pc') {
    await answerCallbackQuery(callbackQuery.id, '⚡ Перезагрузка...', env);
    await sendMessage(chatId, '⚡ ПК перезагружается...', env);
  } else if (data === 'sleep_pc') {
    await answerCallbackQuery(callbackQuery.id, '💤 Спящий режим...', env);
    await sendMessage(chatId, '💤 ПК переходит в спящий режим...', env);
  } else if (data === 'shutdown_pc') {
    await answerCallbackQuery(callbackQuery.id, '⏹️ Выключение...', env);
    await sendMessage(chatId, '⏹️ ПК выключается...', env);
  }
}

async function sendMessage(chatId: number, text: string, env: Env): Promise<void> {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string, env: Env): Promise<void> {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text
    })
  });
}

async function handleSetWebhook(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { webhookUrl?: string };
  const { webhookUrl } = body;
  
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl
    })
  });
  
  const result = await response.json();
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRemoveWebhook(env: Env): Promise<Response> {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`;
  
  const response = await fetch(url, { method: 'POST' });
  const result = await response.json();
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
