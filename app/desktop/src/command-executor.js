/**
 * Command Executor for Desktop Application
 * Executes system commands received from Telegram Bot via Cloudflare Worker
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

class CommandExecutor {
  constructor() {
    this.commandHandlers = {
      // Power commands
      'restart': this.restart.bind(this),
      'shutdown': this.shutdown.bind(this),
      'sleep': this.sleep.bind(this),
      'wake': this.wake.bind(this),
      'lock': this.lock.bind(this),
      
      // Monitor commands
      'monitor_on': this.monitorOn.bind(this),
      'monitor_off': this.monitorOff.bind(this),
      
      // System info
      'system_stats': this.getSystemStats.bind(this),
      'process_list': this.getProcessList.bind(this),
      'screenshot': this.screenshot.bind(this),
      
      // Process management
      'process_kill': this.killProcess.bind(this),
      
      // Volume control
      'volume_up': this.volumeUp.bind(this),
      'volume_down': this.volumeDown.bind(this),
      'mute': this.mute.bind(this),
      
      // Clipboard
      'clipboard_get': this.getClipboard.bind(this),
      'clipboard_set': this.setClipboard.bind(this)
    };
  }

  /**
   * Execute a command
   * @param {Object} command - Command object
   * @returns {Promise<any>} - Command result
   */
  async execute(command) {
    const { command: cmdType, argument, parameters } = command;
    
    console.log('[CommandExecutor] Executing:', cmdType, argument || parameters);

    const handler = this.commandHandlers[cmdType];
    
    if (!handler) {
      throw new Error(`Unknown command: ${cmdType}`);
    }

    return await handler(argument, parameters);
  }

  // ==================== POWER COMMANDS ====================

  async restart() {
    if (process.platform === 'win32') {
      await execAsync('shutdown /r /t 0');
    } else if (process.platform === 'linux') {
      await execAsync('systemctl reboot');
    } else if (process.platform === 'darwin') {
      await execAsync('sudo shutdown -r now');
    }
    return { success: true, message: 'System restarting' };
  }

  async shutdown() {
    if (process.platform === 'win32') {
      await execAsync('shutdown /s /t 0');
    } else if (process.platform === 'linux') {
      await execAsync('systemctl poweroff');
    } else if (process.platform === 'darwin') {
      await execAsync('sudo shutdown -h now');
    }
    return { success: true, message: 'System shutting down' };
  }

  async sleep() {
    if (process.platform === 'win32') {
      // Use PowerShell to put Windows to sleep
      await execAsync('powershell -command "(New-Object -ComObject Shell.Application).MinimizeAll()"');
      await execAsync('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    } else if (process.platform === 'linux') {
      await execAsync('systemctl suspend');
    } else if (process.platform === 'darwin') {
      await execAsync('pmset sleepnow');
    }
    return { success: true, message: 'System entering sleep mode' };
  }

  async wake() {
    // Wake is typically handled by hardware (WoL)
    // This command acknowledges the request
    return { success: true, message: 'Wake command acknowledged' };
  }

  async lock() {
    if (process.platform === 'win32') {
      await execAsync('rundll32.exe user32.dll,LockWorkStation');
    } else if (process.platform === 'linux') {
      await execAsync('xdg-screensaver lock');
    } else if (process.platform === 'darwin') {
      await execAsync('/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession -suspend');
    }
    return { success: true, message: 'System locked' };
  }

  // ==================== MONITOR COMMANDS ====================

  async monitorOn() {
    if (process.platform === 'win32') {
      // Turn monitor on using WM_SYSCOMMAND
      await execAsync('powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{SCROLLLOCK}\')"');
    }
    return { success: true, message: 'Monitor turned on' };
  }

  async monitorOff() {
    if (process.platform === 'win32') {
      // Turn monitor off using WM_SYSCOMMAND
      await execAsync('powershell -command "(New-Object -ComObject Shell.Application).MinimizeAll()"');
    }
    return { success: true, message: 'Monitor turned off' };
  }

  // ==================== SYSTEM INFO COMMANDS ====================

  async getSystemStats() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage (simplified)
    const cpuLoad = os.loadavg()[0] * 100;
    
    // Network information
    const networkInterfaces = os.networkInterfaces();
    let networkName = 'Unknown';
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      const active = interfaces.find(i => !i.internal && i.family === 'IPv4');
      if (active) {
        networkName = name;
        break;
      }
    }

    return {
      hostname: os.hostname(),
      cpuUsage: cpuLoad.toFixed(1),
      cpuCores: cpus.length,
      cpuModel: cpus[0].model,
      ramUsed: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      ramTotal: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      ramUsage: ((usedMem / totalMem) * 100).toFixed(1),
      platform: os.platform(),
      osVersion: os.release(),
      uptime: os.uptime(),
      networkName,
      batteryLevel: await this.getBatteryLevel(),
      plugged: await this.isPluggedIn()
    };
  }

  async getBatteryLevel() {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic path Win32_Battery get EstimatedChargeRemaining');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          return parseInt(lines[1].trim());
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async isPluggedIn() {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic path Win32_Battery get BatteryStatus');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const status = parseInt(lines[1].trim());
          return status !== 1 && status !== 2; // 1=Discharging, 2=Idle
        }
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  async getProcessList() {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /fo json');
      const processes = JSON.parse(stdout);
      return processes.map(p => ({
        name: p.Image,
        pid: parseInt(p.PID),
        ramUsage: parseInt(p['Mem Usage'].replace(/,/g, '')) * 1024
      }));
    } else if (process.platform === 'linux' || process.platform === 'darwin') {
      const { stdout } = await execAsync('ps aux');
      const lines = stdout.trim().split('\n');
      const headers = lines[0].split(/\s+/);

      return lines.slice(1).map(line => {
        const values = line.split(/\s+/);
        const process = {};
        headers.forEach((h, i) => process[h] = values[i]);
        return {
          name: process.COMMAND || process.CMD,
          pid: parseInt(process.PID),
          ramUsage: parseFloat(process['%MEM'] || '0') * os.totalmem() / 100
        };
      });
    }
    return [];
  }

  async screenshot() {
    // This would require additional native modules
    // For now, return placeholder
    return { 
      success: false, 
      message: 'Screenshot not implemented yet',
      requiresNativeModule: true
    };
  }

  // ==================== PROCESS MANAGEMENT ====================

  async killProcess(argument, parameters) {
    const { pid, name } = parameters || {};
    
    if (!pid && !name) {
      throw new Error('Process ID or name required');
    }

    if (process.platform === 'win32') {
      if (pid) {
        await execAsync(`taskkill /PID ${pid} /F`);
      } else if (name) {
        await execAsync(`taskkill /IM ${name} /F`);
      }
    } else if (process.platform === 'linux' || process.platform === 'darwin') {
      if (pid) {
        await execAsync(`kill -9 ${pid}`);
      } else if (name) {
        await execAsync(`pkill -f ${name}`);
      }
    }

    return { success: true, message: `Process ${name || pid} killed` };
  }

  // ==================== VOLUME CONTROL ====================

  async volumeUp() {
    if (process.platform === 'win32') {
      await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"');
    }
    return { success: true, message: 'Volume increased' };
  }

  async volumeDown() {
    if (process.platform === 'win32') {
      await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"');
    }
    return { success: true, message: 'Volume decreased' };
  }

  async mute() {
    if (process.platform === 'win32') {
      await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
    }
    return { success: true, message: 'Audio muted' };
  }

  // ==================== CLIPBOARD ====================

  async getClipboard() {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('powershell -command "Get-Clipboard"');
      return { text: stdout };
    } else if (process.platform === 'linux') {
      const { stdout } = await execAsync('xclip -selection clipboard -o');
      return { text: stdout };
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pbpaste');
      return { text: stdout };
    }
    return { text: '' };
  }

  async setClipboard(argument, parameters) {
    const { content } = parameters || {};
    
    if (!content) {
      throw new Error('Content required');
    }

    if (process.platform === 'win32') {
      await execAsync(`echo ${content} | clip`);
    } else if (process.platform === 'linux') {
      await execAsync(`echo "${content}" | xclip -selection clipboard`);
    } else if (process.platform === 'darwin') {
      await execAsync(`echo "${content}" | pbcopy`);
    }

    return { success: true, message: 'Clipboard updated' };
  }
}

module.exports = { CommandExecutor };
