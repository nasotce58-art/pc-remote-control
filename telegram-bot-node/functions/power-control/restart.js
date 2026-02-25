// System Restart Functions
// Раздел: ⚡ Питание и сеть
// Функция: Перезагрузка (Restart)

const axios = require('axios');

/**
 * Restart PC
 * Windows: shutdown /r /t 0
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleRestartPC(ctx, userId, workerUrl) {
  console.log(`[restartPC] Sending restart command for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send restart command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'restart',
        argument: null
      }
    );

    console.log('[restartPC] Command sent successfully');
    await ctx.reply('⚡ ПК перезагружается.\n\nЭто займёт несколько минут...');
    await ctx.answerCbQuery('✅ ПК перезагружается');
  } catch (error) {
    console.error('[restartPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отправки команды');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleRestartPC
};
