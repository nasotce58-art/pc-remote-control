/**
 * Cloudflare Worker Client for Desktop Application
 * Handles communication with Cloudflare Worker API
 * Polls for commands and sends results back
 */

const axios = require('axios');

class CloudflareWorkerClient {
  constructor(config) {
    this.workerUrl = config.workerUrl;
    this.deviceId = config.deviceId;
    this.deviceToken = config.deviceToken;
    this.pollInterval = config.pollInterval || 3000; // 3 seconds
    this.heartbeatInterval = config.heartbeatInterval || 30000; // 30 seconds
    this.isPolling = false;
    this.pollTimer = null;
    this.heartbeatTimer = null;
    this.eventHandlers = {
      onCommand: null,
      onPairingRequest: null,
      onError: null,
      onStatusChange: null
    };

    console.log('[CloudflareWorkerClient] Initialized', {
      deviceId: this.deviceId,
      workerUrl: this.workerUrl
    });
  }

  /**
   * Start polling for commands and sending heartbeats
   */
  start() {
    console.log('[CloudflareWorkerClient] Starting...');
    this.isPolling = true;
    this.startPolling();
    this.startHeartbeat();
  }

  /**
   * Stop polling and heartbeats
   */
  stop() {
    console.log('[CloudflareWorkerClient] Stopping...');
    this.isPolling = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Start polling for pending commands
   */
  startPolling() {
    const poll = async () => {
      if (!this.isPolling) return;

      try {
        await this.checkPendingCommands();
      } catch (error) {
        console.error('[CloudflareWorkerClient] Polling error:', error.message);
        if (this.eventHandlers.onError) {
          this.eventHandlers.onError(error);
        }
      }
    };

    // Initial poll
    poll();
    
    // Continue polling
    this.pollTimer = setInterval(poll, this.pollInterval);
    console.log('[CloudflareWorkerClient] Polling started (interval: ' + this.pollInterval + 'ms)');
  }

  /**
   * Start sending heartbeats to keep device online
   */
  startHeartbeat() {
    const sendHeartbeat = async () => {
      if (!this.isPolling) return;

      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('[CloudflareWorkerClient] Heartbeat error:', error.message);
      }
    };

    // Initial heartbeat
    sendHeartbeat();
    
    // Continue heartbeats
    this.heartbeatTimer = setInterval(sendHeartbeat, this.heartbeatInterval);
    console.log('[CloudflareWorkerClient] Heartbeat started (interval: ' + this.heartbeatInterval + 'ms)');
  }

  /**
   * Check for pending commands from Cloudflare Worker
   */
  async checkPendingCommands() {
    try {
      const response = await axios.get(
        `${this.workerUrl}/api/commands/${this.deviceId}/pending`,
        { timeout: 5000 }
      );

      if (response.data.ok && response.data.commands && response.data.commands.length > 0) {
        console.log(`[CloudflareWorkerClient] Received ${response.data.commands.length} pending command(s)`);
        
        for (const command of response.data.commands) {
          await this.handleCommand(command);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.error('[CloudflareWorkerClient] Device not found on server');
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle a single command
   * @param {Object} command - Command object from Worker
   */
  async handleCommand(command) {
    console.log('[CloudflareWorkerClient] Processing command:', command);

    // Check if this is a pairing request
    if (command.commandType === 'pairing_request') {
      if (this.eventHandlers.onPairingRequest) {
        this.eventHandlers.onPairingRequest(command);
      }
      return;
    }

    // Execute the command
    if (this.eventHandlers.onCommand) {
      try {
        const result = await this.eventHandlers.onCommand(command);
        
        // Send result back to Worker
        await this.completeCommand(command.commandId, result);
      } catch (error) {
        console.error('[CloudflareWorkerClient] Command execution error:', error.message);
        await this.completeCommand(command.commandId, null, error.message);
      }
    }
  }

  /**
   * Send heartbeat to Worker to keep device online
   */
  async sendHeartbeat() {
    try {
      const response = await axios.post(
        `${this.workerUrl}/api/device/${this.deviceId}/heartbeat`,
        {
          deviceToken: this.deviceToken,
          timestamp: new Date().toISOString()
        },
        { timeout: 5000 }
      );

      const wasOnline = this.lastStatus === 'online';
      this.lastStatus = 'online';

      if (!wasOnline && this.eventHandlers.onStatusChange) {
        this.eventHandlers.onStatusChange('online');
      }

      return response.data;
    } catch (error) {
      const wasOnline = this.lastStatus === 'online';
      this.lastStatus = 'offline';

      if (wasOnline && this.eventHandlers.onStatusChange) {
        this.eventHandlers.onStatusChange('offline');
      }

      throw error;
    }
  }

  /**
   * Mark command as completed
   * @param {string} commandId - Command ID
   * @param {any} result - Command result
   * @param {string} error - Error message if failed
   */
  async completeCommand(commandId, result, error = null) {
    try {
      await axios.put(
        `${this.workerUrl}/api/commands/${this.deviceId}/${commandId}/complete`,
        {
          result,
          error,
          completedAt: new Date().toISOString()
        },
        { timeout: 5000 }
      );

      console.log('[CloudflareWorkerClient] Command completed:', commandId);
    } catch (error) {
      console.error('[CloudflareWorkerClient] Failed to complete command:', error.message);
    }
  }

  /**
   * Register device on first launch
   */
  async registerDevice(macAddress, osVersion) {
    try {
      const response = await axios.post(
        `${this.workerUrl}/api/register`,
        {
          deviceId: this.deviceId,
          macAddress,
          osVersion,
          deviceToken: this.deviceToken
        },
        { timeout: 10000 }
      );

      console.log('[CloudflareWorkerClient] Device registered successfully');
      return response.data;
    } catch (error) {
      console.error('[CloudflareWorkerClient] Registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Confirm pairing request
   * @param {number} telegramUserId - Telegram user ID requesting pairing
   */
  async confirmPairing(telegramUserId) {
    try {
      const response = await axios.post(
        `${this.workerUrl}/api/pairing/confirm`,
        {
          deviceId: this.deviceId,
          telegramUserId
        },
        { timeout: 5000 }
      );

      console.log('[CloudflareWorkerClient] Pairing confirmed for user:', telegramUserId);
      return response.data;
    } catch (error) {
      console.error('[CloudflareWorkerClient] Pairing confirm failed:', error.message);
      throw error;
    }
  }

  /**
   * Deny pairing request
   * @param {number} telegramUserId - Telegram user ID requesting pairing
   */
  async denyPairing(telegramUserId) {
    try {
      const response = await axios.post(
        `${this.workerUrl}/api/pairing/deny`,
        {
          deviceId: this.deviceId,
          telegramUserId
        },
        { timeout: 5000 }
      );

      console.log('[CloudflareWorkerClient] Pairing denied for user:', telegramUserId);
      return response.data;
    } catch (error) {
      console.error('[CloudflareWorkerClient] Pairing deny failed:', error.message);
      throw error;
    }
  }

  /**
   * Set event handlers
   */
  on(event, handler) {
    if (this.eventHandlers.hasOwnProperty(event)) {
      this.eventHandlers[event] = handler;
    } else {
      console.warn('[CloudflareWorkerClient] Unknown event:', event);
    }
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return this.lastStatus || 'unknown';
  }
}

module.exports = { CloudflareWorkerClient };
