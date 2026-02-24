// System Lock Functions
// Раздел: ⚡ Питание и сеть
// Функция: Блокировка системы (Lock)

const axios = require('axios');

/**
 * Lock PC system (Win + L)
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleLockPC(ctx, userId, workerUrl) {
  console.log(`[lockPC] Sending lock command for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send lock command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'lock',
        argument: null
      }
    );

    console.log('[lockPC] Command sent successfully');
    await ctx.reply('🔒 ПК заблокирован. Требуется ввод пароля.');
    await ctx.answerCbQuery('✅ ПК заблокирован');
  } catch (error) {
    console.error('[lockPC] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отправки команды');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleLockPC
};
