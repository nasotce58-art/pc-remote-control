const https = require('https');

console.log('Testing connection to Telegram API...');

https.get('https://api.telegram.org', (res) => {
  console.log('✅ Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', data.substring(0, 100)));
}).on('error', (err) => {
  console.error('❌ Error:', err.message);
  console.error('Code:', err.code);
  console.error('Errno:', err.errno);
});
