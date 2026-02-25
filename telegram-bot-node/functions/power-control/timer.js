// Shutdown Timer Functions
// Раздел: ⚡ Питание и сеть
// Функция: Таймер выключения

const axios = require('axios');

/**
 * Show shutdown timer menu
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleShutdownTimer(ctx, userId, workerUrl) {
  console.log(`[shutdownTimer] Initiating shutdown timer for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Ask user for time input
    await ctx.reply(
      '⏱️ Введите время выключения:\n\nПримеры:\n• 30 мин\n• 1 час\n• 60 (в секундах)',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '30 мин', callback_data: 'timer_30min' },
              { text: '1 час', callback_data: 'timer_60min' }
            ],
            [
              { text: '2 часа', callback_data: 'timer_120min' },
              { text: '◀️ Отмена', callback_data: 'back_to_menu' }
            ]
          ]
        }
      }
    );
    await ctx.answerCbQuery('⏱️ Введите время');
  } catch (error) {
    console.error('[shutdownTimer] Error:', error.message);
    await ctx.reply('⚠️ Ошибка');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

/**
 * Handle timer selection
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {number} minutes - Minutes to wait
 * @param {string} workerUrl - Worker URL
 */
async function handleTimerSelection(ctx, userId, minutes, workerUrl) {
  console.log(`[timerSelection] Setting shutdown timer for ${minutes} minutes for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Convert minutes to seconds
    const seconds = minutes * 60;

    // Send shutdown timer command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'shutdown_timer',
        argument: seconds
      }
    );

    console.log('[timerSelection] Timer set successfully');
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let timeStr = '';
    if (hours > 0 && mins > 0) {
      timeStr = `${hours} час ${mins} мин`;
    } else if (hours > 0) {
      timeStr = `${hours} час`;
    } else {
      timeStr = `${minutes} мин`;
    }
    
    await ctx.reply(`⏱️ Таймер установлен на ${timeStr}.\n\nПК выключится через указанное время.`);
    await ctx.answerCbQuery('✅ Таймер установлен');
  } catch (error) {
    console.error('[timerSelection] Error:', error.message);
    await ctx.reply('⚠️ Ошибка установки таймера');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleShutdownTimer,
  handleTimerSelection
};
