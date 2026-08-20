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
    try {
        users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        users = {};
    }
}

function saveUsers() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

const regions = {
    // Все 89 регионов (здесь для краткости не все, вставь полный список)
    'Москва': { lat: 55.7558, lon: 37.6173 },
    'Тюмень': { lat: 57.1522, lon: 65.5272 },
    'Грозный': { lat: 43.3178, lon: 45.6981 }
    // ... добавь остальные регионы из предыдущего кода
};

const methods = {
    '1': 'University of Islamic Sciences, Karachi',
    '2': 'Islamic Society of North America (ISNA)',
    '3': 'Muslim World League',
    '4': 'Umm Al-Qura (Makkah)',
    '5': 'Egyptian General Authority',
    '7': 'Institute of Geophysics, Tehran',
    '8': 'Gulf Region',
    '9': 'Kuwait',
    '10': 'Qatar',
    '11': 'Majlis Ugama Islam Singapura',
    '12': 'Union Organization islamic de France',
    '13': 'Diyanet İşleri Başkanlığı (Turkey)',
    '14': 'Spiritual Administration of Muslims of Russia',
    '15': 'Moonsighting Committee',
    '16': 'ДУМ РФ'
};

const prayerNames = {
    'fajr': 'Фаджр',
    'dhuhr': 'Зухр',
    'asr': 'Аср',
    'maghrib': 'Магриб',
    'isha': 'Иша'
};

// ==== ВАЖНО: функция проверки и восстановления ====
function isConfigured(chatId) {
    const user = users[chatId];
    if (!user) return false;
    
    // Если есть координаты — всё хорошо
    if (user.lat && user.lon) return true;
    
    // Если есть регион, но нет координат — восстанавливаем
    if (user.region && regions[user.region]) {
        user.lat = regions[user.region].lat;
        user.lon = regions[user.region].lon;
        if (!user.method) user.method = 16;
        if (!user.stats) user.stats = { prayersToday: 0, totalPrayers: 0, markedPrayers: {} };
        user.step = 'done';
        saveUsers();
        return true;
    }
    
    return false;
}

// При старте чиним всех старых пользователей
Object.keys(users).forEach(chatId => {
    if (users[chatId] && users[chatId].region) {
        isConfigured(chatId);
    }
});

async function getPrayerTimes(lat, lon, method = 16, date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lon}&method=${method}&school=1`;
    try {
        const response = await axios.get(url);
        return response.data.data.timings;
    } catch (e) {
        return null;
    }
}

function setupScheduler(chatId) {
    const user = users[chatId];
    if (!isConfigured(chatId)) return;
    
    getPrayerTimes(user.lat, user.lon, user.method).then(timings => {
        if (!timings) return;
        const prayers = [
            { key: 'fajr', name: 'Фаджр', time: timings.Fajr },
            { key: 'dhuhr', name: 'Зухр', time: timings.Dhuhr },
            { key: 'asr', name: 'Аср', time: timings.Asr },
            { key: 'maghrib', name: 'Магриб', time: timings.Maghrib },
            { key: 'isha', name: 'Иша', time: timings.Isha }
        ];
        if (user.scheduledJobs) user.scheduledJobs.forEach(job => job.cancel());
        user.scheduledJobs = [];
        prayers.forEach(prayer => {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
                if (users[chatId]?.notifications) {
                    bot.sendMessage(chatId, `Время намаза: ${prayer.name} (${prayer.time})\n\nОтметить: /mark`);
                }
            });
            user.scheduledJobs.push(job);
        });
        saveUsers();
    });
}

// ==== Обработчики команд ====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (isConfigured(chatId)) {
        return bot.sendMessage(chatId, 'Вы уже настроены! Все команды доступны.\n/help — список команд');
    }
    users[chatId] = { step: 'region', notifications: true, method: 16, stats: { prayersToday: 0, totalPrayers: 0, markedPrayers: {} } };
    saveUsers();
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) keyboard.push(regionNames.slice(i, i + 2));
    bot.sendMessage(chatId, 'Ассаляму алейкум!\n\nВыберите ваш регион:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

bot.onText(/\/help/, (msg) => {
    let help = '📋 Команды:\n\n';
    help += '/today — расписание на сегодня\n';
    help += '/tomorrow — расписание на завтра\n';
    help += '/mark — отметить совершённый намаз\n';
    help += '/stats — статистика намазов\n';
    help += '/qibla — направление на Каабу (отправьте геолокацию)\n';
    help += '/settings — сменить метод расчёта\n';
    help += '/region — сменить регион\n';
    help += '/off — выключить уведомления\n';
    help += '/on — включить уведомления\n';
    help += '/info — о боте';
    bot.sendMessage(msg.chat.id, help);
});

bot.onText(/\/info/, (msg) => {
    bot.sendMessage(msg.chat.id, 'ℹ️ Официальный бот-расписание Намаза.\n\nОтслеживайте и отмечайте намазы, получайте напоминания. В настройках можно выбрать регион и метод расчёта.');
});

bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    const timings = await getPrayerTimes(user.lat, user.lon, user.method);
    if (timings) {
        bot.sendMessage(chatId, `Сегодня (${user.region}):\n\nФаджр: ${timings.Fajr}\nЗухр: ${timings.Dhuhr}\nАср: ${timings.Asr}\nМагриб: ${timings.Maghrib}\nИша: ${timings.Isha}`);
    }
});

bot.onText(/\/tomorrow/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timings = await getPrayerTimes(user.lat, user.lon, user.method, tomorrow);
    if (timings) {
        bot.sendMessage(chatId, `Завтра (${user.region}):\n\nФаджр: ${timings.Fajr}\nЗухр: ${timings.Dhuhr}\nАср: ${timings.Asr}\nМагриб: ${timings.Maghrib}\nИша: ${timings.Isha}`);
    }
});

bot.onText(/\/mark/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    let keyboard = [];
    Object.entries(prayerNames).forEach(([key, name]) => {
        keyboard.push([{ text: name, callback_data: 'mark_' + key }]);
    });
    bot.sendMessage(chatId, 'Какой намаз отметить?', { reply_markup: { inline_keyboard: keyboard } });
});

bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    if (!user.stats) user.stats = { prayersToday: 0, totalPrayers: 0, markedPrayers: {} };
    const today = new Date().toDateString();
    const markedToday = user.stats.markedPrayers?.[today] || [];
    let message = `📊 Статистика:\n\nСегодня: ${user.stats.prayersToday}/5\nВсего: ${user.stats.totalPrayers}\n\n`;
    Object.entries(prayerNames).forEach(([key, name]) => {
        message += `${markedToday.includes(key) ? '✅' : '❌'} ${name}\n`;
    });
    bot.sendMessage(chatId, message);
});

bot.onText(/\/qibla/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Отправьте вашу геолокацию, чтобы узнать направление на Каабу.');
});

bot.onText(/\/settings/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    let keyboard = [];
    Object.entries(methods).forEach(([key, name]) => {
        keyboard.push([{ text: `${name} (${key})`, callback_data: 'method_' + key }]);
    });
    bot.sendMessage(chatId, `Текущий метод: ${methods[user.method] || user.method}\n\nВыберите новый:`, { reply_markup: { inline_keyboard: keyboard } });
});

bot.onText(/\/region/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) return bot.sendMessage(chatId, 'Сначала /start');
    users[chatId].step = 'region';
    saveUsers();
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) keyboard.push(regionNames.slice(i, i + 2));
    bot.sendMessage(chatId, 'Выберите новый регион:', { reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true } });
});

bot.onText(/\/off/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    users[chatId].notifications = false;
    saveUsers();
    bot.sendMessage(chatId, 'Уведомления выключены');
});

bot.onText(/\/on/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    users[chatId].notifications = true;
    saveUsers();
    bot.sendMessage(chatId, 'Уведомления включены');
});

// Обработка callback (отметка намаза и выбор метода)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('mark_')) {
        const prayerKey = data.replace('mark_', '');
        const prayerName = prayerNames[prayerKey];
        const user = users[chatId];
        if (!user) return;
        if (!user.stats) user.stats = { prayersToday: 0, totalPrayers: 0, markedPrayers: {} };
        if (!user.stats.markedPrayers) user.stats.markedPrayers = {};
        const today = new Date().toDateString();
        if (!user.stats.markedPrayers[today]) user.stats.markedPrayers[today] = [];
        if (user.stats.markedPrayers[today].includes(prayerKey)) {
            bot.answerCallbackQuery(query.id, { text: `${prayerName} уже отмечен!` });
            return;
        }
        user.stats.markedPrayers[today].push(prayerKey);
        user.stats.prayersToday++;
        user.stats.totalPrayers++;
        saveUsers();
        bot.answerCallbackQuery(query.id, { text: `${prayerName} отмечен!` });
        bot.sendMessage(chatId, `${prayerName} отмечен!\nСегодня: ${user.stats.prayersToday}/5`);
    }
    
    if (data.startsWith('method_')) {
        const methodKey = data.replace('method_', '');
        const user = users[chatId];
        if (!user) return;
        user.method = parseInt(methodKey);
        saveUsers();
        bot.answerCallbackQuery(query.id, { text: 'Метод обновлён!' });
        bot.sendMessage(chatId, `Метод: ${methods[methodKey]}`);
        setupScheduler(chatId);
    }
    
    bot.answerCallbackQuery(query.id);
});

// Геолокация для киблы
bot.on('location', (msg) => {
    const chatId = msg.chat.id;
    const lat = msg.location.latitude;
    const lon = msg.location.longitude;
    const qibla = Math.round(180 / Math.PI * Math.atan2(
        Math.sin((39.8262 - lon) * Math.PI / 180),
        Math.cos(lat * Math.PI / 180) * Math.tan(21.4225 * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos((39.8262 - lon) * Math.PI / 180)
    ));
    const direction = ['Север','Северо-Восток','Восток','Юго-Восток','Юг','Юго-Запад','Запад','Северо-Запад'][Math.round(qibla / 45) % 8];
    bot.sendMessage(chatId, `Направление на Каабу: ${qibla}° (${direction})`);
});

// Обработка текстовых сообщений (выбор региона/метода)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    const user = users[chatId];
    
    if (user?.step === 'region' && regions[text]) {
        user.region = text;
        user.lat = regions[text].lat;
        user.lon = regions[text].lon;
        user.step = 'method';
        saveUsers();
        let methodKeyboard = [];
        Object.entries(methods).forEach(([key, name]) => methodKeyboard.push([`${name} (${key})`]));
        bot.sendMessage(chatId, `Регион: ${text}\n\nВыберите метод расчёта:`, { reply_markup: { keyboard: methodKeyboard, resize_keyboard: true, one_time_keyboard: true } });
        return;
    }
    
    if (user?.step === 'method') {
        const methodMatch = Object.entries(methods).find(([key, name]) => text.startsWith(name));
        if (methodMatch) {
            user.method = parseInt(methodMatch[0]);
            user.step = 'done';
            saveUsers();
            bot.sendMessage(chatId, 'Настройка завершена! Все команды доступны.\n/help — список команд', { reply_markup: { remove_keyboard: true } });
            const timings = await getPrayerTimes(user.lat, user.lon, user.method);
            if (timings) bot.sendMessage(chatId, `Сегодня:\n\nФаджр: ${timings.Fajr}\nЗухр: ${timings.Dhuhr}\nАср: ${timings.Asr}\nМагриб: ${timings.Maghrib}\nИша: ${timings.Isha}`);
            setupScheduler(chatId);
        }
        return;
    }
});

// Запуск планировщиков для всех настроенных пользователей
Object.keys(users).forEach(chatId => {
    if (isConfigured(chatId)) setupScheduler(chatId);
});

// HTTP сервер для Render/UptimeRobot
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`HTTP сервер на порту ${PORT}`));

console.log('Бот запущен!');