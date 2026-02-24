const { app, BrowserWindow, Menu, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { CloudflareWorkerClient } = require('./src/cloudflare-client');
const { CommandExecutor } = require('./src/command-executor');

let mainWindow;
let cloudflareClient;
let commandExecutor;
let deviceConfig = null;

// Configuration paths
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      deviceConfig = JSON.parse(data);
      console.log('[Main] Config loaded:', deviceConfig);
      return deviceConfig;
    }
  } catch (error) {
    console.error('[Main] Error loading config:', error.message);
  }
  return null;
}

function saveConfig(config) {
  try {
    deviceConfig = config;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[Main] Config saved:', config);
    return true;
  } catch (error) {
    console.error('[Main] Error saving config:', error.message);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    show: false
  });

  // Load the app
  const startUrl = process.env.REACT_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Настройки',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'О программе',
              message: 'PC Remote Control',
              detail: `Версия: ${app.getVersion()}\nУправление ПК через Telegram`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function initializeCloudflareClient() {
  const config = loadConfig();
  
  if (!config || !config.deviceId || !config.workerUrl) {
    console.log('[Main] No configuration found. Please configure in settings.');
    return;
  }

  commandExecutor = new CommandExecutor();
  
  cloudflareClient = new CloudflareWorkerClient({
    workerUrl: config.workerUrl,
    deviceId: config.deviceId,
    deviceToken: config.deviceToken || '',
    pollInterval: 3000,
    heartbeatInterval: 30000
  });

  // Handle commands from Worker
  cloudflareClient.on('onCommand', async (command) => {
    console.log('[Main] Executing command:', command);
    
    try {
      const result = await commandExecutor.execute(command);
      
      // Send notification
      new Notification({
        title: 'Команда выполнена',
        body: `Команда "${command.command}" успешно выполнена`
      }).show();
      
      return result;
    } catch (error) {
      console.error('[Main] Command execution error:', error.message);
      
      new Notification({
        title: 'Ошибка выполнения',
        body: `Не удалось выполнить команду: ${error.message}`
      }).show();
      
      throw error;
    }
  });

  // Handle pairing requests
  cloudflareClient.on('onPairingRequest', async (pairingRequest) => {
    console.log('[Main] Pairing request:', pairingRequest);
    
    const { telegramUsername, telegramUserId } = pairingRequest;
    
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Разрешить', 'Отказать'],
      defaultId: 0,
      title: 'Запрос на подключение',
      message: `Пользователь @${telegramUsername} хочет подключить этот ПК`,
      detail: 'Разрешить доступ к управлению этим компьютером?'
    });
    
    if (response === 0) {
      // Allow
      await cloudflareClient.confirmPairing(telegramUserId);
      new Notification({
        title: 'Подключение разрешено',
        body: `@${telegramUsername} теперь может управлять этим ПК`
      }).show();
    } else {
      // Deny
      await cloudflareClient.denyPairing(telegramUserId);
    }
  });

  // Handle errors
  cloudflareClient.on('onError', (error) => {
    console.error('[Main] Client error:', error.message);
    mainWindow.webContents.send('connection-error', error.message);
  });

  // Handle status changes
  cloudflareClient.on('onStatusChange', (status) => {
    console.log('[Main] Status changed:', status);
    mainWindow.webContents.send('connection-status', status);
    
    if (status === 'online') {
      new Notification({
        title: 'Подключение установлено',
        body: 'ПК онлайн и готов к управлению'
      }).show();
    } else {
      new Notification({
        title: 'Подключение потеряно',
        body: 'ПК офлайн'
      }).show();
    }
  });

  // Start client
  cloudflareClient.start();
}

app.on('ready', () => {
  createWindow();
  createMenu();
  initializeCloudflareClient();
});

app.on('window-all-closed', () => {
  if (cloudflareClient) {
    cloudflareClient.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
    initializeCloudflareClient();
  }
});

// IPC handlers

// Get configuration
ipcMain.handle('get-config', async () => {
  return loadConfig() || {};
});

// Save configuration
ipcMain.handle('save-config', async (event, config) => {
  const success = saveConfig(config);
  
  if (success) {
    // Restart client with new config
    if (cloudflareClient) {
      cloudflareClient.stop();
    }
    initializeCloudflareClient();
  }
  
  return success;
});

// Get connection status
ipcMain.handle('get-connection-status', async () => {
  return cloudflareClient ? cloudflareClient.getStatus() : 'disconnected';
});

// Get system info
ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    totalMem: os.totalmem(),
    cpus: os.cpus().length,
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node
  };
});

// Get app version
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

// Generate device ID
ipcMain.handle('generate-device-id', async () => {
  const crypto = require('crypto');
  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${id.slice(0, 4)}-${id.slice(4, 8)}`;
});

// Minimize window
ipcMain.on('minimize-window', (event) => {
  mainWindow.minimize();
});

// Maximize window
ipcMain.on('maximize-window', (event) => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

// Close window
ipcMain.on('close-window', (event) => {
  mainWindow.close();
});

// Test connection
ipcMain.handle('test-connection', async (event, config) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${config.workerUrl}/api/device/${config.deviceId}/status`, {
      timeout: 5000
    });
    return { success: response.data.ok, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
