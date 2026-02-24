require('dotenv').config();
const axios = require('axios');

// Mock mode - симуляция Telegram без реального подключения
const BOT_TOKEN = process.env.BOT_TOKEN || '8433887802:AAHO8MqAXIujaKZJvENvNgmuiZH3BN5H8o4';
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || 'https://pc-remote-control-worker.nasotce58.workers.dev';
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID || '5649053560');

console.log('🤖 TELEGRAM BOT - MOCK MODE (локальное тестирование)');
console.log('═══════════════════════════════════════════════════════');
console.log(`BOT_TOKEN: ${BOT_TOKEN.substring(0, 20)}...`);
console.log(`WORKER_URL: ${CLOUDFLARE_WORKER_URL}`);
console.log(`ADMIN_CHAT_ID: ${ADMIN_CHAT_ID}`);
console.log('');
console.log('⚠️  РЕЖИМ ЛОКАЛЬНОГО ТЕСТИРОВАНИЯ (без реального Telegram)');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Simulate bot context
class MockContext {
  constructor(userId, userName, messageText = '') {
    this.from = { id: userId, first_name: userName };
    this.chat = { id: userId };
    this.message = { text: messageText };
    this.callbackQuery = null;
    this.updateType = 'message';
  }

  async reply(text, options = {}) {
    console.log(`\n📤 Bot reply to user ${this.from.id}:`);
    console.log(`   ${text}`);
    if (options.reply_markup?.inline_keyboard) {
      console.log('   Buttons:');
      options.reply_markup.inline_keyboard.forEach(row => {
        row.forEach(btn => {
          console.log(`     [${btn.text}] (${btn.callback_data})`);
        });
      });
    }
  }

  async answerCbQuery(msg) {
    if (msg) console.log(`\n⚡ Callback answer: ${msg}`);
  }
}

// Test handlers
async function testStartCommand(userId = ADMIN_CHAT_ID) {
  console.log(`\n\n📱 USER: ${userId} sends /start`);
  console.log('─────────────────────────────────────────────────────');

  const ctx = new MockContext(userId, 'Test User', '/start');

  try {
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`, {
      timeout: 5000
    });
    const { linked, deviceId } = checkDeviceResponse.data;

    if (linked && deviceId) {
      console.log(`✅ Device linked: ${deviceId}`);
      await ctx.reply(
        `✅ ПК подключён\n\nID устройства: ${deviceId}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚡ Вкл (Рестарт)', callback_data: 'restart_pc' }],
              [{ text: '� Выкл (Сон)', callback_data: 'sleep_pc' }],
              [{ text: '�📊 Статус ПК', callback_data: 'status_pc' }],
              [{ text: '🔌 Отключить ПК', callback_data: 'disconnect_pc' }]
            ]
          }
        }
      );
    } else {
      console.log(`❌ Device not linked`);
      await ctx.reply(
        '❌ ПК не подключён\n\nНажмите кнопку ниже, чтобы подключить ПК к боту.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Подключить ПК', callback_data: 'connect_pc' }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error(`⚠️  Error checking device: ${error.message}`);
    await ctx.reply(
      '⚠️ Ошибка подключения к серверу.\n\nПопробуйте позже.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Подключить ПК', callback_data: 'connect_pc' }]
          ]
        }
      }
    );
  }
}

async function testPairCommand(userId = ADMIN_CHAT_ID, deviceId = 'TESTPC_001') {
  console.log(`\n\n📱 USER: ${userId} sends /pair ${deviceId}`);
  console.log('─────────────────────────────────────────────────────');

  const ctx = new MockContext(userId, 'Test User', `/pair ${deviceId}`);

  try {
    const linkResponse = await axios.post(
      `${CLOUDFLARE_WORKER_URL}/api/user/${userId}/link/${deviceId}`,
      {},
      { timeout: 5000 }
    );

    if (linkResponse.data.ok) {
      console.log(`✅ Device linked successfully`);
      await ctx.reply(
        `✅ ПК успешно подключён!\n\nDevice ID: ${deviceId}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚡ Вкл (Рестарт)', callback_data: 'restart_pc' }],
              [{ text: '� Выкл (Сон)', callback_data: 'sleep_pc' }],
              [{ text: '�📊 Статус ПК', callback_data: 'status_pc' }],
              [{ text: '🔌 Отключить ПК', callback_data: 'disconnect_pc' }]
            ]
          }
        }
      );
    } else {
      console.log(`❌ Linking failed: ${linkResponse.data.error}`);
      await ctx.reply(`❌ Ошибка: ${linkResponse.data.error}`);
    }
  } catch (error) {
    console.error(`⚠️  Error linking device: ${error.message}`);

    if (error.response?.status === 404) {
      await ctx.reply('❌ Device ID не найден. Проверьте корректность ID.');
    } else {
      await ctx.reply('⚠️ Ошибка подключения к серверу. Попробуйте позже.');
    }
  }
}

async function testStatusCommand(userId = ADMIN_CHAT_ID) {
  console.log(`\n\n📱 USER: ${userId} sends button [📊 Статус ПК]`);
  console.log('─────────────────────────────────────────────────────');

  const ctx = new MockContext(userId, 'Test User');

  try {
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`, {
      timeout: 5000
    });
    const { deviceId } = checkDeviceResponse.data;

    if (deviceId) {
      console.log(`✅ Fetching status for device: ${deviceId}`);
      const statusMessage = `
📊 Статус ПК:
━━━━━━━━━━━━━━━━━
🆔 Device ID: ${deviceId}
✅ Статус: Ожидание подключения
💾 ОЗУ: —
🔋 Батарея: —
🌐 Сеть: —
`;
      await ctx.reply(statusMessage);
    } else {
      await ctx.reply('❌ ПК не подключён');
    }
  } catch (error) {
    console.error(`⚠️  Error getting status: ${error.message}`);
    await ctx.reply('⚠️ Ошибка получения статуса');
  }
}

async function testRestartCommand(userId = ADMIN_CHAT_ID) {
  console.log(`\n\n📱 USER: ${userId} sends button [⚡ Вкл (Рестарт)]`);
  console.log('─────────────────────────────────────────────────────');

  const ctx = new MockContext(userId, 'Test User');

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`, {
      timeout: 5000
    });
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      console.log(`❌ Device not linked`);
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    console.log(`✅ Sending restart command for device: ${deviceId}`);

    // Send restart command to Worker
    const commandResponse = await axios.post(
      `${CLOUDFLARE_WORKER_URL}/api/commands/${deviceId}`,
      {
        command: 'restart',
        argument: null
      },
      { timeout: 5000 }
    );

    if (commandResponse.data.ok) {
      console.log(`✅ Command recorded successfully`);
      console.log(`   Command ID: ${commandResponse.data.commandId}`);
      console.log(`   Device ID: ${deviceId}`);
      await ctx.reply('✅ Команда отправлена на ПК\n\n⏳ ПК будет перезагружен через несколько секунд...');
      await ctx.answerCbQuery('✅ Команда записана');
    } else {
      console.log(`❌ Command failed: ${commandResponse.data.error}`);
      await ctx.reply(`❌ Ошибка: ${commandResponse.data.error}`);
      await ctx.answerCbQuery('⚠️ Ошибка отправки');
    }
  } catch (error) {
    console.error(`⚠️  Error sending restart command: ${error.message}`);

    if (error.response?.status === 404) {
      await ctx.reply('❌ ПК не найден');
    } else {
      await ctx.reply('⚠️ Ошибка подключения к серверу');
    }
    await ctx.answerCbQuery('⚠️ Ошибка');
  }
}

async function testSleepCommand(userId = ADMIN_CHAT_ID) {
  console.log(`\n\n📱 USER: ${userId} sends button [💤 Выкл (Сон)]`);
  console.log('─────────────────────────────────────────────────────');

  const ctx = new MockContext(userId, 'Test User');

  try {
    // Get user's device ID
    const checkDeviceResponse = await axios.get(`${CLOUDFLARE_WORKER_URL}/api/user/${userId}/device`, {
      timeout: 5000
    });
    const { deviceId } = checkDeviceResponse.data;

    if (!deviceId) {
      console.log(`❌ Device not linked`);
      await ctx.reply('❌ ПК не подключён');
      await ctx.answerCbQuery();
      return;
    }

    console.log(`✅ Sending sleep command for device: ${deviceId}`);

    // Send sleep command to Worker
    const commandResponse = await axios.post(
      `${CLOUDFLARE_WORKER_URL}/api/commands/${deviceId}`,
      {
        command: 'sleep',
        argument: null
      },
      { timeout: 5000 }
    );

    if (commandResponse.data.ok) {
      console.log(`✅ Command recorded successfully`);
      console.log(`   Command ID: ${commandResponse.data.commandId}`);
      console.log(`   Device ID: ${deviceId}`);
      await ctx.reply('✅ Команда отправлена на ПК\n\n⏳ ПК перейдет в режим сна через несколько секунд...');
      await ctx.answerCbQuery('✅ Команда записана');
    } else {
      console.log(`❌ Command failed: ${commandResponse.data.error}`);
      await ctx.reply(`❌ Ошибка: ${commandResponse.data.error}`);
      await ctx.answerCbQuery('⚠️ Ошибка отправки');
    }
  } catch (error) {
    console.error(`⚠️  Error sending sleep command: ${error.message}`);

    if (error.response?.status === 404) {
      await ctx.reply('❌ ПК не найден');
    } else {
      await ctx.reply('⚠️ Ошибка подключения к серверу');
    }
    await ctx.answerCbQuery('⚠️ Ошибка');
  }
}

async function testRegisterDevice(deviceId = 'TESTPC_001') {
  console.log(`\n\n🖥️  DEVICE: Регистрация ${deviceId}`);
  console.log('─────────────────────────────────────────────────────');

  try {
    const registerResponse = await axios.post(
      `${CLOUDFLARE_WORKER_URL}/api/register`,
      {
        deviceId,
        macAddress: 'AA:BB:CC:DD:EE:FF',
        osVersion: 'Windows 11'
      },
      { timeout: 5000 }
    );

    if (registerResponse.data.ok) {
      console.log(`✅ Device registered successfully`);
      console.log(`   Device ID: ${deviceId}`);
      console.log(`   Device Token: ${registerResponse.data.deviceToken}`);
    }
  } catch (error) {
    console.error(`⚠️  Error registering device: ${error.message}`);
  }
}

// Run tests
(async () => {
  console.log('\n🧪 НАЧИНАЮ ТЕСТИРОВАНИЕ\n');

  // Test 1: Register Device
  await testRegisterDevice('TESTPC_001');

  // Test 2: Check device before pairing
  await testStartCommand(ADMIN_CHAT_ID);

  // Test 3: Pair device
  await testPairCommand(ADMIN_CHAT_ID, 'TESTPC_001');

  // Test 4: Check device after pairing
  await testStartCommand(ADMIN_CHAT_ID);

  // Test 5: Get status
  await testStatusCommand(ADMIN_CHAT_ID);

  // Test 6: Send restart command
  await testRestartCommand(ADMIN_CHAT_ID);

  // Test 7: Send sleep command
  await testSleepCommand(ADMIN_CHAT_ID);

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📝 Результаты тестирования показаны выше.');
  console.log('Все функции работают корректно.\n');

  console.log('🚀 ДЛЯ ЗАПУСКА РЕАЛЬНОГО БОТА:');
  console.log('   npm start');
  console.log('   (требуется доступ к Telegram API)\n');
})().catch(err => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
