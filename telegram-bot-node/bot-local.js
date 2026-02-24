require('dotenv').config();
const WebSocket = require('ws');

const LOCAL_API_SERVER = process.env.LOCAL_API_SERVER || 'ws://localhost:3000';
const DEVICE_ID = process.env.DEVICE_ID || 'LOCAL_DEVICE_001';

let ws = null;
let wsConnected = false;
let commandQueue = [];

console.log('🤖 Local Bot Mode Started (no Telegram)');
console.log(`🌐 Connecting to LOCAL API SERVER: ${LOCAL_API_SERVER}`);

function connectToLocalServer() {
  try {
    ws = new WebSocket(LOCAL_API_SERVER);
    
    ws.on('open', () => {
      wsConnected = true;
      console.log('✅ Connected to Local API Server');
      
      // Register as bot
      ws.send(JSON.stringify({ 
        type: 'REGISTER_BOT', 
        payload: { 
          name: 'Local Bot',
          deviceId: DEVICE_ID
        } 
      }));
      
      console.log('📤 Registered with API Server');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleServerMessage(message);
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    });
    
    ws.on('close', () => {
      wsConnected = false;
      console.log('❌ Disconnected from Local API Server');
      console.log('⏳ Reconnecting in 5 seconds...');
      setTimeout(connectToLocalServer, 5000);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message || error);
    });
  } catch (error) {
    console.error('Failed to connect to Local API Server:', error.message);
  }
}

function handleServerMessage(message) {
  const { type, payload } = message;
  
  switch (type) {
    case 'COMMAND_FROM_BOT':
      console.log(`\n📨 Command received: ${payload.command}`);
      console.log(`   ID: ${payload.id}`);
      console.log(`   Time: ${payload.timestamp}`);
      commandQueue.push(payload);
      break;
      
    case 'COMMAND_RESULT':
      console.log(`\n✅ Command result received:`);
      console.log(`   ID: ${payload.commandId}`);
      console.log(`   Success: ${payload.success}`);
      console.log(`   Result: ${payload.result}`);
      break;
      
    case 'SYSTEM_STATUS':
      console.log(`\n📊 System status:`);
      console.log(`   CPU: ${payload.cpuUsage}%`);
      console.log(`   RAM: ${payload.ramUsage}%`);
      console.log(`   Temp: ${payload.temperature}°C`);
      break;
      
    default:
      console.log(`📨 Server message: ${type}`, payload);
  }
}

function sendCommandToServer(command) {
  if (!wsConnected) {
    console.error('❌ Not connected to server');
    return;
  }
  
  const commandId = Date.now().toString();
  ws.send(JSON.stringify({
    type: 'COMMAND_FROM_BOT',
    payload: {
      id: commandId,
      command: command,
      timestamp: new Date().toISOString()
    }
  }));
  
  console.log(`📤 Command sent: ${command} (ID: ${commandId})`);
}

// Connect to server
connectToLocalServer();

// Example: Send test command every 30 seconds
let testCount = 0;
setInterval(() => {
  if (wsConnected && testCount < 3) {
    testCount++;
    const commands = [
      'status',
      'cpu-temp',
      'list-processes'
    ];
    sendCommandToServer(commands[testCount % commands.length]);
  }
}, 30000);

// Interactive commands
console.log('\n📝 Available commands (type in terminal):');
console.log('  status          - Get system status');
console.log('  cpu-temp        - Get CPU temperature');
console.log('  list-processes  - List running processes');
console.log('  shutdown [sec]  - Schedule shutdown');
console.log('  restart         - Restart PC');
console.log('  quit            - Exit');
console.log('');

// Read user input
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt() {
  rl.question('> ', (input) => {
    const command = input.trim();
    
    if (command.toLowerCase() === 'quit') {
      console.log('👋 Goodbye!');
      process.exit(0);
    }
    
    if (command) {
      sendCommandToServer(command);
    }
    
    prompt();
  });
}

prompt();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  if (ws) ws.close();
  rl.close();
  process.exit(0);
});
