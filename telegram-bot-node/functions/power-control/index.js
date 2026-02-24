// Power Control Functions Index
// Раздел: ⚡ Питание и сеть
// Группирует все функции управления питанием

const { handleMonitorToggle } = require('./monitor');
const { handleLockPC } = require('./lock');
const { handleShutdownTimer, handleTimerSelection } = require('./timer');
const { handleSleepPC } = require('./sleep');
const { handleRestartPC } = require('./restart');
const { handleShutdownPC } = require('./shutdown');

/**
 * Register all power control functions
 * 
 * @param {object} bot - Telegraf bot instance
 * @param {string} workerUrl - Worker URL
 */
function registerPowerControlHandlers(bot, workerUrl) {
  // Register callback handlers
  bot.action('monitor_toggle', async (ctx) => {
    const userId = ctx.from?.id;
    await handleMonitorToggle(ctx, userId, workerUrl);
  });

  bot.action('lock_pc', async (ctx) => {
    const userId = ctx.from?.id;
    await handleLockPC(ctx, userId, workerUrl);
  });

  bot.action('shutdown_timer', async (ctx) => {
    const userId = ctx.from?.id;
    await handleShutdownTimer(ctx, userId, workerUrl);
  });

  bot.action('timer_30min', async (ctx) => {
    const userId = ctx.from?.id;
    await handleTimerSelection(ctx, userId, 30, workerUrl);
  });

  bot.action('timer_60min', async (ctx) => {
    const userId = ctx.from?.id;
    await handleTimerSelection(ctx, userId, 60, workerUrl);
  });

  bot.action('timer_120min', async (ctx) => {
    const userId = ctx.from?.id;
    await handleTimerSelection(ctx, userId, 120, workerUrl);
  });

  bot.action('sleep_pc_menu', async (ctx) => {
    const userId = ctx.from?.id;
    await handleSleepPC(ctx, userId, workerUrl);
  });

  bot.action('restart_pc_menu', async (ctx) => {
    const userId = ctx.from?.id;
    await handleRestartPC(ctx, userId, workerUrl);
  });

  bot.action('shutdown_pc_menu', async (ctx) => {
    const userId = ctx.from?.id;
    await handleShutdownPC(ctx, userId, workerUrl);
  });
}

module.exports = {
  registerPowerControlHandlers,
  handleMonitorToggle,
  handleLockPC,
  handleShutdownTimer,
  handleTimerSelection,
  handleSleepPC,
  handleRestartPC,
  handleShutdownPC
};
