/**
 * command-dispatcher.js
 * Sends commands from bot to Desktop via Worker API with user authorization check
 * 
 * Flow:
 * 1. User clicks button (e.g., "Restart")
 * 2. Bot checks if user_id matches bound user_id on device
 * 3. If match, sends command to Desktop
 * 4. Desktop executes command
 * 5. Bot receives result and displays to user
 */

const axios = require('axios');
const { DeviceStorage } = require('./device-storage');

class CommandDispatcher {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
    this.deviceStorage = new DeviceStorage(workerUrl);
    this.requestTimeout = 10000; // 10 seconds for command execution
  }

  /**
   * Send a command to Desktop with authorization check
   * @param {number} userId - Telegram user ID
   * @param {string} deviceId - Device ID
   * @param {string} commandType - Type of command (e.g., 'restart', 'sleep', 'shutdown')
   * @param {Object} parameters - Additional command parameters
   * @returns {Promise<{success: boolean, message: string, data?: any}>}
   */
  async sendCommand(userId, deviceId, commandType, parameters = {}) {
    try {
      console.log(`[CommandDispatcher] Sending command ${commandType} from user ${userId} to device ${deviceId}`);

      // Check if user is authorized for this device
      const userDevice = await this.deviceStorage.checkUserDevice(userId);

      if (!userDevice.linked || userDevice.deviceId !== deviceId) {
        console.warn(`[CommandDispatcher] Unauthorized access attempt by user ${userId} for device ${deviceId}`);
        return {
          success: false,
          message: '❌ Вы не авторизированы на этом ПК\n\nПривяжите ПК командой /connect'
        };
      }

      // Send command to Desktop via Worker API
      const commandResponse = await axios.post(
        `${this.workerUrl}/api/device/${deviceId}/command`,
        {
          command: commandType,
          argument: parameters.argument || null,
          telegramUserId: userId,
          timestamp: new Date().toISOString()
        },
        { timeout: this.requestTimeout }
      );

      if (commandResponse.data.ok) {
        console.log(`[CommandDispatcher] Command ${commandType} sent successfully`);

        return {
          success: true,
          message: commandResponse.data.message || this.getSuccessMessage(commandType),
          data: commandResponse.data.result
        };
      } else {
        console.error(`[CommandDispatcher] Command execution failed:`, commandResponse.data);

        return {
          success: false,
          message: commandResponse.data.error || `❌ Не удалось выполнить команду: ${commandType}`
        };
      }

    } catch (error) {
      console.error(`[CommandDispatcher] Error sending command:`, error.message);

      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: '❌ ПК не подключен к интернету\n\nПопробуйте позже'
        };
      } else if (error.response?.status === 401) {
        return {
          success: false,
          message: '❌ Доступ запрещен\n\nПривяжите ПК заново командой /connect'
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          message: '❌ ПК не найден\n\nПопробуйте привязать ПК заново'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: '⏱️ Время ожидания истекло\n\nПопробуйте позже'
        };
      } else {
        return {
          success: false,
          message: '❌ Произошла ошибка при выполнении команды\n\nПопробуйте позже'
        };
      }
    }
  }

  /**
   * Get success message for command
   * @param {string} commandType - Type of command
   * @returns {string}
   */
  getSuccessMessage(commandType) {
    const messages = {
      'restart': '⚡ ПК перезагружается...',
      'sleep': '💤 ПК переходит в спящий режим...',
      'shutdown': '⏹️ ПК выключается...',
      'wake': '⏰ ПК пробуждается...',
      'lock': '🔒 ПК заблокирован',
      'unlock': '🔓 ПК разблокирован',
      'monitor_on': '🖥️ Монитор включен',
      'monitor_off': '🖥️ Монитор выключен',
      'volume_up': '🔊 Громкость увеличена',
      'volume_down': '🔉 Громкость уменьшена',
      'mute': '🔇 Звук отключен',
      'unmute': '🔊 Звук включен',
      'clipboard_get': '📋 Содержимое буфера обмена:',
      'screenshot': '📸 Скриншот готов'
    };

    return messages[commandType] || '✅ Команда выполнена';
  }

  /**
   * Send power command
   */
  async sendPowerCommand(userId, deviceId, action) {
    return this.sendCommand(userId, deviceId, action);
  }

  /**
   * Send monitor command
   */
  async sendMonitorCommand(userId, deviceId, state) {
    return this.sendCommand(userId, deviceId, `monitor_${state}`);
  }

  /**
   * Send volume command
   */
  async sendVolumeCommand(userId, deviceId, action, level = null) {
    const parameters = level ? { level } : {};
    return this.sendCommand(userId, deviceId, `volume_${action}`, parameters);
  }

  /**
   * Get system status
   */
  async getSystemStatus(userId, deviceId) {
    return this.sendCommand(userId, deviceId, 'status');
  }

  /**
   * Get screenshot
   */
  async getScreenshot(userId, deviceId) {
    return this.sendCommand(userId, deviceId, 'screenshot');
  }

  /**
   * Get clipboard
   */
  async getClipboard(userId, deviceId) {
    return this.sendCommand(userId, deviceId, 'clipboard_get');
  }

  /**
   * Set clipboard
   */
  async setClipboard(userId, deviceId, content) {
    return this.sendCommand(userId, deviceId, 'clipboard_set', { content });
  }

  /**
   * Get process list
   */
  async getProcessList(userId, deviceId) {
    return this.sendCommand(userId, deviceId, 'process_list');
  }

  /**
   * Kill process
   */
  async killProcess(userId, deviceId, pid) {
    return this.sendCommand(userId, deviceId, 'process_kill', { pid });
  }

  /**
   * Launch program
   */
  async launchProgram(userId, deviceId, programPath) {
    return this.sendCommand(userId, deviceId, 'launch_program', { path: programPath });
  }
}

module.exports = {
  CommandDispatcher,
  createCommandDispatcher: (workerUrl) => new CommandDispatcher(workerUrl)
};
