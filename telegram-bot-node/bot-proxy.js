require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Proxy configuration
const USE_PROXY = process.env.USE_PROXY === 'true';
const PROXY_TYPE = process.env.PROXY_TYPE || 'socks5'; // socks5 или http
const PROXY_URL = process.env.PROXY_URL || 'socks5://127.0.0.1:1080';

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

console.log('🤖 PC REMOTE CONTROL BOT');
console.log('═══════════════════════════════════════════════════════');
console.log(`BOT_TOKEN: ${BOT_TOKEN.substring(0, 20)}...`);
console.log(`WORKER_URL: ${CLOUDFLARE_WORKER_URL}`);
console.log(`ADMIN_CHAT_ID: ${ADMIN_CHAT_ID}`);

if (USE_PROXY) {
  console.log(`PROXY: ${PROXY_TYPE} → ${PROXY_URL}`);
  console.log('⚠️  Using proxy for Telegram API');
}

// Setup proxy if enabled
let botOptions = {};

if (USE_PROXY) {
  const { SocksProxyAgent } = require('socks-proxy-agent');
  const https = require('https');
  
  const agent = new SocksProxyAgent(PROXY_URL);
  
  botOptions = {
    telegram: {
      agent: agent,
      apiRoot: 'https://api.telegram.org'
    }
  };
  
  console.log('✅ Proxy configured for bot');
}

const bot = new Telegraf(BOT_TOKEN, botOptions);

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
  
  if (err.message.includes('ETIMEDOUT') || err.message.includes('Network')) {
    console.error('\n⚠️  ERROR: Cannot connect to Telegram API');
    console.error('\nPossible solutions:');
    console.error('1. Use VPN to bypass firewall');
    console.error('2. Configure SOCKS proxy:');
    console.error('   npm install socks-proxy-agent');
    console.error('   Then add to .env:');
    console.error('   USE_PROXY=true');
    console.error('   PROXY_URL=socks5://127.0.0.1:1080');
    console.error('3. Check firewall settings');
  }
  
  process.exit(1);
});
