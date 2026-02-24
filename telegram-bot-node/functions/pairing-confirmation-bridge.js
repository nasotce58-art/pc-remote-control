/**
 * pairing-confirmation-bridge.js
 * Bridge for exchanging pairing confirmation messages between Desktop and Bot
 * 
 * When Desktop shows confirmation dialog and user confirms/denies,
 * Desktop sends result to Worker API, bot polls for result
 * 
 * Used by both:
 * - Desktop PollingService (sends confirmation)
 * - Bot pairing-handler (polls for result)
 */

const axios = require('axios');

class PairingConfirmationBridge {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
    this.requestTimeout = 5000;
    this.pendingConfirmations = new Map(); // Store pending pairing confirmations in memory
  }

  /**
   * Desktop sends pairing confirmation result to Worker
   * Called by Desktop PollingService when user confirms/denies pairing
   * 
   * @param {string} deviceId - Device ID
   * @param {number} telegramUserId - Telegram user ID from the request
   * @param {boolean} confirmed - Whether user confirmed
   * @param {string} reason - Optional reason for denial
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async setPairingResult(deviceId, telegramUserId, confirmed, reason = null) {
    try {
      console.log(`[PairingBridge] Setting pairing result: device=${deviceId}, user=${telegramUserId}, confirmed=${confirmed}`);

      // Send to Worker API
      const response = await axios.post(
        `${this.workerUrl}/api/pairing/result`,
        {
          deviceId: deviceId,
          telegramUserId: telegramUserId,
          confirmed: confirmed,
          denied: !confirmed,
          reason: reason,
          timestamp: new Date().toISOString()
        },
        { timeout: this.requestTimeout }
      );

      if (response.data.success) {
        console.log(`[PairingBridge] Pairing result recorded successfully`);
        return {
          success: true,
          message: 'Pairing result recorded'
        };
      } else {
        throw new Error(response.data.error || 'Failed to record pairing result');
      }

    } catch (error) {
      console.error(`[PairingBridge] Error recording pairing result:`, error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Desktop sends pairing confirmation request info to store
   * Called by Desktop PollingService to notify bot about pending pairing
   * 
   * @param {string} deviceId - Device ID
   * @param {number} telegramUserId - Telegram user ID
   * @param {string} telegramUsername - Telegram username
   * @returns {Promise<{success: boolean}>}
   */
  async registerPairingRequest(deviceId, telegramUserId, telegramUsername) {
    try {
      console.log(`[PairingBridge] Registering pairing request: device=${deviceId}, user=${telegramUserId}`);

      // Store locally for quick access
      const key = `${deviceId}_${telegramUserId}`;
      this.pendingConfirmations.set(key, {
        deviceId: deviceId,
        telegramUserId: telegramUserId,
        telegramUsername: telegramUsername,
        timestamp: Date.now(),
        confirmed: null // null = pending, true = confirmed, false = denied
      });

      // Also notify Worker API
      const response = await axios.post(
        `${this.workerUrl}/api/pairing/register`,
        {
          deviceId: deviceId,
          telegramUserId: telegramUserId,
          telegramUsername: telegramUsername,
          timestamp: new Date().toISOString()
        },
        { timeout: this.requestTimeout }
      );

      return {
        success: response.data.success || true
      };

    } catch (error) {
      console.error(`[PairingBridge] Error registering pairing request:`, error.message);
      return {
        success: false
      };
    }
  }

  /**
   * Bot polls for pairing confirmation result
   * Called by pairing-handler when waiting for Desktop confirmation
   * 
   * @param {string} deviceId - Device ID
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<{confirmed?: boolean, denied?: boolean, expired?: boolean, pending?: boolean}>}
   */
  async getPairingResult(deviceId, telegramUserId) {
    try {
      // Query Worker API for result
      const response = await axios.get(
        `${this.workerUrl}/api/pairing/result`,
        {
          params: {
            deviceId: deviceId,
            userId: telegramUserId
          },
          timeout: this.requestTimeout
        }
      );

      const { confirmed, denied, expired } = response.data;

      return {
        confirmed: confirmed === true,
        denied: denied === true,
        expired: expired === true,
        pending: !confirmed && !denied && !expired
      };

    } catch (error) {
      console.error(`[PairingBridge] Error getting pairing result:`, error.message);

      // Return pending state on error (will retry)
      return {
        pending: true
      };
    }
  }

  /**
   * Clean up expired pairing requests (older than timeout)
   * Called periodically by maintenance tasks
   * 
   * @param {number} timeoutMs - Timeout in milliseconds (default: 120000 = 2 min)
   */
  cleanupExpiredRequests(timeoutMs = 120000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, request] of this.pendingConfirmations.entries()) {
      if (now - request.timestamp > timeoutMs) {
        this.pendingConfirmations.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[PairingBridge] Cleaned up ${cleaned} expired pairing requests`);
    }

    return cleaned;
  }

  /**
   * Get pending confirmation for Desktop to display
   * Called by Desktop PollingService
   * 
   * @param {string} deviceId - Device ID
   * @returns {Promise<{pending: boolean, userId?: number, username?: string}>}
   */
  async getPendingConfirmation(deviceId) {
    try {
      const response = await axios.get(
        `${this.workerUrl}/api/pairing/pending`,
        {
          params: { deviceId: deviceId },
          timeout: this.requestTimeout
        }
      );

      return {
        pending: response.data.pending || false,
        userId: response.data.telegramUserId,
        username: response.data.telegramUsername
      };

    } catch (error) {
      console.error(`[PairingBridge] Error getting pending confirmation:`, error.message);
      return {
        pending: false
      };
    }
  }
}

module.exports = {
  PairingConfirmationBridge,
  createPairingBridge: (workerUrl) => new PairingConfirmationBridge(workerUrl)
};
