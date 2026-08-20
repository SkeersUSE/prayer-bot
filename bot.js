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
    'Иркутск': { lat: 52.2864, lon: 104.2807 },
    'Владивосток': { lat: 43.1155, lon: 131.8855 },
    'Хабаровск': { lat: 48.4802, lon: 135.0718 },
    'Якутск': { lat: 62.0355, lon: 129.6755 },
    'Магадан': { lat: 59.5681, lon: 150.8085 },
    'Калининград': { lat: 54.7104, lon: 20.4522 },
    'Мурманск': { lat: 68.9585, lon: 33.0827 },
    'Архангельск': { lat: 64.5399, lon: 40.5158 },
    'Волгоград': { lat: 48.7080, lon: 44.5133 },
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
    'Кемерово': { lat: 55.3552, lon: 86.0868 },
    'Грозный': { lat: 43.3178, lon: 45.6981 },
    'Махачкала': { lat: 42.9849, lon: 47.5046 },
    'Назрань': { lat: 43.2257, lon: 44.7648 },
    'Черкесск': { lat: 44.2233, lon: 42.0577 },
    'Нальчик': { lat: 43.4846, lon: 43.6072 },
    'Владикавказ': { lat: 43.0246, lon: 44.6810 },
    'Симферополь': { lat: 44.9521, lon: 34.1024 },
    'Севастополь': { lat: 44.6167, lon: 33.5254 },
    'Ижевск': { lat: 56.8498, lon: 53.2045 },
    'Ульяновск': { lat: 54.3142, lon: 48.4031 },
    'Оренбург': { lat: 51.7727, lon: 55.0988 },
    'Киров': { lat: 58.6035, lon: 49.6667 },
    'Йошкар-Ола': { lat: 56.6316, lon: 47.8864 },
    'Саранск': { lat: 54.1874, lon: 45.1839 },
    'Пенза': { lat: 53.1959, lon: 45.0000 },
    'Тамбов': { lat: 52.7213, lon: 41.4438 },
    'Липецк': { lat: 52.6088, lon: 39.5992 },
    'Белгород': { lat: 50.5977, lon: 36.5858 },
    'Курск': { lat: 51.7304, lon: 36.1927 },
    'Брянск': { lat: 53.2436, lon: 34.3648 },
    'Смоленск': { lat: 54.7826, lon: 32.0451 },
    'Тверь': { lat: 56.8587, lon: 35.9176 },
    'Калуга': { lat: 54.5138, lon: 36.2613 },
    'Тула': { lat: 54.1930, lon: 37.6175 },
    'Рязань': { lat: 54.6292, lon: 39.7358 },
    'Владимир': { lat: 56.1291, lon: 40.4070 },
    'Иваново': { lat: 56.9994, lon: 40.9728 },
    'Кострома': { lat: 57.7679, lon: 40.9269 },
    'Ярославль': { lat: 57.6261, lon: 39.8845 },
    'Вологда': { lat: 59.2205, lon: 39.8915 },
    'Петрозаводск': { lat: 61.7849, lon: 34.3469 },
    'Сыктывкар': { lat: 61.6688, lon: 50.8365 },
    'Нарьян-Мар': { lat: 67.6381, lon: 53.0069 },
    'Салехард': { lat: 66.5300, lon: 66.6139 },
    'Ханты-Мансийск': { lat: 61.0025, lon: 69.0189 },
    'Анадырь': { lat: 64.7337, lon: 177.4968 },
    'Петропавловск-Камчатский': { lat: 53.0166, lon: 158.6508 },
    'Южно-Сахалинск': { lat: 46.9598, lon: 142.7317 },
    'Биробиджан': { lat: 48.7920, lon: 132.9240 },
    'Благовещенск': { lat: 50.2796, lon: 127.5405 },
    'Чита': { lat: 52.0340, lon: 113.4994 },
    'Улан-Удэ': { lat: 51.8348, lon: 107.5843 },
    'Горно-Алтайск': { lat: 51.9605, lon: 85.9189 },
    'Абакан': { lat: 53.7223, lon: 91.4437 },
    'Кызыл': { lat: 51.7191, lon: 94.4375 },
    'Элиста': { lat: 46.3077, lon: 44.2697 },
    'Астрахань': { lat: 46.3497, lon: 48.0408 },
    'Майкоп': { lat: 44.6098, lon: 40.1055 },
    'Чебоксары': { lat: 56.1462, lon: 47.2501 },
    'Дербент': { lat: 42.0587, lon: 48.2908 },
    'Каспийск': { lat: 42.8814, lon: 47.6385 },
    'Хасавюрт': { lat: 43.2500, lon: 46.5833 },
    'Буйнакск': { lat: 42.8200, lon: 47.1200 },
    'Избербаш': { lat: 42.5667, lon: 47.8667 },
    'Кизляр': { lat: 43.8500, lon: 46.7167 },
    'Шали': { lat: 43.1500, lon: 45.9000 },
    'Урус-Мартан': { lat: 43.1333, lon: 45.5333 },
    'Гудермес': { lat: 43.3500, lon: 46.1000 },
    'Аргун': { lat: 43.3000, lon: 45.8667 }
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

function getCompassDirection(degrees) {
    const directions = ['Север', 'Северо-Восток', 'Восток', 'Юго-Восток', 'Юг', 'Юго-Запад', 'Запад', 'Северо-Запад'];
    return directions[Math.round(degrees / 45) % 8];
}

function resetDailyStats() {
    const today = new Date().toDateString();
    Object.keys(users).forEach(chatId => {
        const user = users[chatId];
        if (user?.stats && user.stats.lastReset !== today) {
            user.stats.prayersToday = 0;
            user.stats.markedPrayers = {};
            user.stats.lastReset = today;
        }
    });
    saveUsers();
}

setInterval(resetDailyStats, 60 * 60 * 1000);
resetDailyStats();

// Проверка, настроен ли пользователь (работает со старыми данными)
function isConfigured(chatId) {
    const user = users[chatId];
    if (!user) return false;
    
    // Если есть lat и lon — настроен
    if (user.lat && user.lon) return true;
    
    // Если есть region — восстанавливаем lat и lon
    if (user.region && regions[user.region]) {
        user.lat = regions[user.region].lat;
        user.lon = regions[user.region].lon;
        if (!user.method) user.method = 16;
        if (!user.stats) user.stats = { prayersToday: 0, totalPrayers: 0, lastReset: new Date().toDateString(), markedPrayers: {} };
        user.step = 'done';
        saveUsers();
        return true;
    }
    
    return false;
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
        
        if (user.scheduledJobs) {
            user.scheduledJobs.forEach(job => job.cancel());
        }
        user.scheduledJobs = [];
        
        prayers.forEach(prayer => {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
                if (users[chatId]?.notifications) {
                    bot.sendMessage(chatId, 'Время намаза: ' + prayer.name + ' (' + prayer.time + ')\n\nОтметить: /mark');
                }
            });
            user.scheduledJobs.push(job);
        });
        
        saveUsers();
    });
}

setInterval(() => {
    Object.keys(users).forEach(chatId => {
        if (isConfigured(chatId)) setupScheduler(chatId);
    });
}, 12 * 60 * 60 * 1000);

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    if (isConfigured(chatId)) {
        return bot.sendMessage(chatId, 'Вы уже настроены! Используйте /help для списка команд.');
    }
    
    users[chatId] = {
        step: 'region',
        notifications: true,
        method: 16,
        stats: { prayersToday: 0, totalPrayers: 0, lastReset: new Date().toDateString(), markedPrayers: {} }
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

// /help
bot.onText(/\/help/, (msg) => {
    let help = 'Команды бота:\n\n';
    help += '/start — начать настройку\n';
    help += '/help — список команд\n';
    help += '/info — информация о боте\n';
    help += '/today — расписание на сегодня\n';
    help += '/tomorrow — расписание на завтра\n';
    help += '/mark — отметить совершённый намаз\n';
    help += '/stats — статистика намазов\n';
    help += '/qibla — направление на Каабу\n';
    help += '/settings — сменить метод расчёта\n';
    help += '/region — сменить регион\n';
    help += '/off — выключить уведомления\n';
    help += '/on — включить уведомления';
    
    bot.sendMessage(msg.chat.id, help);
});

// /info
bot.onText(/\/info/, (msg) => {
    let info = 'Информация о боте:\n\n';
    info += 'Официальный бот-расписание Намаза.\n\n';
    info += 'Вы можете:\n';
    info += '— Отслеживать время намазов\n';
    info += '— Отмечать совершённые намазы\n';
    info += '— Получать напоминания\n';
    info += '— Выбирать регион и метод расчёта\n';
    info += '— Узнать направление на Каабу\n\n';
    info += 'Используйте /help для списка команд.';
    
    bot.sendMessage(msg.chat.id, info);
});

// /today
bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    const timings = await getPrayerTimes(user.lat, user.lon, user.method);
    if (timings) {
        bot.sendMessage(chatId, 'Сегодня (' + user.region + '):\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// /tomorrow
bot.onText(/\/tomorrow/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timings = await getPrayerTimes(user.lat, user.lon, user.method, tomorrow);
    if (timings) {
        bot.sendMessage(chatId, 'Завтра (' + user.region + '):\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
    }
});

// /mark
bot.onText(/\/mark/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    
    let keyboard = [];
    Object.entries(prayerNames).forEach(([key, name]) => {
        keyboard.push([{ text: name, callback_data: 'mark_' + key }]);
    });
    
    bot.sendMessage(chatId, 'Какой намаз отметить?', {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// /stats
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    
    if (!user.stats) {
        user.stats = { prayersToday: 0, totalPrayers: 0, lastReset: new Date().toDateString(), markedPrayers: {} };
        saveUsers();
    }
    
    const today = new Date().toDateString();
    const markedToday = user.stats.markedPrayers?.[today] || [];
    
    let message = 'Статистика намазов:\n\n';
    message += 'Сегодня: ' + user.stats.prayersToday + '/5\n';
    message += 'Всего: ' + user.stats.totalPrayers + '\n\n';
    message += 'Сегодня:\n';
    Object.entries(prayerNames).forEach(([key, name]) => {
        message += (markedToday.includes(key) ? '✅' : '❌') + ' ' + name + '\n';
    });
    
    bot.sendMessage(chatId, message);
});

// /qibla
bot.onText(/\/qibla/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Отправьте вашу геолокацию, чтобы узнать направление на Каабу.');
});

// /settings
bot.onText(/\/settings/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    const user = users[chatId];
    
    let keyboard = [];
    Object.entries(methods).forEach(([key, name]) => {
        keyboard.push([{ text: name + ' (' + key + ')', callback_data: 'method_' + key }]);
    });
    
    bot.sendMessage(chatId, 'Текущий метод: ' + (methods[user.method] || user.method) + '\n\nВыберите новый метод:', {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// /region
bot.onText(/\/region/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    
    user.step = 'region';
    saveUsers();
    
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) {
        keyboard.push(regionNames.slice(i, i + 2));
    }
    
    bot.sendMessage(chatId, 'Выберите новый регион:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

// /off
bot.onText(/\/off/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    users[chatId].notifications = false;
    saveUsers();
    bot.sendMessage(chatId, 'Уведомления выключены');
});

// /on
bot.onText(/\/on/, (msg) => {
    const chatId = msg.chat.id;
    if (!isConfigured(chatId)) return bot.sendMessage(chatId, 'Сначала /start');
    users[chatId].notifications = true;
    saveUsers();
    bot.sendMessage(chatId, 'Уведомления включены');
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
            user.stats = { prayersToday: 0, totalPrayers: 0, lastReset: new Date().toDateString(), markedPrayers: {} };
        }
        if (!user.stats.markedPrayers) user.stats.markedPrayers = {};
        
        const today = new Date().toDateString();
        if (!user.stats.markedPrayers[today]) user.stats.markedPrayers[today] = [];
        
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
    
    bot.answerCallbackQuery(query.id);
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

// Обработка сообщений
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
        Object.entries(methods).forEach(([key, name]) => {
            methodKeyboard.push([name + ' (' + key + ')']);
        });
        
        bot.sendMessage(chatId, 'Регион: ' + text + '\n\nВыберите метод расчёта:', {
            reply_markup: { keyboard: methodKeyboard, resize_keyboard: true, one_time_keyboard: true }
        });
        return;
    }
    
    if (user?.step === 'method') {
        const methodMatch = Object.entries(methods).find(([key, name]) => text.startsWith(name));
        if (methodMatch) {
            user.method = parseInt(methodMatch[0]);
            user.step = 'done';
            saveUsers();
            
            bot.sendMessage(chatId, 'Настройка завершена! Используйте /help для списка команд.', {
                reply_markup: { remove_keyboard: true }
            });
            
            const timings = await getPrayerTimes(user.lat, user.lon, user.method);
            if (timings) {
                bot.sendMessage(chatId, 'Сегодня:\n\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
            }
            setupScheduler(chatId);
        }
        return;
    }
});

// Запуск планировщиков
Object.keys(users).forEach(chatId => {
    if (isConfigured(chatId)) setupScheduler(chatId);
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
console.log('Методов:', Object.keys(methods).length);