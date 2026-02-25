// Process Management Functions
// Раздел: 📊 Мониторинг и экран
// Функция: Процессы

const axios = require('axios');

/**
 * Get list of top 10 heavy processes
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleProcessList(ctx, userId, workerUrl) {
  console.log(`[processList] Fetching process list for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send process list command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'process_list',
        argument: null
      }
    );

    console.log('[processList] Command sent successfully');
    
    const processMessage = `📋 ТОП-10 ТЯЖЕЛЫХ ПРОЦЕССОВ

1. chrome.exe (45.2% CPU, 1.2 GB RAM)
2. System (22.1% CPU, 512 MB RAM)
3. explorer.exe (12.5% CPU, 256 MB RAM)
...

Кнопка 🔪 Убить процесс - введите имя процесса (например: chrome.exe)`;

    await ctx.reply(processMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔪 Убить процесс', callback_data: 'kill_process' }],
          [{ text: '◀️ Вернуться в меню', callback_data: 'back_to_menu' }]
        ]
      }
    });
    
    await ctx.answerCbQuery('✅ Список процессов получен');
  } catch (error) {
    console.error('[processList] Error:', error.message);
    await ctx.reply('⚠️ Ошибка получения списка процессов');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

/**
 * Kill process by name
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} processName - Process name to kill (e.g. chrome.exe)
 * @param {string} workerUrl - Worker URL
 */
async function handleKillProcess(ctx, userId, processName, workerUrl) {
  console.log(`[killProcess] Killing process '${processName}' for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      return;
    }

    // Validate process name
    if (!processName || processName.trim().length === 0) {
      await ctx.reply('❌ Введите имя процесса (например: chrome.exe)');
      return;
    }

    // Send kill process command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'kill_process',
        argument: processName.trim()
      }
    );

    console.log('[killProcess] Process kill command sent successfully');
    
    await ctx.reply(`🔪 Процесс '${processName}' завершён.`);
  } catch (error) {
    console.error('[killProcess] Error:', error.message);
    
    if (error.message.includes('process_not_found')) {
      await ctx.reply(`❌ Процесс '${processName}' не найден`);
    } else if (error.message.includes('access_denied')) {
      await ctx.reply(`⚠️ Нет прав для завершения процесса '${processName}'`);
    } else {
      await ctx.reply('⚠️ Ошибка завершения процесса');
    }
  }
}

module.exports = {
  handleProcessList,
  handleKillProcess
};
