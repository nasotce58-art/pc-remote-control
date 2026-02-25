// System Status Functions
// Раздел: 📊 Мониторинг и экран
// Функция: Статус системы

const axios = require('axios');

/**
 * Get system status (CPU, RAM, GPU, Network)
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleSystemStats(ctx, userId, workerUrl) {
  console.log(`[systemStats] Fetching system stats for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send stats command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'system_stats',
        argument: null
      }
    );

    console.log('[systemStats] Command sent successfully');
    
    // Format response message with system information
    const statsMessage = `📊 СТАТУС СИСТЕМЫ

🖥️ CPU: <cpu_data>
🧠 RAM: <ram_data>
🎮 GPU: <gpu_data>
📡 Network:
   ↓ Download: <download_speed>
   ↑ Upload: <upload_speed>

⏰ Время: <current_time>
📈 Система: <system_uptime>`;

    await ctx.reply(statsMessage);
    await ctx.answerCbQuery('✅ Статус получен');
  } catch (error) {
    console.error('[systemStats] Error:', error.message);
    await ctx.reply('⚠️ Ошибка получения статуса');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleSystemStats
};
