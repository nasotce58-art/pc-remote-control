/**
 * PC Remote Control - Telegram Bot v2.0
 * Полная версия со всеми функциями
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
  const username = ctx.from?.username || 'unknown';
  
  console.log(`[/start] User ${userId} (@${username})`);
  
  const userDevice = await getUserDevice(userId);
  
  if (userDevice.linked && userDevice.deviceId) {
    // Device is linked - show dashboard
    const deviceId = userDevice.deviceId;
    const status = await getDeviceStatus(deviceId);
    const statusText = status?.status === 'online' ? '🟢 Online' : '🔴 Offline';
    
    const now = new Date();
    const timeStr = now.toLocaleString('ru-RU');
    
    await ctx.reply(
      `🖥️ <b>PC Remote Control</b>\n\n` +
      `Статус на ${timeStr}\n` +
      `${statusText}\n\n` +
      `Устройство: ${deviceId}\n\n` +
      `Выберите действие:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Вкл (Рестарт)', callback_data: 'restart_pc' },
              { text: '💤 Выкл (Сон)', callback_data: 'sleep_pc' }
            ],
            [
              { text: '⏹️ Принудительное выключение', callback_data: 'force_shutdown_pc' }
            ],
            [
              { text: '⏰ Пробуждение из сна', callback_data: 'wake_pc' }
            ],
            [
              { text: '⚙️ Доп. функции', callback_data: 'settings_menu' }
            ]
          ]
        }
      }
    );
  } else {
    // Device is not linked
    await ctx.reply(
      `❌ <b>У вас ещё нет привязанного ПК</b>\n\n` +
      `Для подключения введите ваш Device ID из приложения:\n` +
      `<code>/connect DEVICE_ID</code>\n\n` +
      `Пример: <code>/connect X7K9-LP21</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❓ Помощь', callback_data: 'help_connect' }]
          ]
        }
      }
    );
  }
});

bot.command('connect', async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || 'unknown';
  const args = ctx.message.text.split(' ');
  const deviceId = args[1]?.toUpperCase();
  
  console.log(`[/connect] User ${userId} (@${username}), Device ${deviceId}`);
  
  if (!deviceId || deviceId.length < 5) {
    await ctx.reply('❌ Неверный формат. Используйте: /connect DEVICE_ID\nПример: /connect X7K9-LP21');
    return;
  }
  
  // Check if user already has device
  const userDevice = await getUserDevice(userId);
  if (userDevice.linked) {
    await ctx.reply(`⚠️ У вас уже есть привязанный ПК: ${userDevice.deviceId}\n\nСначала отвяжитесь командой /unbind`);
    return;
  }
  
  // Check if device exists
  const deviceStatus = await getDeviceStatus(deviceId);
  if (!deviceStatus) {
    await ctx.reply('❌ Устройство не найдено. Проверьте Device ID и убедитесь что приложение запущено.');
    return;
  }
  
  // Link user to device
  try {
    await axios.post(`${WORKER_URL}/api/user/${userId}/link/${deviceId}`);
    await ctx.reply(
      `✅ <b>Подключение выполнено!</b>\n\n` +
      `Теперь вы можете управлять этим ПК.\n\n` +
      `Отправьте /start для открытия панели управления.`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    await ctx.reply('❌ Ошибка подключения: ' + (e.response?.data?.error || e.message));
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
    await ctx.reply('✅ ПК отвязан. Отправьте /connect DEVICE_ID для подключения нового.');
  } catch (e) {
    await ctx.reply('❌ Ошибка: ' + (e.response?.data?.error || e.message));
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
    `📖 <b>Справка PC Remote Control</b>\n\n` +
    `<b>Команды:</b>\n` +
    `/start - Главное меню\n` +
    `/connect DEVICE_ID - Подключить ПК\n` +
    `/unbind - Отвязать ПК\n` +
    `/stats - Статистика (админ)\n` +
    `/help - Эта справка\n\n` +
    `<b>Как подключить:</b>\n` +
    `1. Откройте приложение на ПК\n` +
    `2. Скопируйте Device ID\n` +
    `3. Отправьте: /connect DEVICE_ID\n` +
    `4. Подтвердите на ПК\n` +
    `5. Готово!`,
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
    await ctx.answerCbQuery('❌ Сначала подключите ПК: /connect DEVICE_ID');
    return;
  }
  
  const deviceId = userDevice.deviceId;
  let result;
  
  switch (data) {
    // Power commands
    case 'restart_pc':
      result = await sendCommand(deviceId, 'restart');
      if (result.ok) await ctx.reply('⚡ ПК перезагружается...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'sleep_pc':
      result = await sendCommand(deviceId, 'sleep');
      if (result.ok) await ctx.reply('💤 ПК переходит в спящий режим...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'force_shutdown_pc':
      result = await sendCommand(deviceId, 'shutdown', { force: true });
      if (result.ok) await ctx.reply('⏹️ Принудительное выключение...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'wake_pc':
      result = await sendCommand(deviceId, 'wake');
      if (result.ok) await ctx.reply('⏰ Пробуждение...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'settings_menu':
      await ctx.editMessageText(
        '⚙️ <b>Дополнительные функции</b>\n\nВыберите раздел:',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔌 Питание и сеть', callback_data: 'section_power' }],
              [{ text: '📊 Мониторинг и экран', callback_data: 'section_monitoring' }],
              [{ text: '📂 Файлы и приложения', callback_data: 'section_files' }],
              [{ text: '⌨ Управление и ввод', callback_data: 'section_control' }],
              [{ text: '⚙️ Настройки', callback_data: 'section_settings' }],
              [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
            ]
          }
        }
      );
      break;
      
    // Sections
    case 'section_power':
      await ctx.editMessageText(
        '🔌 <b>Питание и сеть</b>',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🖥️ Монитор Вкл/Выкл', callback_data: 'cmd_monitor_toggle' }],
              [{ text: '🔒 Блокировка', callback_data: 'lock_pc' }],
              [{ text: '⏳ Таймер выключения', callback_data: 'shutdown_timer' }],
              [{ text: '💤 Спящий режим', callback_data: 'sleep_pc' }],
              [{ text: '🔄 Перезагрузка', callback_data: 'restart_pc' }],
              [{ text: '⛔ Выключить', callback_data: 'shutdown_pc' }],
              [{ text: '🔙 Назад', callback_data: 'settings_menu' }]
            ]
          }
        }
      );
      break;
      
    case 'section_monitoring':
      await ctx.editMessageText(
        '📊 <b>Мониторинг и экран</b>',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📈 Статус системы', callback_data: 'system_stats' }],
              [{ text: '📸 Скриншот', callback_data: 'screenshot' }],
              [{ text: '📋 Процессы', callback_data: 'process_list' }],
              [{ text: '🔙 Назад', callback_data: 'settings_menu' }]
            ]
          }
        }
      );
      break;
      
    case 'section_files':
      await ctx.editMessageText(
        '📂 <b>Файлы и приложения</b>\n\nВ разработке...',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Запуск программ', callback_data: 'launch_app' }],
              [{ text: '🔎 Поиск файлов', callback_data: 'search_files' }],
              [{ text: '🔙 Назад', callback_data: 'settings_menu' }]
            ]
          }
        }
      );
      break;
      
    case 'section_control':
      await ctx.editMessageText(
        '⌨ <b>Управление и ввод</b>\n\nВ разработке...',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Буфер обмена', callback_data: 'clipboard' }],
              [{ text: '🔊 Громкость', callback_data: 'volume' }],
              [{ text: '💻 Терминал', callback_data: 'terminal' }],
              [{ text: '🔙 Назад', callback_data: 'settings_menu' }]
            ]
          }
        }
      );
      break;
      
    case 'section_settings':
      await ctx.editMessageText(
        '⚙️ <b>Настройки</b>',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔔 Уведомления', callback_data: 'notifications' }],
              [{ text: 'ℹ️ О программе', callback_data: 'about' }],
              [{ text: '🔙 Назад', callback_data: 'settings_menu' }]
            ]
          }
        }
      );
      break;
      
    // Power commands from sections
    case 'shutdown_pc':
      result = await sendCommand(deviceId, 'shutdown');
      if (result.ok) await ctx.reply('⏹️ ПК выключается...');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'lock_pc':
      result = await sendCommand(deviceId, 'lock');
      if (result.ok) await ctx.reply('🔒 ПК заблокирован');
      else await ctx.reply('❌ ' + result.error);
      break;
      
    case 'system_stats':
      const status = await getDeviceStatus(deviceId);
      if (status) {
        await ctx.reply(
          `📊 <b>Статус системы</b>\n\n` +
          `💻 ПК: ${status.hostname || deviceId}\n` +
          `🔋 Батарея: ${status.batteryLevel || 'N/A'}%\n` +
          `⚡ CPU: ${status.cpuUsage || 'N/A'}%\n` +
          `🧠 RAM: ${status.ramUsed || 'N/A'} / ${status.ramTotal || 'N/A'} GB\n` +
          `📶 Сеть: ${status.networkName || 'N/A'}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('❌ Не удалось получить статус');
      }
      break;
      
    case 'back_to_menu':
      // Send new dashboard message
      const newStatus = await getDeviceStatus(deviceId);
      const newStatusText = newStatus?.status === 'online' ? '🟢 Online' : '🔴 Offline';
      
      await ctx.reply(
        `🖥️ <b>PC Remote Control</b>\n\n` +
        `Статус: ${newStatusText}\n` +
        `Устройство: ${deviceId}\n\n` +
        `Выберите действие:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚡ Вкл (Рестарт)', callback_data: 'restart_pc' },
                { text: '💤 Выкл (Сон)', callback_data: 'sleep_pc' }
              ],
              [
                { text: '⏹️ Принудительное выключение', callback_data: 'force_shutdown_pc' }
              ],
              [
                { text: '⏰ Пробуждение из сна', callback_data: 'wake_pc' }
              ],
              [
                { text: '⚙️ Доп. функции', callback_data: 'settings_menu' }
              ]
            ]
          }
        }
      );
      break;
      
    // Placeholders
    case 'help_connect':
      await ctx.answerCbQuery('📲 Отправьте /connect DEVICE_ID');
      return;
      
    case 'notifications':
    case 'about':
    case 'launch_app':
    case 'search_files':
    case 'clipboard':
    case 'volume':
    case 'terminal':
    case 'screenshot':
    case 'process_list':
    case 'shutdown_timer':
    case 'cmd_monitor_toggle':
      await ctx.answerCbQuery('⏳ В разработке...');
      return;
      
    default:
      await ctx.answerCbQuery('❓ Неизвестное действие');
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
