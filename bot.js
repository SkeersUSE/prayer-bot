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

// Список регионов
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
    'Владикавказ': { lat: 43.0246, lon: 44.6810 },
    'Нальчик': { lat: 43.4846, lon: 43.6072 },
    'Черкесск': { lat: 44.2233, lon: 42.0577 },
    'Майкоп': { lat: 44.6098, lon: 40.1055 },
    'Астрахань': { lat: 46.3497, lon: 48.0408 },
    'Элиста': { lat: 46.3077, lon: 44.2697 },
    'Самара': { lat: 53.1959, lon: 50.1002 },
    'Нижний Новгород': { lat: 56.2965, lon: 43.9361 },
    'Ростов-на-Дону': { lat: 47.2225, lon: 39.7187 },
    'Краснодар': { lat: 45.0355, lon: 38.9753 },
    'Сочи': { lat: 43.5855, lon: 39.7231 },
    'Пермь': { lat: 58.0105, lon: 56.2502 },
    'Воронеж': { lat: 51.6720, lon: 39.1843 },
    'Саратов': { lat: 51.5331, lon: 46.0342 },
    'Томск': { lat: 56.4846, lon: 84.9480 },
    'Барнаул': { lat: 53.3481, lon: 83.7799 },
    'Ижевск': { lat: 56.8498, lon: 53.2045 },
    'Ульяновск': { lat: 54.3142, lon: 48.4031 },
    'Оренбург': { lat: 51.7727, lon: 55.0988 },
    'Киров': { lat: 58.6035, lon: 49.6667 },
    'Чебоксары': { lat: 56.1462, lon: 47.2501 }
};

const methods = {
    '16': 'ДУМ РФ',
    '14': 'ДУМ РФ (старый)',
    '3': 'MWL (Всемирная лига)',
    '2': 'ISNA (Сев. Америка)',
    '4': 'Umm Al-Qura (Мекка)',
    '13': 'Турция (Diyanet)'
};

// Названия намазов
const prayerNames = {
    'fajr': 'Фаджр',
    'dhuhr': 'Зухр',
    'asr': 'Аср',
    'maghrib': 'Магриб',
    'isha': 'Иша'
};

// Получение времени намаза
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

// Расчёт киблы
function calculateQibla(lat, lon) {
    const kaabaLat = 21.4225;
    const kaabaLon = 39.8262;
    
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    const kaabaLatRad = kaabaLat * Math.PI / 180;
    const kaabaLonRad = kaabaLon * Math.PI / 180;
    
    const deltaLon = kaabaLonRad - lonRad;
    
    const y = Math.sin(deltaLon);
    const x = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(deltaLon);
    
    let qibla = Math.atan2(y, x) * 180 / Math.PI;
    if (qibla < 0) qibla += 360;
    
    return Math.round(qibla);
}

// Компас
function getCompassDirection(degrees) {
    const directions = ['Север', 'Северо-Восток', 'Восток', 'Юго-Восток', 'Юг', 'Юго-Запад', 'Запад', 'Северо-Запад'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Сброс статистики ежедневно
function resetDailyStats() {
    Object.keys(users).forEach(chatId => {
        const user = users[chatId];
        if (user && user.stats) {
            const today = new Date().toDateString();
            if (user.stats.lastReset !== today) {
                user.stats.prayersToday = 0;
                user.stats.lastReset = today;
            }
        }
    });
    saveUsers();
}

// Запускаем сброс каждый час
setInterval(resetDailyStats, 60 * 60 * 1000);
resetDailyStats();

// Планировщик намазов
function setupScheduler(chatId) {
    const user = users[chatId];
    if (!user) return;
    
    getPrayerTimes(user.lat, user.lon, user.method).then(timings => {
        if (!timings) return;
        
        const prayers = [
            { key: 'fajr', name: 'Фаджр', time: timings.Fajr },
            { key: 'dhuhr', name: 'Зухр', time: timings.Dhuhr },
            { key: 'asr', name: 'Аср', time: timings.Asr },
            { key: 'maghrib', name: 'Магриб', time: timings.Maghrib },
            { key: 'isha', name: 'Иша', time: timings.Isha }
        ];
        
        if (user.scheduledJobs) {
            user.scheduledJobs.forEach(job => job.cancel());
        }
        user.scheduledJobs = [];
        
        prayers.forEach(prayer => {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
                if (users[chatId] && users[chatId].notifications) {
                    const keyboard = {
                        inline_keyboard: [[
                            { text: 'Отметить ' + prayer.name, callback_data: 'mark_' + prayer.key }
                        ]]
                    };
                    bot.sendMessage(chatId, 'Время намаза: ' + prayer.name + ' (' + prayer.time + ')', { reply_markup: keyboard });
                }
            });
            user.scheduledJobs.push(job);
        });
        
        saveUsers();
    });
}

// Перепланирование каждые 12 часов
setInterval(() => {
    Object.keys(users).forEach(chatId => {
        if (users[chatId] && users[chatId].step === 'done') {
            setupScheduler(chatId);
        }
    });
}, 12 * 60 * 60 * 1000);

// Главное меню
function showMenu(chatId) {
    const keyboard = [
        ['Сегодня', 'Завтра'],
        ['Отметить намаз', 'Статистика'],
        ['Кибла', 'Настройки']
    ];
    bot.sendMessage(chatId, 'Главное меню:', {
        reply_markup: { keyboard, resize_keyboard: true }
    });
}

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    if (users[chatId] && users[chatId].step === 'done') {
        return showMenu(chatId);
    }
    
    users[chatId] = {
        step: 'region',
        notifications: true,
        method: 16,
        stats: {
            prayersToday: 0,
            totalPrayers: 0,
            lastReset: new Date().toDateString()
        }
    };
    saveUsers();
    
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) {
        keyboard.push(regionNames.slice(i, i + 2));
    }
    
    bot.sendMessage(chatId, 'Ассаляму алейкум!\n\nВыберите ваш регион:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

// /menu
bot.onText(/\/menu/, (msg) => {
    showMenu(msg.chat.id);
});

// /today
bot.onText(/\/today|Сегодня/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || !user.lat) return bot.sendMessage(chatId, 'Сначала /start');
    
    const timings = await getPrayerTimes(user.lat, user.lon, user.method);
    if (timings) {
        bot.sendMessage(chatId, 'Сегодня:\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// /tomorrow
bot.onText(/\/tomorrow|Завтра/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || !user.lat) return bot.sendMessage(chatId, 'Сначала /start');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timings = await getPrayerTimes(user.lat, user.lon, user.method, tomorrow);
    if (timings) {
        bot.sendMessage(chatId, 'Завтра:\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// Отметка намаза
bot.onText(/\/mark|Отметить намаз/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || !user.lat) return bot.sendMessage(chatId, 'Сначала /start');
    
    let keyboard = [];
    Object.entries(prayerNames).forEach(([key, name]) => {
        keyboard.push([{ text: name, callback_data: 'mark_' + key }]);
    });
    
    bot.sendMessage(chatId, 'Какой намаз отметить?', {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// Обработка callback
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('mark_')) {
        const prayerKey = data.replace('mark_', '');
        const prayerName = prayerNames[prayerKey];
        const user = users[chatId];
        
        if (!user) return;
        
        if (!user.stats) {
            user.stats = {
                prayersToday: 0,
                totalPrayers: 0,
                lastReset: new Date().toDateString()
            };
        }
        
        // Проверяем, не отмечен ли уже
        const today = new Date().toDateString();
        if (!user.stats.markedPrayers) {
            user.stats.markedPrayers = {};
        }
        if (!user.stats.markedPrayers[today]) {
            user.stats.markedPrayers[today] = [];
        }
        
        if (user.stats.markedPrayers[today].includes(prayerKey)) {
            bot.answerCallbackQuery(query.id, { text: prayerName + ' уже отмечен!' });
            return;
        }
        
        user.stats.markedPrayers[today].push(prayerKey);
        user.stats.prayersToday++;
        user.stats.totalPrayers++;
        saveUsers();
        
        bot.answerCallbackQuery(query.id, { text: prayerName + ' отмечен!' });
        bot.sendMessage(chatId, prayerName + ' отмечен!\nСегодня: ' + user.stats.prayersToday + '/5');
    }
    
    bot.answerCallbackQuery(query.id);
});

// /stats
bot.onText(/\/stats|Статистика/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    
    if (!user.stats) {
        user.stats = {
            prayersToday: 0,
            totalPrayers: 0,
            lastReset: new Date().toDateString()
        };
        saveUsers();
    }
    
    const today = new Date().toDateString();
    const markedToday = user.stats.markedPrayers?.[today] || [];
    
    let message = 'Статистика намазов:\n\n';
    message += 'Сегодня: ' + user.stats.prayersToday + '/5\n';
    message += 'Всего: ' + user.stats.totalPrayers + '\n\n';
    message += 'Отмечены сегодня:\n';
    
    Object.entries(prayerNames).forEach(([key, name]) => {
        const marked = markedToday.includes(key) ? '✅' : '❌';
        message += marked + ' ' + name + '\n';
    });
    
    bot.sendMessage(chatId, message);
});

// /qibla
bot.onText(/\/qibla|Кибла/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Отправьте вашу геолокацию (вложение Location), чтобы узнать направление на Каабу.');
});

// Обработка геолокации
bot.on('location', (msg) => {
    const chatId = msg.chat.id;
    const lat = msg.location.latitude;
    const lon = msg.location.longitude;
    
    const qiblaDegrees = calculateQibla(lat, lon);
    const direction = getCompassDirection(qiblaDegrees);
    
    bot.sendMessage(chatId, 'Направление на Каабу:\n\n' + qiblaDegrees + '° (' + direction + ')\n\nОт севера по часовой стрелке.');
});

// /settings
bot.onText(/\/settings|Настройки/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    
    let keyboard = [];
    Object.entries(methods).forEach(([key, name]) => {
        keyboard.push([{ text: name + ' (' + key + ')', callback_data: 'method_' + key }]);
    });
    
    bot.sendMessage(chatId, 'Метод: ' + (methods[user.method] || user.method) + '\n\nВыберите метод расчёта:', {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// Обработка выбора метода
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('method_')) {
        const methodKey = data.replace('method_', '');
        const user = users[chatId];
        if (!user) return;
        
        user.method = parseInt(methodKey);
        saveUsers();
        
        bot.answerCallbackQuery(query.id, { text: 'Метод обновлён!' });
        bot.sendMessage(chatId, 'Метод: ' + methods[methodKey]);
        
        setupScheduler(chatId);
    }
});

// Обработка сообщений (выбор региона и метода)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    
    const user = users[chatId];
    
    // Выбор региона
    if (user?.step === 'region' && regions[text]) {
        user.region = text;
        user.lat = regions[text].lat;
        user.lon = regions[text].lon;
        user.step = 'method';
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
    
    // Выбор метода
    if (user?.step === 'method') {
        const methodMatch = Object.entries(methods).find(([key, name]) => text.startsWith(name));
        if (methodMatch) {
            user.method = parseInt(methodMatch[0]);
            user.step = 'done';
            saveUsers();
            
            bot.sendMessage(chatId, 'Настройка завершена!', {
                reply_markup: { remove_keyboard: true }
            });
            
            const timings = await getPrayerTimes(user.lat, user.lon, user.method);
            if (timings) {
                bot.sendMessage(chatId, 'Сегодня:\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
            }
            
            setupScheduler(chatId);
            showMenu(chatId);
        }
        return;
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

// Запуск планировщиков при старте
Object.keys(users).forEach(chatId => {
    if (users[chatId] && users[chatId].step === 'done') {
        setupScheduler(chatId);
    }
});

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