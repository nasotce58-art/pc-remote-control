// Monitor Control Functions
// Раздел: ⚡ Питание и сеть
// Функция: Монитор (Вкл/Выкл)

const axios = require('axios');

/**
 * Toggle monitor on/off
 * Windows: SendMessage SC_MONITORPOWER
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleMonitorToggle(ctx, userId, workerUrl) {
  console.log(`[monitorToggle] Sending monitor toggle command for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send monitor toggle command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'monitor_toggle',
        argument: null
      }
    );

    console.log('[monitorToggle] Command sent successfully');
    await ctx.reply('💻 Команда отправлена. Монитор выключится/включится...');
    await ctx.answerCbQuery('✅ Монитор переключен');
  } catch (error) {
    console.error('[monitorToggle] Error:', error.message);
    await ctx.reply('⚠️ Ошибка отправки команды');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleMonitorToggle
};
