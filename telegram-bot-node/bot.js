/**
 * PC Remote Control - Telegram Bot с прокси поддержкой
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID);

// Import handlers
const { registerPowerControlHandlers } = require('./functions/power-control');
const { registerMonitoringHandlers } = require('./functions/monitoring');
const { registerPairingHandler } = require('./functions/pairing-handler');
const { registerUnbindHandler } = require('./functions/unbind-handler');
const { registerBroadcastHandler } = require('./functions/broadcast-handler');
const { createDeviceStorage } = require('./functions/device-storage');
const { createCommandDispatcher } = require('./functions/command-dispatcher');

if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!CLOUDFLARE_WORKER_URL) {
  console.error('❌ ERROR: CLOUDFLARE_WORKER_URL not set in .env');
  process.exit(1);
}

// Create bot instance
const bot = new Telegraf(BOT_TOKEN);

console.log('🤖 Bot instance created');

const deviceStorage = createDeviceStorage(CLOUDFLARE_WORKER_URL);
const commandDispatcher = createCommandDispatcher(CLOUDFLARE_WORKER_URL);

console.log('✅ Service modules initialized');

// Register handlers
try {
  registerPairingHandler(bot, CLOUDFLARE_WORKER_URL);
  console.log('✅ Pairing handler registered');
} catch (error) {
  console.error('❌ Error registering pairing handler:', error);
  process.exit(1);
}

try {
  registerUnbindHandler(bot, CLOUDFLARE_WORKER_URL);
  console.log('✅ Unbind handler registered');
} catch (error) {
  console.error('❌ Error registering unbind handler:', error);
  process.exit(1);
}

try {
  registerPowerControlHandlers(bot, CLOUDFLARE_WORKER_URL);
  console.log('✅ Power control handlers registered');
} catch (error) {
  console.error('❌ Error registering power control handlers:', error);
  process.exit(1);
}

try {
  registerMonitoringHandlers(bot, CLOUDFLARE_WORKER_URL);
  console.log('✅ Monitoring handlers registered');
} catch (error) {
  console.error('❌ Error registering monitoring handlers:', error);
  process.exit(1);
}

try {
  registerBroadcastHandler(bot, CLOUDFLARE_WORKER_URL, ADMIN_CHAT_ID);
  console.log('✅ Broadcast handler registered');
} catch (error) {
  console.error('❌ Error registering broadcast handler:', error);
  process.exit(1);
}

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  console.log(`[/start] User ID: ${userId}`);
  
  try {
    const userDevice = await deviceStorage.checkUserDevice(userId);
    
    if (userDevice.linked && userDevice.deviceId) {
      const deviceStatus = await deviceStorage.checkDeviceStatus(userDevice.deviceId);
      const statusText = deviceStatus.online ? '🟢 Online' : '🔴 Offline';
      
      await ctx.reply(`🖥️ <b>PC Remote Control</b>\n\nСтатус: ${statusText}`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ Рестарт', callback_data: 'restart_pc' }],
            [{ text: '💤 Сон', callback_data: 'sleep_pc' }],
            [{ text: '⏹️ Выключить', callback_data: 'shutdown_pc' }]
          ]
        }
      });
    } else {
      await ctx.reply('❌ ПК не подключен\n\nИспользуйте /connect DEVICE_ID');
    }
  } catch (error) {
    await ctx.reply('⚠️ Ошибка: ' + error.message);
  }
});

// Stats command (admin only)
bot.command('stats', async (ctx) => {
  if (ctx.from?.id !== ADMIN_CHAT_ID) {
    await ctx.reply('❌ Доступ запрещен');
    return;
  }
  
  try {
    const response = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/users/stats`);
    if (response.data.ok) {
      const stats = response.data;
      await ctx.reply(
        `📊 Статистика:\n\n` +
        `👥 Пользователей: ${stats.totalUsers}\n` +
        `🖥️ Устройств: ${stats.totalDevices}\n` +
        `🟢 Онлайн: ${stats.onlineDevices}\n` +
        `🔴 Офлайн: ${stats.offlineDevices}`
      );
    }
  } catch (error) {
    await ctx.reply(`❌ Ошибка: ${error.message}`);
  }
});

// Error handling
bot.catch((err) => {
  console.error('🚨 Bot error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✋ Bot stopping...');
  bot.stop('SIGINT');
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n✋ Bot stopping...');
  bot.stop('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});

// Launch
bot.launch().then(() => {
  console.log('✅ Bot started successfully');
  console.log(`📍 Worker URL: ${CLOUDFLARE_WORKER_URL}`);
  console.log(`👤 Admin Chat ID: ${ADMIN_CHAT_ID}`);
  console.log('🤖 Polling for messages...');
}).catch(err => {
  console.error('❌ Failed to launch bot:', err.message);
  process.exit(1);
});
