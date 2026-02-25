// Webcam Functions
// Раздел: 📊 Мониторинг и экран
// Функция: Веб-камера (если есть)

const axios = require('axios');

/**
 * Take photo from main webcam
 * Security feature: "Охранник" mode
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleWebcamPhoto(ctx, userId, workerUrl) {
  console.log(`[webcam] Taking webcam photo for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send webcam command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'webcam_photo',
        argument: null
      }
    );

    console.log('[webcam] Command sent successfully');
    
    await ctx.reply('📷 Фото с веб-камеры отправлено. Обработка...');
    
    // In real implementation:
    // - Wait for webcam photo data from Worker
    // - Receive image as buffer or base64
    // - Check if webcam exists
    // - Send to Telegram as photo
    // If no webcam: await ctx.reply('⚠️ Веб-камера не найдена');

    await ctx.answerCbQuery('✅ Фото получено');
  } catch (error) {
    console.error('[webcam] Error:', error.message);
    
    // Check if error is due to missing webcam
    if (error.message.includes('webcam_not_found')) {
      await ctx.reply('⚠️ Веб-камера не подключена или не обнаружена');
    } else {
      await ctx.reply('⚠️ Ошибка получения фото');
    }
    
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleWebcamPhoto
};
