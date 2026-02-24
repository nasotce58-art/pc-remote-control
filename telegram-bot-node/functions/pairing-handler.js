/**
 * pairing-handler.js
 * Handles /connect command for device pairing
 * 
 * Flow:
 * 1. User sends /connect XXXX-XXXX
 * 2. Bot validates device ID format
 * 3. Bot sends pairing request to Desktop via Worker API
 * 4. Desktop shows confirmation dialog to user
 * 5. User confirms/denies
 * 6. Bot receives response and updates user state or notifies of rejection
 */

const axios = require('axios');
const { DeviceStorage } = require('./device-storage');

class PairingHandler {
  constructor(bot, workerUrl) {
    this.bot = bot;
    this.workerUrl = workerUrl;
    this.deviceStorage = new DeviceStorage(workerUrl);
    this.requestTimeout = 5000;
    this.pairingTimeout = 120000; // 2 minutes to respond with confirmation
  }

  /**
   * Register the /connect command handler
   */
  register() {
    this.bot.command('connect', (ctx) => this.handleConnectCommand(ctx));
  }

  /**
   * Handle /connect XXXX-XXXX command
   */
  async handleConnectCommand(ctx) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || 'unknown';
    const args = ctx.message.text.split(' ');

    console.log(`[/connect] User ${username} (${userId}) initiated pairing`);

    try {
      // Validate arguments
      if (args.length < 2) {
        return ctx.reply(
          '❌ Неверный формат команды\n\n' +
          'Используйте: /connect XXXX-XXXX\n\n' +
          'Пример: /connect X7K9-LP21'
        );
      }

      const deviceId = args[1].toUpperCase();

      // Validate device ID format
      if (!this.deviceStorage.isValidDeviceId(deviceId)) {
        return ctx.reply(
          '❌ Неверный формат Device ID\n\n' +
          'Device ID должен быть в формате: XXXX-XXXX\n' +
          '(4 буквы/цифры, дефис, 4 буквы/цифры)\n\n' +
          'Пример: X7K9-LP21'
        );
      }

      // Check if user already has linked device
      const userDevice = await this.deviceStorage.checkUserDevice(userId);
      if (userDevice.linked && userDevice.deviceId) {
        return ctx.reply(
          `⚠️ У вас уже есть привязанный ПК: ${userDevice.deviceId}\n\n` +
          'Сначала отвяжитесь от текущего ПК командой:\n' +
          '/unbind\n\n' +
          'После этого можно привязать новый ПК.'
        );
      }

      // Send pairing request to Desktop via Worker API
      console.log(`[/connect] Sending pairing request to device ${deviceId} for user ${userId}`);

      const pairingResponse = await axios.post(
        `${this.workerUrl}/api/pairing/request`,
        {
          deviceId: deviceId,
          telegramUserId: userId,
          telegramUsername: username,
          timestamp: new Date().toISOString()
        },
        { timeout: this.requestTimeout }
      );

      if (!pairingResponse.data.success) {
        console.error(`[/connect] Pairing request failed:`, pairingResponse.data);
        return ctx.reply(
          `❌ ${pairingResponse.data.error || 'Не удалось инициировать подключение'}\n\n` +
          'Возможно:\n' +
          '• Device ID неверный\n' +
          '• ПК не подключен к интернету\n' +
          '• Попробуйте позже'
        );
      }

      // Request sent successfully
      await ctx.reply(
        '⏳ Запрос на подключение отправлен\n\n' +
        `На вашем ПК появилось окно с запросом от @${username}\n\n` +
        '⏰ Ожидаю подтверждения (120 секунд)...'
      );

      // Poll for pairing confirmation result
      await this.pollPairingResult(ctx, userId, deviceId, username);

    } catch (error) {
      console.error(`[/connect] Error:`, error.message);
      
      if (error.code === 'ECONNREFUSED') {
        await ctx.reply(
          '❌ Ошибка подключения\n\n' +
          'Не удалось связаться с сервером.\n' +
          'Проверьте интернет-соединение и попробуйте позже.'
        );
      } else if (error.response?.status === 404) {
        await ctx.reply(
          '❌ Устройство не найдено\n\n' +
          'Device ID не зарегистрирован или неактивен.\n' +
          'Проверьте правильность Device ID.'
        );
      } else {
        await ctx.reply(
          '❌ Произошла ошибка при подключении\n\n' +
          'Пожалуйста, попробуйте позже.'
        );
      }
    }
  }

  /**
   * Poll Worker API for pairing confirmation result
   * @param {Object} ctx - Telegraf context
   * @param {number} userId - Telegram user ID
   * @param {string} deviceId - Device ID
   * @param {string} username - Telegram username
   */
  async pollPairingResult(ctx, userId, deviceId, username) {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    const pollTimer = setInterval(async () => {
      try {
        // Check pairing result
        const resultResponse = await axios.get(
          `${this.workerUrl}/api/pairing/result`,
          {
            params: {
              deviceId: deviceId,
              userId: userId
            },
            timeout: this.requestTimeout
          }
        );

        if (resultResponse.data.confirmed) {
          // Pairing confirmed by user
          clearInterval(pollTimer);
          console.log(`[/connect] Pairing confirmed for user ${userId}, device ${deviceId}`);

          await ctx.reply(
            '✅ Подключение выполнено!\n\n' +
            'Теперь вы можете управлять этим ПК.'
          );

          // Send dashboard to user
          await this.sendDashboard(ctx, userId, deviceId);

        } else if (resultResponse.data.denied) {
          // Pairing denied by user
          clearInterval(pollTimer);
          console.log(`[/connect] Pairing denied for user ${userId}, device ${deviceId}`);

          await ctx.reply(
            '❌ Подключение отклонено\n\n' +
            'Пользователь ПК отказал в доступе.\n\n' +
            'Попробуйте позже или обратитесь к владельцу ПК.'
          );

        } else if (resultResponse.data.expired) {
          // Pairing request expired
          clearInterval(pollTimer);
          console.log(`[/connect] Pairing expired for user ${userId}, device ${deviceId}`);

          await ctx.reply(
            '⏰ Время ожидания истекло\n\n' +
            'Пользователь ПК не ответил вовремя.\n' +
            'Попробуйте снова позже.'
          );
        }

      } catch (error) {
        // Continue polling on error (might be transient)
        console.error(`[/connect] Error polling pairing result:`, error.message);
      }

      // Stop polling after timeout
      if (Date.now() - startTime > this.pairingTimeout) {
        clearInterval(pollTimer);
        console.log(`[/connect] Polling timeout for user ${userId}, device ${deviceId}`);

        try {
          await ctx.reply(
            '⏰ Время ожидания истекло\n\n' +
            'Попробуйте снова или обратитесь к владельцу ПК.'
          );
        } catch (e) {
          console.error(`[/connect] Error sending timeout message:`, e.message);
        }
      }
    }, pollInterval);
  }

  /**
   * Send dashboard after successful pairing
   * @param {Object} ctx - Telegraf context
   * @param {number} userId - Telegram user ID
   * @param {string} deviceId - Device ID
   */
  async sendDashboard(ctx, userId, deviceId) {
    // Get device status
    const deviceStatus = await this.deviceStorage.checkDeviceStatus(deviceId);

    const statusText = deviceStatus.online ? '🟢 Online' : '🔴 Offline';

    const dashboardText = 
      `📱 Управление ПК: ${deviceId}\n\n` +
      `${statusText}\n\n` +
      `Выберите действие:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚡ Рестарт', callback_data: `restart_${deviceId}` },
          { text: '💤 Спящий режим', callback_data: `sleep_${deviceId}` }
        ],
        [
          { text: '⏹️ Выключение', callback_data: `shutdown_${deviceId}` }
        ],
        [
          { text: '⏰ Пробуждение', callback_data: `wake_${deviceId}` }
        ],
        [
          { text: '⚙️ Доп. функции', callback_data: `settings_menu_${deviceId}` }
        ]
      ]
    };

    try {
      await ctx.reply(dashboardText, { reply_markup: keyboard });
    } catch (error) {
      console.error(`[/connect] Error sending dashboard:`, error.message);
    }
  }
}

module.exports = {
  PairingHandler,
  registerPairingHandler: (bot, workerUrl) => {
    const handler = new PairingHandler(bot, workerUrl);
    handler.register();
    return handler;
  }
};
