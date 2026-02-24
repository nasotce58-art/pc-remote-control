/**
 * device-storage.js
 * Module for managing device-user associations via Worker KV Storage
 * 
 * API Endpoints:
 * - POST /api/link-device - Link user to device
 * - GET /api/user/{userId}/device - Get linked device for user
 * - DELETE /api/unlink-device - Unlink user from device
 * - GET /api/device/{deviceId}/status - Get device status
 */

const axios = require('axios');

class DeviceStorage {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
    this.requestTimeout = 5000;
  }

  /**
   * Link a Telegram user to a device after successful pairing
   * @param {number} userId - Telegram user ID
   * @param {string} deviceId - Device ID (format: XXXX-XXXX)
   * @param {string} username - Telegram username (without @)
   * @returns {Promise<{success: boolean, message: string, sessionToken?: string}>}
   */
  async linkUserToDevice(userId, deviceId, username) {
    try {
      const response = await axios.post(
        `${this.workerUrl}/api/link-device`,
        {
          telegramUserId: userId,
          telegramUsername: username,
          deviceId: deviceId,
          timestamp: new Date().toISOString()
        },
        { timeout: this.requestTimeout }
      );

      return {
        success: true,
        message: 'Device linked successfully',
        sessionToken: response.data.sessionToken
      };
    } catch (error) {
      console.error(`[DeviceStorage] Error linking user ${userId} to device ${deviceId}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to link device'
      };
    }
  }

  /**
   * Check if user has linked device
   * @param {number} userId - Telegram user ID
   * @returns {Promise<{linked: boolean, deviceId?: string, status?: string}>}
   */
  async checkUserDevice(userId) {
    try {
      const response = await axios.get(
        `${this.workerUrl}/api/user/${userId}/device`,
        { timeout: this.requestTimeout }
      );

      return {
        linked: response.data.linked || false,
        deviceId: response.data.deviceId,
        status: response.data.status
      };
    } catch (error) {
      console.error(`[DeviceStorage] Error checking device for user ${userId}:`, error.message);
      return {
        linked: false,
        error: error.response?.data?.error || 'Failed to check device'
      };
    }
  }

  /**
   * Unlink user from device
   * @param {number} userId - Telegram user ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async unlinkUser(userId) {
    try {
      const response = await axios.delete(
        `${this.workerUrl}/api/unlink-device`,
        {
          data: { telegramUserId: userId },
          timeout: this.requestTimeout
        }
      );

      return {
        success: true,
        message: 'Device unlinked successfully'
      };
    } catch (error) {
      console.error(`[DeviceStorage] Error unlinking user ${userId}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to unlink device'
      };
    }
  }

  /**
   * Get device status
   * @param {string} deviceId - Device ID
   * @returns {Promise<{online: boolean, lastSeen?: string, status?: string}>}
   */
  async checkDeviceStatus(deviceId) {
    try {
      const response = await axios.get(
        `${this.workerUrl}/api/device/${deviceId}/status`,
        { timeout: this.requestTimeout }
      );

      if (response.data.ok && response.data.device) {
        return {
          online: response.data.device.status === 'online',
          lastSeen: response.data.device.lastSeen,
          status: response.data.device.status
        };
      }

      return {
        online: false,
        status: 'offline'
      };
    } catch (error) {
      console.error(`[DeviceStorage] Error checking status for device ${deviceId}:`, error.message);
      return {
        online: false,
        status: 'offline',
        error: error.response?.data?.error || 'Failed to check device status'
      };
    }
  }

  /**
   * Check if device ID is valid format (XXXX-XXXX)
   * @param {string} deviceId - Device ID to validate
   * @returns {boolean}
   */
  isValidDeviceId(deviceId) {
    // Format: XXXX-XXXX (4 alphanumeric, dash, 4 alphanumeric)
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    return pattern.test(deviceId);
  }
}

module.exports = {
  DeviceStorage,
  createDeviceStorage: (workerUrl) => new DeviceStorage(workerUrl)
};
