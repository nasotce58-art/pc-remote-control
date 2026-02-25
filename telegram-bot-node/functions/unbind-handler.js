/**
 * unbind-handler.js
 * Handles /unbind command for device unlinking
 */

const axios = require('axios');
const { DeviceStorage } = require('./device-storage');

class UnbindHandler {
  constructor(bot, workerUrl) {
    this.bot = bot;
    this.workerUrl = workerUrl;
    this.deviceStorage = new DeviceStorage(workerUrl);
    this.requestTimeout = 5000;
  }

  /**
   * Register the /unbind command handler
   */
  register() {
    this.bot.command('unbind', (ctx) => this.handleUnbindCommand(ctx));
  }

  /**
   * Handle /unbind command
   */
  async handleUnbindCommand(ctx) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || 'unknown';

    console.log(`[/unbind] User ${username} (${userId}) initiated unbinding`);

    try {
      // Check if user has linked device
      const userDevice = await this.deviceStorage.checkUserDevice(userId);

      if (!userDevice.linked || !userDevice.deviceId) {
        await ctx.reply('❌ У вас нет привязанных ПК.');
        return;
      }

      const deviceId = userDevice.deviceId;

      // Отправляем команду отвязки на Worker
      try {
        await axios.post(
          `${this.workerUrl}/api/commands/${deviceId}`,
          {
            command: 'unbind',
            telegramUserId: userId,
            telegramUsername: username,
            timestamp: new Date().toISOString()
          },
          { timeout: this.requestTimeout }
        );
      } catch (workerError) {
        console.log(`[/unbind] Worker endpoint might be unavailable, continuing unbind...`);
      }

      // Unlink user from device in storage
      const unlinkResult = await this.deviceStorage.unlinkUser(userId);

      if (unlinkResult.success) {
        console.log(`[/unbind] Successfully unbound user ${userId} from device ${deviceId}`);

        await ctx.reply(
          `✅ ПК ${deviceId} успешно отвязан\n\nТеперь вы можете привязать другой ПК командой:\n/connect XXXX-XXXX`,
          {
            reply_markup: { remove_keyboard: true }
          }
        );
      } else {
        throw new Error('Failed to unlink device from storage');
      }

    } catch (error) {
      console.error(`[/unbind] Error confirming unbind:`, error.message);
      await ctx.reply('❌ Ошибка при отвязке ПК\n\nПожалуйста, попробуйте позже.');
    }
  }

  /**
   * Cancel unbind (на случай использования инлайн-кнопок)
   */
  async cancelUnbind(ctx) {
    console.log(`[/unbind] User ${ctx.from?.id} cancelled unbind`);

    try {
      await ctx.editMessageText(
        '❌ Отвязка отменена',
        {
          reply_markup: undefined
        }
      );
    } catch (error) {
      console.error(`[/unbind] Error cancelling unbind:`, error.message);
    }
  }
}

function registerUnbindHandler(bot, workerUrl) {
  const handler = new UnbindHandler(bot, workerUrl);
  handler.register();
  return handler;
}

module.exports = {
  UnbindHandler,
  registerUnbindHandler
};