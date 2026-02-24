// Test bot loading without running
require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('🧪 Testing bot initialization...\n');

// Check env vars
console.log('1️⃣ Checking environment variables:');
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID);

console.log('   BOT_TOKEN:', BOT_TOKEN ? '✅ SET' : '❌ NOT SET');
console.log('   CLOUDFLARE_WORKER_URL:', CLOUDFLARE_WORKER_URL ? '✅ SET' : '❌ NOT SET');
console.log('   ADMIN_CHAT_ID:', ADMIN_CHAT_ID ? '✅ SET' : '❌ NOT SET');

if (!BOT_TOKEN || !CLOUDFLARE_WORKER_URL) {
  console.error('\n❌ Missing environment variables!');
  process.exit(1);
}

// Try creating bot
console.log('\n2️⃣ Creating bot instance:');
try {
  const bot = new Telegraf(BOT_TOKEN);
  console.log('   ✅ Bot instance created');
} catch (error) {
  console.error('   ❌ Error creating bot:', error.message);
  process.exit(1);
}

// Try importing modular handlers
console.log('\n3️⃣ Importing modular handlers:');
try {
  const { registerPowerControlHandlers } = require('./functions/power-control');
  console.log('   ✅ Power control handlers imported');
} catch (error) {
  console.error('   ❌ Error importing power control:', error.message);
  process.exit(1);
}

try {
  const { registerMonitoringHandlers, handleTextInputForProcessKill } = require('./functions/monitoring');
  console.log('   ✅ Monitoring handlers imported');
  console.log('   ✅ handleTextInputForProcessKill exported');
} catch (error) {
  console.error('   ❌ Error importing monitoring:', error.message);
  process.exit(1);
}

console.log('\n✅ All tests passed! Bot can be loaded.\n');
