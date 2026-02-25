/**
 * PC Remote Control - Telegram Bot
 * Полностью переписанная версия
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID);

if (!BOT_TOKEN || !WORKER_URL) {
  console.error('❌ BOT_TOKEN и CLOUDFLARE_WORKER_URL должны быть в .env');
  process.exit(1);
}

// Create bot
const bot = new Telegraf(BOT_TOKEN);

console.log('🤖 Bot starting...');

// ==================== HELPER FUNCTIONS ====================

async function getUserDevice(userId) {
  try {
    const res = await axios.get(`${WORKER_URL}/api/user/${userId}/device`);
    return res.data;
  } catch (e) {
    return { linked: false, deviceId: null };
  }
}

async function getDeviceStatus(deviceId) {
  try {
    const res = await axios.get(`${WORKER_URL}/api/device/${deviceId}/status`);
    return res.data.ok ? res.data.device : null;
  } catch (e) {
    return null;
  }
}

async function sendCommand(deviceId, command, argument = null) {
  try {
    const res = await axios.post(`${WORKER_URL}/api/commands/${deviceId}`, {
      command,
      argument
    });
    return { ok: true, commandId: res.data.commandId };
  } catch (e) {
    return { ok: false, error: e.response?.data?.error || e.message };
  }
}

// ==================== COMMANDS ====================

bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  console.log(`[/start] User ${userId}`);
  
  const userDevice = await getUserDevice(userId);
  
  if (userDevice.linked && userDevice.deviceId) {
    const status = await getDeviceStatus(userDevice.deviceId);
    const statusText = status?.status === 'online' ? '🟢 Online' : '🔴 Offline';
    
    await ctx.reply(
      `🖥️ <b>PC Remote Control</b>\n\n` +
      `Статус: ${statusText}\n` +
      `Устройство: ${userDevice.deviceId}\n\n` +
      `Выберите действие:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Рестарт', callback_data: 'restart' },
              { text: '💤 Сон', callback_data: 'sleep' }
            ],
            [
              { text: '⏹️ Выключить', callback_data: 'shutdown' },
              { text: '🔒 Блокировка', callback_data: 'lock' }
            ],
            [
              { text: '📊 Статус', callback_data: 'stats' },
              { text: '🔌 Отвязать', callback_data: 'unbind' }
            ]
          ]
        }
      }
    );
  } else {
    await ctx.reply(
      `👋 <b>Добро пожаловать!</b>\n\n` +
      `У вас нет привязанного ПК.\n\n` +
      `Для подключения:\n` +
      `1. Откройте приложение на ПК\n` +
      `2. Скопируйте Device ID\n` +
      `3. Отправьте: <code>/connect DEVICE_ID</code>\n\n` +
      `Пример: <code>/connect ABCD-1234</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❓ Помощь', callback_data: 'help' }]
          ]
        }
      }
    );
  }
});

bot.command('connect', async (ctx) => {
  const userId = ctx.from?.id;
  const deviceId = ctx.message.text.split(' ')[1]?.toUpperCase();
  
  console.log(`[/connect] User ${userId}, Device ${deviceId}`);
  
  if (!deviceId) {
    await ctx.reply('❌ Использование: /connect DEVICE_ID\nПример: /connect ABCD-1234');
    return;
  }
  
  // Check if device exists
  const deviceStatus = await getDeviceStatus(deviceId);
  if (!deviceStatus) {
    await ctx.reply('❌ Устройство не найдено. Проверьте Device ID.');
    return;
  }
  
  // Link user to device
  try {
    await axios.post(`${WORKER_URL}/api/user/${userId}/link/${deviceId}`);
    await ctx.reply(`✅ ПК <b>${deviceId}</b> подключен!`, { parse_mode: 'HTML' });
  } catch (e) {
    await ctx.reply('❌ Ошибка подключения: ' + e.response?.data?.error || e.message);
  }
});

bot.command('unbind', async (ctx) => {
  const userId = ctx.from?.id;
  console.log(`[/unbind] User ${userId}`);
  
  const userDevice = await getUserDevice(userId);
  if (!userDevice.linked) {
    await ctx.reply('ℹ️ У вас нет привязанного ПК');
    return;
  }
  
  try {
    await axios.delete(`${WORKER_URL}/api/user/${userId}/unlink`);
    await ctx.reply('✅ ПК отвязан');
  } catch (e) {
    await ctx.reply('❌ Ошибка: ' + e.response?.data?.error || e.message);
  }
});

bot.command('stats', async (ctx) => {
  if (ctx.from?.id !== ADMIN_CHAT_ID) {
    await ctx.reply('❌ Только для админа');
    return;
  }
  
  try {
    const res = await axios.get(`${WORKER_URL}/api/users/stats`);
    const s = res.data;
    await ctx.reply(
      `📊 <b>Статистика</b>\n\n` +
      `👥 Пользователей: ${s.totalUsers}\n` +
      `🖥️ Устройств: ${s.totalDevices}\n` +
      `🟢 Онлайн: ${s.onlineDevices}\n` +
      `🔴 Офлайн: ${s.offlineDevices}`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    await ctx.reply('❌ Ошибка: ' + e.message);
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 <b>Справка</b>\n\n` +
    `<b>Команды:</b>\n` +
    `/start - Главное меню\n` +
    `/connect DEVICE_ID - Подключить ПК\n` +
    `/unbind - Отвязать ПК\n` +
    `/stats - Статистика (админ)\n` +
    `/help - Эта справка\n\n` +
    `<b>Кнопки:</b>\n` +
    `⚡ Рестарт, 💤 Сон, ⏹️ Выключить, 🔒 Блокировка, 📊 Статус`,
    { parse_mode: 'HTML' }
  );
});

// ==================== CALLBACKS ====================

bot.on('callback_query', async (ctx) => {
  const userId = ctx.from?.id;
  const data = ctx.callbackQuery?.data;
  
  console.log(`[callback] User ${userId}, Action ${data}`);
  
  const userDevice = await getUserDevice(userId);
  if (!userDevice.linked) {
    await ctx.answerCbQuery('❌ Сначала /connect');
    return;
  }
  
  const deviceId = userDevice.deviceId;
  let result;
  
  switch (data) {
    case 'restart':
      result = await sendCommand(deviceId, 'restart');
      if (result.ok) await ctx.reply('⚡ Перезагрузка...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'sleep':
      result = await sendCommand(deviceId, 'sleep');
      if (result.ok) await ctx.reply('💤 Спящий режим...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'shutdown':
      result = await sendCommand(deviceId, 'shutdown');
      if (result.ok) await ctx.reply('⏹️ Выключение...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'lock':
      result = await sendCommand(deviceId, 'lock');
      if (result.ok) await ctx.reply('🔒 Заблокировано');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'stats':
      const status = await getDeviceStatus(deviceId);
      if (status) {
        await ctx.reply(
          `📊 <b>Статус</b>\n\n` +
          `💻 ПК: ${status.hostname || deviceId}\n` +
          `🔋 Батарея: ${status.batteryLevel || 'N/A'}%\n` +
          `⚡ CPU: ${status.cpuUsage || 'N/A'}%\n` +
          `🧠 RAM: ${status.ramUsed || 'N/A'} GB`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('❌ Не удалось получить статус');
      }
      break;
      
    case 'unbind':
      try {
        await axios.delete(`${WORKER_URL}/api/user/${userId}/unlink`);
        await ctx.reply('✅ ПК отвязан');
      } catch (e) {
        await ctx.reply('❌ Ошибка: ' + e.message);
      }
      break;
      
    case 'help':
      await ctx.answerCbQuery('📲 Отправьте /connect DEVICE_ID');
      return;
      
    default:
      await ctx.answerCbQuery('❓ Неизвестно');
      return;
  }
  
  await ctx.answerCbQuery();
});

// ==================== ERROR HANDLING ====================

bot.catch((err) => {
  console.error('🚨 Bot error:', err);
});

process.on('SIGINT', () => {
  console.log('\n✋ Stopping...');
  bot.stop('SIGINT');
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n✋ Stopping...');
  bot.stop('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});

// ==================== LAUNCH ====================

bot.launch().then(() => {
  console.log('✅ Bot started!');
  console.log(`📍 Worker: ${WORKER_URL}`);
  console.log(`👤 Admin: ${ADMIN_CHAT_ID}`);
  console.log('🤖 Polling...');
}).catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
