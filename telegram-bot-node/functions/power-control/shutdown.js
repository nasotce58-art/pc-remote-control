// System Shutdown Functions
// Раздел: ⚡ Питание и сеть
// Функция: Выключить (Shutdown)

const axios = require('axios');

/**
 * Shutdown PC
 * Windows: shutdown /s /t 0
 * Complete system shutdown
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleShutdownPC(ctx, userId, workerUrl) {
  console.log(`[shutdownPC] Sending shutdown command for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send shutdown command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'shutdown',
        argument: null
      }
    );

    console.log('[shutdownPC] Command sent successfully');
    await ctx.reply('⏹️ ПК выключится в течение нескольких секунд...');
    await ctx.answerCbQuery('✅ ПК выключается');
  } catch (error) {
    console.error('[shutdownPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отправки команды');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleShutdownPC
};
