const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = process.env.TOKEN || '8918396680:AAHLsrtA0p-lFd5xHzr5h1FSwa190dQFrwk';
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Бот работает!');
});

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('OK');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('Сервер на порту ' + PORT));
console.log('Бот запущен!');