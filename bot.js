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

// Классы персонажей
const classes = {
    'mech': { name: 'Мечник', weapon: 'Меч', attack: 10, defense: 5, speed: 5 },
    'strelok': { name: 'Стрелок', weapon: 'Лук', attack: 8, defense: 3, speed: 8 },
    'vsadnik': { name: 'Всадник', weapon: 'Копьё', attack: 9, defense: 6, speed: 7 },
    'zashchitnik': { name: 'Защитник', weapon: 'Щит и меч', attack: 6, defense: 12, speed: 4 }
};

const enemies = [
    { name: 'Разбойник', hp: 20, attack: 4, reward: 10 },
    { name: 'Дикий зверь', hp: 30, attack: 6, reward: 15 },
    { name: 'Враг каравана', hp: 40, attack: 8, reward: 20 },
    { name: 'Опытный воин', hp: 50, attack: 10, reward: 30 },
    { name: 'Главарь шайки', hp: 70, attack: 14, reward: 50 }
];

const regions = {
    'Москва': { lat: 55.7558, lon: 37.6173 },
    'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
    'Казань': { lat: 55.8304, lon: 49.0661 },
    'Екатеринбург': { lat: 56.8389, lon: 60.6057 },
    'Тюмень': { lat: 57.1522, lon: 65.5272 },
    'Уфа': { lat: 54.7388, lon: 55.9721 },
    'Грозный': { lat: 43.3178, lon: 45.6981 },
    'Махачкала': { lat: 42.9849, lon: 47.5046 },
    'Назрань': { lat: 43.2257, lon: 44.7648 },
    'Дербент': { lat: 42.0587, lon: 48.2908 }
};

const methods = {
    '16': 'ДУМ РФ',
    '3': 'MWL (Всемирная лига)',
    '2': 'ISNA (Сев. Америка)',
    '4': 'Umm Al-Qura (Мекка)',
    '13': 'Турция (Diyanet)'
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

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let keyboard = [];
    const regionNames = Object.keys(regions);
    for (let i = 0; i < regionNames.length; i += 2) {
        keyboard.push(regionNames.slice(i, i + 2));
    }
    bot.sendMessage(chatId, 'Ассаляму алейкум!\n\nВыберите ваш регион для намаза:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

// Создание питомца
bot.onText(/\/pet/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || !user.step || user.step !== 'done') {
        return bot.sendMessage(chatId, 'Сначала настройте намаз через /start');
    }
    if (user.pet) {
        return showPet(chatId);
    }
    
    let keyboard = [];
    Object.entries(classes).forEach(([key, cls]) => {
        keyboard.push([cls.name + ' — ' + cls.weapon + ' (Атака: ' + cls.attack + ', Защита: ' + cls.defense + ')']);
    });
    
    bot.sendMessage(chatId, 'Выберите класс вашего воина:\n\nКласс изменить нельзя!', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
    
    user.creatingPet = true;
    saveUsers();
});

// Показ питомца
function showPet(chatId) {
    const user = users[chatId];
    if (!user.pet) return;
    const pet = user.pet;
    
    let message = 'Ваш воин:\n\n';
    message += 'Имя: ' + pet.name + '\n';
    message += 'Класс: ' + pet.className + '\n';
    message += 'Уровень: ' + pet.level + '\n';
    message += 'Опыт: ' + pet.exp + '/' + (pet.level * 100) + '\n';
    message += 'Здоровье: ' + pet.hp + '/' + pet.maxHp + '\n';
    message += 'Атака: ' + pet.attack + '\n';
    message += 'Защита: ' + pet.defense + '\n';
    message += 'Монеты: ' + pet.coins + '\n\n';
    message += '/battle — сражаться\n/train — тренироваться\n/heal — лечиться (5 монет)\n/rename — переименовать';
    
    bot.sendMessage(chatId, message);
}

// Обработка выбора класса
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    
    const user = users[chatId];
    
    // Выбор региона
    if (regions[text] && !user?.step) {
        users[chatId] = {
            region: text,
            lat: regions[text].lat,
            lon: regions[text].lon,
            method: 16,
            notifications: true,
            step: 'method'
        };
        saveUsers();
        
        let methodKeyboard = [];
        Object.entries(methods).forEach(([key, name]) => {
            methodKeyboard.push([name + ' (' + key + ')']);
        });
        
        bot.sendMessage(chatId, 'Выберите метод расчёта:', {
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
            
            bot.sendMessage(chatId, 'Настройка завершена!\n\nТеперь можете создать воина: /pet', {
                reply_markup: { remove_keyboard: true }
            });
            
            const timings = await getPrayerTimes(user.lat, user.lon, user.method);
            if (timings) {
                bot.sendMessage(chatId, 'Сегодня:\nФаджр: ' + timings.Fajr + '\nЗухр: ' + timings.Dhuhr + '\nАср: ' + timings.Asr + '\nМагриб: ' + timings.Maghrib + '\nИша: ' + timings.Isha);
            }
            setupScheduler(chatId);
        }
        return;
    }
    
    // Создание питомца — выбор класса
    if (user?.creatingPet) {
        const classMatch = Object.entries(classes).find(([key, cls]) => text.startsWith(cls.name));
        if (classMatch) {
            const [classKey, cls] = classMatch;
            user.creatingPet = false;
            user.creatingPetName = true;
            user.petClass = classKey;
            saveUsers();
            
            bot.sendMessage(chatId, 'Отличный выбор! Теперь дайте имя воину:', {
                reply_markup: { remove_keyboard: true }
            });
        }
        return;
    }
    
    // Ввод имени питомца
    if (user?.creatingPetName) {
        user.pet = {
            name: text,
            className: classes[user.petClass].name,
            classKey: user.petClass,
            level: 1,
            exp: 0,
            hp: 50 + classes[user.petClass].defense * 5,
            maxHp: 50 + classes[user.petClass].defense * 5,
            attack: classes[user.petClass].attack,
            defense: classes[user.petClass].defense,
            speed: classes[user.petClass].speed,
            coins: 0
        };
        user.creatingPetName = false;
        saveUsers();
        
        bot.sendMessage(chatId, 'Воин создан!');
        showPet(chatId);
    }
});

// Битва
bot.onText(/\/battle/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    const pet = user.pet;
    const enemy = enemies[Math.min(pet.level - 1, enemies.length - 1)];
    
    // Простой бой
    let petHp = pet.hp;
    let enemyHp = enemy.hp;
    let battleLog = 'Битва с ' + enemy.name + '!\n\n';
    
    while (petHp > 0 && enemyHp > 0) {
        // Игрок атакует
        const petDamage = Math.max(1, pet.attack - 2 + Math.floor(Math.random() * 5));
        enemyHp -= petDamage;
        battleLog += 'Вы нанесли ' + petDamage + ' урона. У врага ' + Math.max(0, enemyHp) + ' HP\n';
        
        if (enemyHp <= 0) break;
        
        // Враг атакует
        const enemyDamage = Math.max(1, enemy.attack - Math.floor(pet.defense / 2) + Math.floor(Math.random() * 3));
        petHp -= enemyDamage;
        battleLog += enemy.name + ' нанёс ' + enemyDamage + ' урона. У вас ' + Math.max(0, petHp) + ' HP\n';
    }
    
    if (petHp <= 0) {
        pet.hp = Math.floor(pet.maxHp / 2);
        saveUsers();
        return bot.sendMessage(chatId, battleLog + '\nВы проиграли! Воин восстановил половину здоровья.');
    }
    
    // Победа
    const expGain = enemy.reward;
    const coinsGain = enemy.reward;
    pet.exp += expGain;
    pet.coins += coinsGain;
    pet.hp = petHp;
    
    // Проверка уровня
    if (pet.exp >= pet.level * 100) {
        pet.exp -= pet.level * 100;
        pet.level++;
        pet.maxHp += 10;
        pet.hp = pet.maxHp;
        pet.attack += 2;
        pet.defense += 1;
        battleLog += '\nПовышен уровень! Теперь ' + pet.level + ' уровень!\n';
    }
    
    saveUsers();
    bot.sendMessage(chatId, battleLog + '\nПобеда!\nОпыт: +' + expGain + '\nМонеты: +' + coinsGain);
});

// Тренировка
bot.onText(/\/train/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    const pet = user.pet;
    const expGain = 5 + Math.floor(Math.random() * 5);
    pet.exp += expGain;
    
    if (pet.exp >= pet.level * 100) {
        pet.exp -= pet.level * 100;
        pet.level++;
        pet.maxHp += 10;
        pet.hp = pet.maxHp;
        pet.attack += 2;
        pet.defense += 1;
        saveUsers();
        return bot.sendMessage(chatId, 'Тренировка! Опыт: +' + expGain + '\n\nПовышен уровень! Теперь ' + pet.level + ' уровень!');
    }
    
    saveUsers();
    bot.sendMessage(chatId, 'Тренировка! Опыт: +' + expGain + '\nВсего: ' + pet.exp + '/' + (pet.level * 100));
});

// Лечение
bot.onText(/\/heal/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    const pet = user.pet;
    if (pet.coins < 5) return bot.sendMessage(chatId, 'Недостаточно монет! Нужно 5 монет.');
    
    pet.coins -= 5;
    pet.hp = pet.maxHp;
    saveUsers();
    bot.sendMessage(chatId, 'Воин вылечен! Здоровье: ' + pet.hp + '/' + pet.maxHp);
});

// Переименование
bot.onText(/\/rename/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    user.renamingPet = true;
    saveUsers();
    bot.sendMessage(chatId, 'Введите новое имя:');
});

// /pet — показать питомца
bot.onText(/\/pet/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    showPet(chatId);
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user) return bot.sendMessage(chatId, 'Сначала /start');
    bot.sendMessage(chatId, 'Регион: ' + user.region + '\nМетод: ' + (methods[user.method] || user.method) + '\nУведомления: ' + (user.notifications ? 'включены' : 'выключены') + (user.pet ? '\nВоин: ' + user.pet.name : ''));
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

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('HTTP сервер запущен на порту ' + PORT);
});

console.log('Бот запущен!');