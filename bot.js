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
        return null;
    }
}

// Сбор монет с фермы
function collectFarm(chatId) {
    const user = users[chatId];
    if (!user?.pet) return;
    const pet = user.pet;
    const now = Date.now();
    
    if (!pet.lastFarmCollect) {
        pet.lastFarmCollect = now;
        pet.coins += 3;
        saveUsers();
        return;
    }
    
    const timeDiff = now - pet.lastFarmCollect;
    const collectsAvailable = Math.floor(timeDiff / (10 * 60 * 1000));
    
    if (collectsAvailable >= 1) {
        const coinsGain = collectsAvailable * 3;
        pet.coins += coinsGain;
        pet.lastFarmCollect = now;
        saveUsers();
        bot.sendMessage(chatId, 'Ферма принесла ' + coinsGain + ' монет!');
    } else {
        const nextCollect = 10 * 60 * 1000 - timeDiff;
        const minutes = Math.ceil(nextCollect / 60000);
        bot.sendMessage(chatId, 'Монеты ещё не выросли. Подождите ' + minutes + ' мин.');
    }
}

// Проверка тренировок (16 раз в 12 часов)
function canTrain(chatId) {
    const user = users[chatId];
    if (!user?.pet) return { can: false, reason: 'Сначала создайте воина: /pet' };
    const pet = user.pet;
    const now = Date.now();
    
    if (!pet.trainResetTime) {
        pet.trainResetTime = now;
        pet.trainCount = 0;
        saveUsers();
    }
    
    const timeDiff = now - pet.trainResetTime;
    if (timeDiff >= 12 * 60 * 60 * 1000) {
        pet.trainResetTime = now;
        pet.trainCount = 0;
        saveUsers();
    }
    
    if (pet.trainCount >= 16) {
        const nextReset = 12 * 60 * 60 * 1000 - timeDiff;
        const hours = Math.floor(nextReset / 3600000);
        const minutes = Math.ceil((nextReset % 3600000) / 60000);
        return { can: false, reason: 'Лимит тренировок исчерпан! Следующая через ' + hours + ' ч ' + minutes + ' мин.' };
    }
    
    return { can: true };
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

// /pet
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
    message += 'Монеты: ' + pet.coins + '\n';
    message += 'Тренировки: ' + (pet.trainCount || 0) + '/16\n\n';
    message += '/battle — сражаться с врагом\n/pvp — битва с игроком\n/train — тренироваться\n/heal — лечиться (5 монет)\n/farm — собрать монеты с фермы\n/rename — переименовать';
    bot.sendMessage(chatId, message);
}

// /farm
bot.onText(/\/farm/, (msg) => {
    const chatId = msg.chat.id;
    collectFarm(chatId);
});

// /battle
bot.onText(/\/battle/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    const pet = user.pet;
    const enemy = enemies[Math.min(pet.level - 1, enemies.length - 1)];
    let petHp = pet.hp;
    let enemyHp = enemy.hp;
    let battleLog = 'Битва с ' + enemy.name + '!\n\n';
    
    while (petHp > 0 && enemyHp > 0) {
        const petDamage = Math.max(1, pet.attack - 2 + Math.floor(Math.random() * 5));
        enemyHp -= petDamage;
        battleLog += 'Вы нанесли ' + petDamage + ' урона. У врага ' + Math.max(0, enemyHp) + ' HP\n';
        if (enemyHp <= 0) break;
        const enemyDamage = Math.max(1, enemy.attack - Math.floor(pet.defense / 2) + Math.floor(Math.random() * 3));
        petHp -= enemyDamage;
        battleLog += enemy.name + ' нанёс ' + enemyDamage + ' урона. У вас ' + Math.max(0, petHp) + ' HP\n';
    }
    
    if (petHp <= 0) {
        pet.hp = Math.floor(pet.maxHp / 2);
        saveUsers();
        return bot.sendMessage(chatId, battleLog + '\nВы проиграли! Воин восстановил половину здоровья.');
    }
    
    const expGain = enemy.reward;
    const coinsGain = enemy.reward;
    pet.exp += expGain;
    pet.coins += coinsGain;
    pet.hp = petHp;
    
    if (pet.exp >= pet.level * 100) {
        pet.exp -= pet.level * 100;
        pet.level++;
        pet.maxHp += 10;
        pet.hp = pet.maxHp;
        pet.attack += 2;
        pet.defense += 1;
        pet.coins += 10; // бонус за уровень
        battleLog += '\nПовышен уровень! Теперь ' + pet.level + ' уровень!\nБонус: +10 монет!\n';
    }
    saveUsers();
    bot.sendMessage(chatId, battleLog + '\nПобеда!\nОпыт: +' + expGain + '\nМонеты: +' + coinsGain);
});

// /pvp — битва с игроком
bot.onText(/\/pvp/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    // Список доступных игроков
    const availablePlayers = Object.entries(users).filter(([id, u]) => u.pet && id !== chatId);
    
    if (availablePlayers.length === 0) {
        return bot.sendMessage(chatId, 'Нет доступных игроков для битвы.');
    }
    
    let keyboard = [];
    availablePlayers.forEach(([id, u]) => {
        keyboard.push([u.pet.name + ' (Уровень ' + u.pet.level + ')']);
    });
    
    bot.sendMessage(chatId, 'Выберите противника:', {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
    
    user.choosingPvp = true;
    saveUsers();
});

// /train
bot.onText(/\/train/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    
    const trainCheck = canTrain(chatId);
    if (!trainCheck.can) return bot.sendMessage(chatId, trainCheck.reason);
    
    const pet = user.pet;
    const expGain = 5 + Math.floor(Math.random() * 5);
    pet.exp += expGain;
    pet.trainCount = (pet.trainCount || 0) + 1;
    
    if (pet.exp >= pet.level * 100) {
        pet.exp -= pet.level * 100;
        pet.level++;
        pet.maxHp += 10;
        pet.hp = pet.maxHp;
        pet.attack += 2;
        pet.defense += 1;
        pet.coins += 10;
        saveUsers();
        return bot.sendMessage(chatId, 'Тренировка! Опыт: +' + expGain + '\n\nПовышен уровень! Теперь ' + pet.level + ' уровень!\nБонус: +10 монет!');
    }
    
    saveUsers();
    bot.sendMessage(chatId, 'Тренировка! Опыт: +' + expGain + '\nВсего: ' + pet.exp + '/' + (pet.level * 100) + '\nТренировки: ' + pet.trainCount + '/16');
});

// /heal
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

// /rename
bot.onText(/\/rename/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user?.pet) return bot.sendMessage(chatId, 'Сначала создайте воина: /pet');
    user.renamingPet = true;
    saveUsers();
    bot.sendMessage(chatId, 'Введите новое имя:');
});

// Обработка сообщений
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
            bot.sendMessage(chatId, 'Настройка завершена! Пока ждёшь Намаз, можешь создать своего питомца: /pet', {
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
            coins: 0,
            trainCount: 0,
            trainResetTime: Date.now(),
            lastFarmCollect: null
        };
        user.creatingPetName = false;
        saveUsers();
        bot.sendMessage(chatId, 'Воин создан!');
        showPet(chatId);
        return;
    }
    
    // Выбор противника для PvP
    if (user?.choosingPvp) {
        const targetEntry = Object.entries(users).find(([id, u]) => u.pet && u.pet.name === text && id !== chatId);
        if (targetEntry) {
            user.choosingPvp = false;
            saveUsers();
            
            const [targetId, targetUser] = targetEntry;
            const myPet = user.pet;
            const enemyPet = targetUser.pet;
            
            let myHp = myPet.hp;
            let enemyHp = enemyPet.hp;
            let battleLog = 'PvP битва: ' + myPet.name + ' vs ' + enemyPet.name + '!\n\n';
            
            while (myHp > 0 && enemyHp > 0) {
                const myDamage = Math.max(1, myPet.attack - Math.floor(enemyPet.defense / 2) + Math.floor(Math.random() * 5));
                enemyHp -= myDamage;
                battleLog += 'Вы нанесли ' + myDamage + ' урона. У ' + enemyPet.name + ' ' + Math.max(0, enemyHp) + ' HP\n';
                if (enemyHp <= 0) break;
                const enemyDamage = Math.max(1, enemyPet.attack - Math.floor(myPet.defense / 2) + Math.floor(Math.random() * 5));
                myHp -= enemyDamage;
                battleLog += enemyPet.name + ' нанёс ' + enemyDamage + ' урона. У вас ' + Math.max(0, myHp) + ' HP\n';
            }
            
            if (myHp <= 0) {
                myPet.hp = Math.floor(myPet.maxHp / 2);
                saveUsers();
                return bot.sendMessage(chatId, battleLog + '\nВы проиграли!');
            }
            
            myPet.hp = myHp;
            const expGain = 15 + enemyPet.level * 5;
            const coinsGain = 10 + enemyPet.level * 3;
            myPet.exp += expGain;
            myPet.coins += coinsGain;
            
            if (myPet.exp >= myPet.level * 100) {
                myPet.exp -= myPet.level * 100;
                myPet.level++;
                myPet.maxHp += 10;
                myPet.hp = myPet.maxHp;
                myPet.attack += 2;
                myPet.defense += 1;
                myPet.coins += 10;
                battleLog += '\nПовышен уровень! Теперь ' + myPet.level + ' уровень!\nБонус: +10 монет!\n';
            }
            
            saveUsers();
            
            // Уведомляем противника
            bot.sendMessage(targetId, 'Вас победил ' + myPet.name + '!');
            
            bot.sendMessage(chatId, battleLog + '\nПобеда!\nОпыт: +' + expGain + '\nМонеты: +' + coinsGain);
        }
    }
    
    // Переименование
    if (user?.renamingPet && user.pet) {
        user.pet.name = text;
        user.renamingPet = false;
        saveUsers();
        bot.sendMessage(chatId, 'Воин переименован в ' + text + '!');
    }
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
console.log('Регионов:', Object.keys(regions).length);