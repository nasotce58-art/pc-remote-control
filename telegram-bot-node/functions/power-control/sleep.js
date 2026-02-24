// Sleep Mode Functions
// Раздел: ⚡ Питание и сеть
// Функция: Спящий режим (Sleep)

const axios = require('axios');

/**
 * Put PC to sleep mode
 * Windows: Application.SetSuspendState
 * PC continues listening to network
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleSleepPC(ctx, userId, workerUrl) {
  console.log(`[sleepPC] Sending sleep command for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send sleep command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'sleep',
        argument: null
      }
    );

    console.log('[sleepPC] Command sent successfully');
    await ctx.reply('💤 ПК переходит в спящий режим.\n\nПК продолжит слушать сеть для пробуждения.');
    await ctx.answerCbQuery('✅ ПК засыпает');
  } catch (error) {
    console.error('[sleepPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отправки команды');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleSleepPC
};
