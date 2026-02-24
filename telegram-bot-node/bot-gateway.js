require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID);

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!CLOUDFLARE_WORKER_URL) {
  console.error('ERROR: CLOUDFLARE_WORKER_URL not set in .env');
  process.exit(1);
}

console.log('🤖 PC REMOTE CONTROL BOT - TELEGRAM GATEWAY MODE');
console.log('═══════════════════════════════════════════════════════');
console.log(`BOT_TOKEN: ${BOT_TOKEN.substring(0, 20)}...`);
console.log(`WORKER_URL: ${CLOUDFLARE_WORKER_URL}`);
console.log(`ADMIN_CHAT_ID: ${ADMIN_CHAT_ID}`);
console.log('');

// Custom axios instance with timeout and retry logic
const telegramAPI = axios.create({
  timeout: 15000,
  maxRetries: 3,
  retryDelay: 1000
});

// Retry interceptor
telegramAPI.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (!config || !config.maxRetries) {
      return Promise.reject(error);
    }
    
    config.retryCount = config.retryCount || 0;
    
    if (config.retryCount >= config.maxRetries) {
      return Promise.reject(error);
    }
    
    config.retryCount += 1;
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    
    return telegramAPI(config);
  }
);

// Try multiple Telegram API endpoints (mirrors and gateways)
const TELEGRAM_ENDPOINTS = [
  'https://api.telegram.org',
  'https://api5.telegram.org',  // Alternative endpoint
  'https://api6.telegram.org',  // Another alternative
];

let currentEndpointIndex = 0;

async function getTelegramEndpoint() {
  const endpoint = TELEGRAM_ENDPOINTS[currentEndpointIndex];
  console.log(`🌐 Trying Telegram endpoint: ${endpoint}`);
  return endpoint;
}

async function callTelegramAPI(method, data) {
  for (let i = 0; i < TELEGRAM_ENDPOINTS.length; i++) {
    try {
      const endpoint = TELEGRAM_ENDPOINTS[i];
      const url = `${endpoint}/bot${BOT_TOKEN}/${method}`;
      
      console.log(`[API] POST ${method} to ${endpoint}`);
      
      const response = await telegramAPI.post(url, data, {
        timeout: 10000,
        maxRetries: 2
      });
      
      currentEndpointIndex = i; // Remember working endpoint
      return response.data;
    } catch (error) {
      console.log(`⚠️  Endpoint ${TELEGRAM_ENDPOINTS[i]} failed: ${error.message}`);
      
      if (i === TELEGRAM_ENDPOINTS.length - 1) {
        throw error; // All endpoints failed
      }
    }
  }
}

// Create bot with custom agent
const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    apiRoot: 'https://api.telegram.org',
    request: {
      timeout: 30000,
      agent: null // Let Node.js choose
    }
  }
});

// Override the API calls to use our custom endpoint logic
bot.telegram.callApi = async function(method, data = {}) {
  try {
    console.log(`[Telegram API] ${method}`);
    return await callTelegramAPI(method, data);
  } catch (error) {
    console.error(`[Telegram API ERROR] ${method}: ${error.message}`);
    throw error;
  }
};

// Middleware to log all updates
bot.use((ctx, next) => {
  console.log(`Update type: ${ctx.updateType}, from: ${ctx.from?.id} ${ctx.from?.first_name}`);
  return next();
});

// Command: /start
bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  
  console.log(`[/start] User ID: ${userId}`);

  try {
    // Check if user has linked device via Worker API
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`);
    const { linked, deviceId } = checkDeviceResponse.data;

    if (linked && deviceId) {
      // Device is linked
      console.log(`[/start] User ${userId} has device: ${deviceId}`);
      
      await ctx.reply(
        `✅ ПК подключён\n\nID устройства: ${deviceId}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Статус ПК', callback_data: 'status_pc' }],
              [{ text: '🔌 Отключить ПК', callback_data: 'disconnect_pc' }]
            ]
          }
        }
      );
    } else {
      // Device is not linked
      console.log(`[/start] User ${userId} has no device linked`);
      
      await ctx.reply(
        '❌ ПК не подключён\n\nНажмите кнопку ниже, чтобы подключить ПК к боту.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Подключить ПК', callback_data: 'connect_pc' }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error('[/start] Error checking device:', error.message);
    
    await ctx.reply(
      '⚠️ Ошибка подключения к серверу.\n\nПопробуйте позже.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Подключить ПК', callback_data: 'connect_pc' }]
          ]
        }
      }
    );
  }
});

// Handler: callback_query for all button actions
bot.on('callback_query', async (ctx) => {
  const userId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;

  console.log(`[callback] User: ${userId}, Action: ${callbackData}`);

  try {
    if (callbackData === 'connect_pc') {
      await handleConnectPC(ctx, userId);
    } else if (callbackData === 'status_pc') {
      await handleStatusPC(ctx, userId);
    } else if (callbackData === 'disconnect_pc') {
      await handleDisconnectPC(ctx, userId);
    } else {
      await ctx.answerCbQuery('❓ Неизвестное действие');
    }
  } catch (error) {
    console.error('[callback] Error:', error.message);
    await ctx.answerCbQuery('⚠️ Ошибка обработки');
  }
});

// Function: Connect PC
async function handleConnectPC(ctx, userId) {
  console.log(`[connectPC] Starting pairing for user ${userId}`);

  const pairingInstructions = `
📲 Инструкция подключения:

1. Установите ПК-клиент на компьютер
2. При первом запуске скопируйте Device ID
3. Отправьте мне Device ID в формате:
   /pair DEVICE_ID

Пример:
/pair abc123def456
`;

  await ctx.reply(pairingInstructions);
  await ctx.answerCbQuery('✅ Инструкция отправлена');
}

// Function: Get PC Status
async function handleStatusPC(ctx, userId) {
  console.log(`[statusPC] Getting status for user ${userId}`);

  try {
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (deviceId) {
      const statusMessage = `
📊 Статус ПК:
━━━━━━━━━━━━━━━━━
🆔 Device ID: ${deviceId}
✅ Статус: Ожидание подключения
💾 ОЗУ: —
🔋 Батарея: —
🌐 Сеть: —
`;
      await ctx.reply(statusMessage);
    } else {
      await ctx.reply('❌ ПК не подключён');
    }
  } catch (error) {
    console.error('[statusPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка получения статуса');
  }

  await ctx.answerCbQuery();
}

// Function: Disconnect PC
async function handleDisconnectPC(ctx, userId) {
  console.log(`[disconnectPC] Disconnecting device for user ${userId}`);

  try {
    await ctx.reply('⚠️ ПК отключен от аккаунта');
    
    await ctx.reply(
      '❌ ПК не подключён\n\nНажмите кнопку ниже, чтобы подключить ПК к боту.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Подключить ПК', callback_data: 'connect_pc' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('[disconnectPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отключения');
  }

  await ctx.answerCbQuery();
}

// Command: /pair (for manual pairing with device ID)
bot.command('pair', async (ctx) => {
  const userId = ctx.from?.id;
  const args = ctx.payload;

  console.log(`[/pair] User: ${userId}, Device ID: ${args}`);

  if (!args || args.length < 5) {
    await ctx.reply('❌ Неверный формат. Использование: /pair DEVICE_ID');
    return;
  }

  try {
    const linkResponse = await axios.post(
      `${CLOUDFLARE_WORKER_URL}/api/user/${userId}/link/${args}`
    );

    if (linkResponse.data.ok) {
      console.log(`[/pair] Successfully linked user ${userId} to device ${args}`);
      
      await ctx.reply(
        `✅ ПК успешно подключён!\n\nDevice ID: ${args}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Статус ПК', callback_data: 'status_pc' }],
              [{ text: '🔌 Отключить ПК', callback_data: 'disconnect_pc' }]
            ]
          }
        }
      );
    } else {
      await ctx.reply(`❌ Ошибка: ${linkResponse.data.error}`);
    }
  } catch (error) {
    console.error('[/pair] Error:', error.message);
    
    if (error.response?.status === 404) {
      await ctx.reply('❌ Device ID не найден. Проверьте корректность ID.');
    } else {
      await ctx.reply('⚠️ Ошибка подключения к серверу. Попробуйте позже.');
    }
  }
});

// Command: /help
bot.command('help', async (ctx) => {
  const helpMessage = `
🤖 PC Remote Control Bot

Доступные команды:
/start — главное меню
/pair DEVICE_ID — подключить ПК
/help — справка

Кнопки:
• 📊 Статус ПК — информация о компьютере
• 🔌 Отключить ПК — разорвать связь с ботом
• 🔗 Подключить ПК — инструкция подключения
`;

  await ctx.reply(helpMessage);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('🚨 Bot error:', err);
  ctx.reply('⚠️ Произошла ошибка. Попробуйте позже.').catch(err => {
    console.error('Failed to send error message:', err);
  });
});

// Process signals
process.on('SIGINT', () => {
  console.log('\n✋ Bot stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n✋ Bot stopped');
  process.exit(0);
});

// Launch bot
bot.launch().then(() => {
  console.log('🤖 Bot started successfully');
  console.log(`📍 CLOUDFLARE_WORKER_URL: ${CLOUDFLARE_WORKER_URL}`);
  console.log(`👤 ADMIN_CHAT_ID: ${ADMIN_CHAT_ID}`);
  console.log('\n✅ Bot is running and waiting for messages...\n');
}).catch(err => {
  console.error('❌ Failed to launch bot:', err.message);
  console.error('\nIf you still see ETIMEDOUT errors, try:');
  console.error('1. Use VPN to bypass firewall');
  console.error('2. Check internet connection');
  console.error('3. Try bot-test.js for local testing');
  process.exit(1);
});
