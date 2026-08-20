const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const http = require('http');

const TOKEN = process.env.TOKEN || '8918396680:AAHLsrtA0p-lFd5xHzr5h1FSwa190dQFrwk';
const bot = new TelegramBot(TOKEN, { polling: true });

const DATA_FILE = path.join(__dirname, 'users.json');
let users = {};
if (fs.existsSync(DATA_FILE)) {
    users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveUsers() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

const regions = {
    'Москва': { lat: 55.7558, lon: 37.6173 },
    'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
    'Казань': { lat: 55.8304, lon: 49.0661 },
    'Екатеринбург': { lat: 56.8389, lon: 60.6057 },
    'Новосибирск': { lat: 55.0302, lon: 82.9204 },
    'Тюмень': { lat: 57.1522, lon: 65.5272 },
    'Уфа': { lat: 54.7388, lon: 55.9721 },
    'Челябинск': { lat: 55.1644, lon: 61.4368 },
    'Омск': { lat: 54.9893, lon: 73.3682 },
    'Красноярск': { lat: 56.0106, lon: 92.8526 },
    'Грозный': { lat: 43.3178, lon: 45.6981 },
    'Махачкала': { lat: 42.9849, lon: 47.5046 },
    'Назрань': { lat: 43.2257, lon: 44.7648 },
    'Дербент': { lat: 42.0587, lon: 48.2908 },
    'Каспийск': { lat: 42.8814, lon: 47.6385 },
    'Хасавюрт': { lat: 43.2500, lon: 46.5833 },
    'Буйнакск': { lat: 42.8200, lon: 47.1200 },
    'Избербаш': { lat: 42.5667, lon: 47.8667 },
    'Кизляр': { lat: 43.8500, lon: 46.7167 },
    'Шали': { lat: 43.1500, lon: 45.9000 },
    'Урус-Мартан': { lat: 43.1333, lon: 45.5333 },
    'Гудермес': { lat: 43.3500, lon: 46.1000 },
    'Аргун': { lat: 43.3000, lon: 45.8667 },
    'Владикавказ': { lat: 43.0246, lon: 44.6810 },
    'Нальчик': { lat: 43.4846, lon: 43.6072 },
    'Черкесск': { lat: 44.2233, lon: 42.0577 },
    'Майкоп': { lat: 44.6098, lon: 40.1055 },
    'Астрахань': { lat: 46.3497, lon: 48.0408 },
    'Элиста': { lat: 46.3077, lon: 44.2697 }
};

const methods = {
    '16': 'ДУМ РФ',
    '14': 'ДУМ РФ (старый)',
    '3': 'MWL (Всемирная лига)',
    '2': 'ISNA (Сев. Америка)',
    '4': 'Umm Al-Qura (Мекка)',
    '5': 'Египет',
    '13': 'Турция (Diyanet)',
    '15': 'Moonsighting'
};

async function getPrayerTimes(lat, lon, method = 16, date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lon}&method=${method}&school=1`;
    
    try {
        const response = await axios.get(url);
        return response.data.data.timings;
    } catch (e) {
        console.error('Ошибка:', e.message);
        return null;
    }
}

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) {
        keyboard.push(regionNames.slice(i, i + 2));
    }
    bot.sendMessage(chatId, 'Ассаляму алейкум!\n\nВыберите ваш регион:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

// Обработка сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text === '/start' || !text) return;
    
    if (regions[text] && (!users[chatId] || users[chatId].step !== 'method')) {
        const region = regions[text];
        users[chatId] = {
            region: text,
            lat: region.lat,
            lon: region.lon,
            method: 16,
            notifications: true,
            step: 'method'
        };
        saveUsers();
        
        let methodKeyboard = [];
        Object.entries(methods).forEach(([key, name]) => {
            methodKeyboard.push([name + ' (' + key + ')']);
        });
        
        bot.sendMessage(chatId, 'Регион: ' + text + '\n\nВыберите метод расчёта:', {
            reply_markup: { keyboard: methodKeyboard, resize_keyboard: true, one_time_keyboard: true }
        });
        return;
    }
    
    if (users[chatId] && users[chatId].step === 'method') {
        const methodMatch = Object.entries(methods).find(([key, name]) => text.startsWith(name));
        if (methodMatch) {
            users[chatId].method = parseInt(methodMatch[0]);
            users[chatId].step = 'done';
            saveUsers();
            
            bot.sendMessage(chatId, 'Метод: ' + methodMatch[1] + '\nШкола: Ханафитская\n\nНастройка завершена!', {
                reply_markup: { remove_keyboard: true }
            });
            
            const user = users[chatId];
            const timings = await getPrayerTimes(user.lat, user.lon, user.method);
            if (timings) {
                let message = 'Расписание на сегодня:\n\n';
                message += 'Фаджр: ' + timings.Fajr + '\n';
                message += 'Восход: ' + timings.Sunrise + '\n';
                message += 'Зухр: ' + timings.Dhuhr + '\n';
                message += 'Аср: ' + timings.Asr + '\n';
                message += 'Магриб: ' + timings.Maghrib + '\n';
                message += 'Иша: ' + timings.Isha + '\n\n';
                message += '/status — статус\n/today — сегодня\n/tomorrow — завтра\n/method — сменить метод\n/off — выкл. уведомления\n/on — вкл. уведомления';
                bot.sendMessage(chatId, message);
            }
            
            setupScheduler(chatId);
        }
        return;
    }
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    bot.sendMessage(chatId, 'Регион: ' + user.region + '\nМетод: ' + (methods[user.method] || user.method) + '\nШкола: Ханафитская\nУведомления: ' + (user.notifications ? 'включены' : 'выключены'));
});

// /method
bot.onText(/\/method/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    
    let methodKeyboard = [];
    Object.entries(methods).forEach(([key, name]) => {
        methodKeyboard.push([name + ' (' + key + ')']);
    });
    
    user.step = 'method';
    saveUsers();
    bot.sendMessage(chatId, 'Выберите метод:', {
        reply_markup: { keyboard: methodKeyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

// /today
bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    const timings = await getPrayerTimes(user.lat, user.lon, user.method);
    if (timings) {
        bot.sendMessage(chatId, 'Сегодня:\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// /tomorrow
bot.onText(/\/tomorrow/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timings = await getPrayerTimes(user.lat, user.lon, user.method, tomorrow);
    if (timings) {
        bot.sendMessage(chatId, 'Завтра:\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// /off
bot.onText(/\/off/, (msg) => {
    const chatId = msg.chat.id;
    if (users[chatId]) {
        users[chatId].notifications = false;
        saveUsers();
        bot.sendMessage(chatId, 'Уведомления выключены');
    }
});

// /on
bot.onText(/\/on/, (msg) => {
    const chatId = msg.chat.id;
    if (users[chatId]) {
        users[chatId].notifications = true;
        saveUsers();
        bot.sendMessage(chatId, 'Уведомления включены');
    }
});

function setupScheduler(chatId) {
    const user = users[chatId];
    if (!user) return;
    
    getPrayerTimes(user.lat, user.lon, user.method).then(timings => {
        if (!timings) return;
        
        const prayers = [
            { name: 'Фаджр', time: timings.Fajr },
            { name: 'Зухр', time: timings.Dhuhr },
            { name: 'Аср', time: timings.Asr },
            { name: 'Магриб', time: timings.Maghrib },
            { name: 'Иша', time: timings.Isha }
        ];
        
        prayers.forEach(prayer => {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
                if (users[chatId] && users[chatId].notifications) {
                    bot.sendMessage(chatId, 'Время намаза: ' + prayer.name + ' (' + prayer.time + ')');
                }
            });
        });
    });
}

Object.keys(users).forEach(chatId => setupScheduler(chatId));

// HTTP-сервер для Render и UptimeRobot
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('HTTP сервер запущен на порту ' + PORT);
});

console.log('Бот запущен!');
console.log('Регионов:', Object.keys(regions).length);