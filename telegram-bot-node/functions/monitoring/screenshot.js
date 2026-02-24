// Screenshot Functions
// Раздел: 📊 Мониторинг и экран
// Функция: Скриншот

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Take screenshot of all monitors
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleScreenshot(ctx, userId, workerUrl) {
  console.log(`[screenshot] Taking screenshot for user ${userId}`);

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${workerUrl}/api/user/${userId}/device`);
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    // Send screenshot command to Worker
    const commandResponse = await axios.post(
      `${workerUrl}/api/commands/${deviceId}`,
      {
        command: 'screenshot',
        argument: null
      }
    );

    console.log('[screenshot] Command sent successfully');
    
    await ctx.reply('📸 Скриншот отправлен. Обработка...');
    
    // In real implementation:
    // - Wait for screenshot data from Worker
    // - Receive image as buffer or base64
    // - Save to temporary location
    // - Send to Telegram as photo
    // await ctx.replyWithPhoto({ source: screenshotBuffer });

    await ctx.answerCbQuery('✅ Скриншот получен');
  } catch (error) {
    console.error('[screenshot] Error:', error.message);
    await ctx.reply('⚠️ Ошибка получения скриншота');
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  handleScreenshot
};
