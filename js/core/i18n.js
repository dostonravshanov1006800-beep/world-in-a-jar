// FILE: js/core/i18n.js
// Локализация: ru (основной), uz (латиница, oʻ/gʻ/ʼ), en. Fallback: en -> ключ.
WJ.I18n = (function () {
  const ru = {
    ui: {
      day: 'День', morning: 'Утро', afternoon: 'День', evening: 'Вечер', night: 'Ночь',
      harmony: 'Гармония', skyEnergy: 'Энергия неба', chronicle: 'Летопись', residents: 'Жители',
      pause: 'Пауза', play: 'Играть', resume: 'Продолжить', settings: 'Настройки', shelf: 'Полка',
      achievements: 'Достижения', close: 'Закрыть', ok: 'Хорошо', cancel: 'Отмена', yes: 'Да',
      speed: 'Скорость', speed1: '×1', speed2: '×2',
      menuTitle: 'Мир в банке', menuSub: 'Крошечная живая планета в стеклянной банке. Влияет на погоду, давай мудрые советы — и смотри, как растут их истории.',
      menuAch: 'Достижения', menuLang: 'Язык',
      adviceTitle: 'Совет на сегодня', adviceGiven: 'Совет уже дан сегодня',
      followed: 'послушался', ignored: 'поступил по-своему',
      settingsTitle: 'Настройки', sLang: 'Язык', sQuality: 'Качество', sSound: 'Звук', sMusic: 'Музыка', sVibro: 'Вибрация',
      sTextSize: 'Размер текста', sReduce: 'Меньше анимаций', sReset: 'Сбросить прогресс', sResetWarn: 'Точно стереть все планеты, достижения и звёздную пыль? Это нельзя отменить.',
      sTutorial: 'Повторить обучение', qAuto: 'Авто', qHigh: 'Высокое', qMed: 'Среднее', qLow: 'Низкое', on: 'Вкл', off: 'Выкл',
      tNormal: 'Обычный', tLarge: 'Крупный', tSmall: 'Мелкий',
      letterTitle: 'Письмо дня', letterSig: '— твои маленькие друзья',
      chronAll: 'Все', chronAdvice: 'Мои советы', chronBonds: 'Отношения', chronNature: 'Природа',
      chronEmpty: 'Пока ничего не случилось. История только начинается…',
      shelfTitle: 'Полка банок', newJar: 'Новая банка', jarLocked: 'Откроется в главе', pop: 'жит.', day: 'д.',
      achTitle: 'Достижения', achLocked: 'не открыто',
      energyLow: 'Мало энергии неба', weatherSet: 'Погода: {w}', rainbowNeed: 'Радуга бывает после дождя и солнца',
      tapResident: 'Нажми на жителя', newDay: 'День {n}',
      stars: 'Звёздная пыль', dailyGift: 'Ежедневный подарок: +{n} ✦',
      tutorial1: 'Это твой мир в банке. Покрути его пальцем — увидишь планету со всех сторон.',
      tutorial2: 'Щипком приблизь банку и отдали. Красиво, правда?',
      tutorial3: 'Тапни по любому жителю — камера подлетит ближе, и откроется его карточка.',
      tutorial4: 'В карточке жителя выбери один совет на день. Он может послушать… или нет.',
      tutorial5: 'Внизу — колесо погоды. Погода тратит Энергию неба, она копится сама.',
      tutorial6: 'Кнопка «Летопись» хранит все события мира. Заглядывай туда вечером!',
      tutNext: 'Дальше', tutSkip: 'Пропустить',
      errToast: 'Что-то пошло не так, но игра сохранена',
      noWebgl: 'Не удалось запустить графику', noWebglHint: 'Похоже, браузер не поддерживает WebGL. Попробуй обновить браузер или включить аппаратное ускорение.',
      seed: 'Семя', debug: 'отладка', newPlanet: 'Новая планета создана', chapterDone: 'Глава пройдена',
      stories: 'Открытые истории', storyOpen: 'Открыта история: {s}',
      quit: 'В меню', reallyMenu: 'Выйти в меню? Мир сохранится.',
      mood: { great: 'Восторг', good: 'Радость', ok: 'Нормально', low: 'Грустно', bad: 'Плохо' },
      age: { child: 'ребёнок', adult: 'взрослый', elder: 'старец' },
      relations: { friend: 'друг', best: 'лучший друг', pair: 'пара', family: 'семья', rival: 'соперник', known: 'знакомый' },
    },
    weather: { clear: 'Ясно', sun: 'Солнце', rain: 'Дождь', wind: 'Ветер', snow: 'Снег', fog: 'Туман', storm: 'Гроза', rainbow: 'Радуга' },
    needs: { food: 'Еда', rest: 'Отдых', safety: 'Покой', social: 'Общение', meaning: 'Смысл' },
    traits: { brave: 'смелый', social: 'общительный', hard: 'трудолюбивый', trusting: 'доверчивый', curious: 'любопытный' },
    chapter: {
      1: 'Первые огни', 2: 'Деревня', 3: 'Праздник', 4: 'Дружный мир', 5: 'Город в банке', 6: 'Мудрость',
      d1: 'Разожги первый костёр', d2: 'Вырасти деревню: 8 жителей, 5 домов, поле', d3: 'Устрой первый праздник',
      d4: 'Гармония 70+ три дня подряд', d5: 'Школа, рынок и маяк', d6: 'Открой 12 историй в Летописи',
    },
    advice: {
      go_home: 'Иди домой', talk: 'Поговори с соседом', risk: 'Рискни', wait: 'Подожди', build: 'Построй дом',
      plant: 'Посади дерево', forgive: 'Прости', confess: 'Признайся', rest: 'Отдохни', passion: 'Займись любимым делом',
      trust: 'Доверься', leave: 'Отправься в путь', save: 'Отложи на запас', share: 'Поделись', learn: 'Научись новому',
      slow: 'Не спеши', help: 'Помоги другому', fish: 'Порыбачь', dance: 'Потанцуй', look_sky: 'Посмотри на небо',
      make_peace: 'Помирись', be_brave: 'Будь смелее', be_careful: 'Будь осторожнее', celebrate: 'Устрой праздник',
    },
    ach: {
      first_fire: 'Первый огонь', first_home: 'Первый дом', first_wedding: 'Первая свадьба', first_birth: 'Первое рождение',
      rainbow_seen: 'Радуга', no_quarrel_5: 'Пять дней без ссор', wise_advice: 'Мудрый совет', ignored_advice: 'Упрямец',
      storm_survived: 'Гроза пережита', harvest_10: 'Хлебороб', pop_12: 'Дюжина', pop_24: 'Полная банка',
      elder_first: 'Мудрость лет', stars_3: 'Три истории звёзд', love_story: 'Тайная любовь', reconciliation: 'Примирение',
      festival_held: 'Устроитель праздника', lighthouse: 'Первый маяк', school_built: 'Ученье — свет',
      full_shelf: 'Полная полка', chronicle_50: 'Летописец', discovery_shell: 'Ракушка', discovery_star: 'Упавшая звезда',
      three_plants: 'Садовник', day_30: 'Месяц в банке',
    },
    story: {
      secret_love: 'Тайная любовь', wise_elder: 'Мудрый старик', first_lighthouse: 'Первый маяк',
      neighbors_peace: 'Примирение соседей', child_stars: 'Ребёнок и звёзды', great_harvest: 'Великий урожай',
      fisherman_luck: 'Удача рыбака', storm_hero: 'Герой грозы', rainbow_wish: 'Желание под радугой',
      festival_founder: 'Отец праздников', shy_singer: 'Тихая песня', seed_keeper: 'Хранитель семян',
      night_watcher: 'Ночной сторож', well_digger: 'Копатель колодца', cloud_dreamer: 'Мечтатель облаков',
      two_brothers: 'Два брата', lost_hat: 'Потерянная шапка', warm_winter: 'Тёплая зима',
      moon_walkers: 'Гуляющие под луной', tiny_garden: 'Крошечный сад',
    },
    letter: {
      header: 'Привет! Вот что случилось у нас за день…',
      noAdvice: 'Сегодня нам никто не давал советов, и мы просто жили. Получилось неплохо!',
      openers: ['Дорогой друг из-за стекла,', 'Привет от всех нас,', 'Мы чувствуем твоё внимание,'],
    },
    days: { one: '{n} день', few: '{n} дня', many: '{n} дней' },
  };

  // Событийные шаблоны: {name},{other},{place},{weather}. Объект {m,f} — родовые формы.
  ru.ev = {
    harvest: [
      '{name} собрал щедрый урожай {place}. Вечером вся деревня угощалась.',
      { m: 'Урожай удался на славу: {name} принёс корзины плодов {place}.', f: 'Урожай удался на славу: {name} принесла корзины плодов {place}.' },
      'Поля зашумели пшеницей — {name} говорит, это лучший урожай за всю историю банки.',
      'Соседи помогли {name} убрать урожай до дождей. Работали с песнями.',
      '{name} разделил урожай на всех, даже тем, кто не трудился на поле.',
      'Зерно на току блестит как золото. {name} улыбается весь день.',
    ],
    drought: [
      'Засуха: ручеёк у деревни обмелел, {name} носит воду от колодца по капле.',
      'Трава пожелтела. {name} прикрывает ростки ладонями от палящего {weather}.',
      'Сухой ветер. {name} молится о дожде, глядя в большое небо за стеклом.',
      'Трещины на земле {place}. {name} бережёт последнюю воду.',
      'Жара. Даже стрекозы спрятались. {name} поливает грядку из кружки.',
      'Пруд обмелел до ниточки. {name} считает капли в колодце.',
    ],
    flood: [
      'Дождь переполнил ручей! {name} спасал запасы, перенося их на холм.',
      'Вода поднялась к самым порогам. {name} и соседи построили насыпь из песка.',
      'Маленький потоп {place}: {name} смеялся, вычёрпывая воду сапогом.',
      'Река вышла из берегов. {name} переправлял соседей на плотике.',
      'После наводнения {name} нашёл на берегу блестящую ракушку.',
      'Вода ушла, оставив ил на полях. {name} говорит: земля теперь сытнее.',
    ],
    storm: [
      'Гроза! Молния вспыхнула над {place}. {name} сидел у окна и считал секунды до грома.',
      'Ветер гнул деревья. {name} укрепил крышу дома верёвками.',
      'Гром разбудил всю деревню. {name} зажёг лучину и рассказал сказку, пока буря не утихла.',
      'Молния попала в старое дерево {place} — {name} развёл из искры костёр.',
      'После грозы воздух чистый-чистый. {name} первым вышел посмотреть на радугу.',
      'Буря сорвала парус у лодочки. {name} починил его и повесил сушиться.',
    ],
    festival: [
      'Праздник! {name} пёк пироги, дети носились с флажками, до ночи горели гирлянды.',
      'Вечерний праздник {place}: песни, танцы у костра и тёплые слова.',
      '{name} устроил праздник просто так — «потому что жизнь хороша».',
      'На празднике {name} и {other} танцевали вместе, и все хлопали в ладоши.',
      'Гирлянды из светлячков, столы под открытым небом — {name} остался доволен.',
      'День завершился фейерверком из одуванчиков. Идея принадлежала {name}.',
    ],
    wedding: [
      '{name} и {other} поженились! Венки, музыка и счастливые лица всей деревни.',
      'Свадьба {place}: {name} сказал трогательную речь, {other} плакал от счастья.',
      'Две судьбы стали одной: {name} и {other} обменялись колечками из медной проволоки.',
      'Свадебный пир удался. {name} испёк трёхэтажный каравай.',
      'После свадьбы {name} и {other} переехали в новый домик у ручья.',
      'Даже облака, казалось, улыбались свадьбе {name} и {other}.',
    ],
    birth: [
      'В семье {name} родился ребёнок! Весь день деревня толпилась у порога.',
      'Крошечные пальчики, нос-пуговка: у {name} родился малыш.',
      'Новый житель! {name} качает люльку и поёт колыбельную.',
      'Стукнут ложкой о кружку — новый младенец у {name}. Деревня ликует!',
      'Малыш {name} впервые увидел небо за стеклом и потянулся ручкой к свету.',
      'Колыбель сплетена из травы. {name} смотрит на дитя и не может наглядеться.',
    ],
    discovery: [
      '{name} нашёл у берега удивительную ракушку, переливающуюся всеми цветами.',
      '{name} заметил ночью падающую звезду и загадал желание.',
      'На холме {name} откопал блестящий камушек — теперь он талисман деревни.',
      '{name} открыл новую тропинку к ручью, заросшую цветами.',
      'Заинтересовавшись, {name} пересчитал все деревья и нарисовал первую карту.',
      'Светлячок уснул на ладони {name}, и тот тихонько отнёс его в траву.',
    ],
    quarrel: [
      '{name} и {other} повздорили из-за пустяка и три часа не разговаривали.',
      'Ссора {place}: {name} хлопнул дверью, {other} ушёл к ручью думать.',
      'Гордость помешала {name} извиниться первым. {other} тоже молчит.',
      '{name} и {other} не поделили урожайное ведро. Дело дошло до смешного.',
      'Обидные слова сказал {name}, и теперь на сердце как камень.',
      'Дым от ссоры виден был весь день. {name} и {other} разошлись по домам.',
    ],
    reconciliation: [
      '{name} первым протянул руку — и {other} простил его. Ссора забыта.',
      'Мир! {name} и {other} пили чай и смеялись над вчерашним.',
      '{name} испёк мирный пирог для {other}. Гордость тает быстрее инея.',
      'Дружба крепче прежнего: {name} и {other} посадили дерево примирения.',
      'У костра {name} сказал тёплое слово — {other} кивнул, и всё стало хорошо.',
      'После ссоры {name} и {other} стали понимать друг друга лучше.',
    ],
    move: [
      '{name} переехал в новый дом! Первым делом поставил на окно цветок.',
      'Крыша новая, стены крепкие: {name} устроил новоселье.',
      '{name} перевёз вещи на тележке, и весь день пах стружкой и праздником.',
      'Домик {name} теперь самый уютный {place}, считают соседи.',
      'Дым из трубы нового дома {name} — верный знак: здесь теперь живут.',
      '{name} вешает качели у крыльца. Дом получился на славу.',
    ],
    gift: [
      '{name} подарил {other} букет полевых цветов просто так.',
      'Подарок {place}: {name} смастерил для {other} шкатулку из ореховой скорлупы.',
      '{other} расплакался от счастья — {name} подарил самую спелую грушу.',
      'Утром у двери {other} нашёл корзинку ягод от {name}.',
      '{name} вырезал из дерева фигурку журавля и подарил её {other}.',
      'Даже маленький подарок {name} делает с большим сердцем.',
    ],
    miracle: [
      'РАДУГА! Вся деревня вышла из домов. {name} шептал желание — говорят, сбудется.',
      'После дождя и солнца над {place} встала радуга. Дети скакали под ней.',
      'Чудо в банке: двойная радуга! {name} первым заметил её и закричал от радости.',
      'Радуга висела над планетой целый час. {name} зарисовал её на бересте.',
      'В цветах радуги мокрые крыши, трава и даже кот {name}.',
      '{name} сказал: радуга — это небо улыбается нам. Никто не стал спорить.',
    ],
    aging: [
      '{name} с годами стал рассуждает неспешно, как речка. Мудрость пришла.',
      'Серебро в волосах {name} блестит под солнцем. Молодёжь слушает его истории.',
      '{name} отпраздновал юбилей: соседей угощал, сказки рассказывал до ночи.',
      'Старость {name} легка: каждый день прогулка у ручья и половник каши для внуков.',
      '{name} теперь читает по вечерам вслух, и вся улица собирается слушать.',
      'Ноги {name} уже не те, зато глаза видят дальше всех.',
    ],
    departure: [
      '{name} тихо ушёл к звёздам. Огонёк поднялся над планетой и мерцает теперь в ночи.',
      'Вечная память: {name} жил честно и тепло. Деревня зажгла фонарики в его честь.',
      '{name} стал светом. Соседи обещали беречь его любимое дерево.',
      'Над планетой взошла новая звёздочка — это {name} машет нам с неба.',
      'Дети {name} получат его наследие: характер и добрую память.',
      'Мягкий свет поднялся {place} — {name} отправился в последнее прекрасное путешествие.',
    ],
    advice_ok: [
      '{name} послушался твоего совета «{a}» — и всё вышло прекрасно.',
      'Совет «{a}» пригодился: {name} благодарно машет тебе рукой.',
      '{name} последовал совету «{a}». Доверие к тебе крепнет.',
      'Твой стикер «{a}» попал в точку: {name} доволен результатом.',
      '{name} сделал, как ты советовал («{a}»), и день удался.',
      '«{a}» — какой мудрый совет! — сказал {name}, и был прав.',
    ],
    advice_ignored: [
      '{name} поступил по-своему, не послушав совета «{a}».',
      '«В другой раз!» — сказал {name} и оставил стикер «{a}» без внимания.',
      '{name} даже не взглянул на твой стикер «{a}». Упрямство!',
      'Совет «{a}» остался на ветру: {name} был занят своим.',
      '{name} сомневался в совете «{a}» — и решил рискнуть по-своему.',
      'Твоё «{a}» не пригодилось: {name} выбрал собственную дорогу.',
    ],
    built: [
      'Костёр запылал — в банке стало на один очаг тепла больше.',
      'Новый дом встал у ручья: стены, крыша, тёплый свет в окне.',
      'Маяк зажёг свой огонь над морем. Кораблям теперь есть куда плыть.',
      'Школа открыла двери: слышно, как дети скандируют буквы.',
      'Рынок шумит: пирожки, ягоды, смех и честный обмен.',
      'Колодец дал первую воду — свежую, звенящую от холода.',
    ],
    new_resident: [
      'К планете прилетела светящаяся пылинца — и стала жителем! Зовут {name}.',
      'Новый житель сошёл с радужного мостика. {name} — имя на бирке.',
      'Из тумана у ручья появился {name}. «Буду жить здесь», — сказал он.',
      'Птенец из гнезда принёс имя новому жителю: {name}.',
      'Родилась душа ветра — деревня встречает {name}!',
      'Семечко дало росток, а росток — человека: у нас новый житель, {name}.',
    ],
  };

  // ---------------- UZBEK (latin) ----------------
  const uz = {
    ui: {
      day: 'Kun', morning: 'Ertalab', afternoon: 'Kunduzi', evening: 'Kech', night: 'Tun',
      harmony: 'Uygʻunlik', skyEnergy: 'Osmon energiyasi', chronicle: 'Yilnoma', residents: 'Aholi',
      pause: 'Pauza', play: 'Oʻynash', resume: 'Davom etish', settings: 'Sozlamalar', shelf: 'Raf',
      achievements: 'Yutuqlar', close: 'Yopish', ok: 'Yaxshi', cancel: 'Bekor', yes: 'Ha',
      speed: 'Tezlik', speed1: '×1', speed2: '×2',
      menuTitle: 'Bankadagi dunyo', menuSub: 'Shisha bankada mitti tirik sayyora. Ob-havoga taʼsir qil, dono maslahatlar ber — ularning hikoyalarini kuzat.',
      menuAch: 'Yutuqlar', menuLang: 'Til',
      adviceTitle: 'Bugungi maslahat', adviceGiven: 'Bugun maslahat berilgan',
      followed: 'quloq soldi', ignored: 'oʻz yoʻli bilan ketdi',
      settingsTitle: 'Sozlamalar', sLang: 'Til', sQuality: 'Sifat', sSound: 'Ovoz', sMusic: 'Musiqa', sVibro: 'Tebranish',
      sTextSize: 'Matn oʻlchami', sReduce: 'Animatsiyalar kamroq', sReset: 'Progressni tozalash', sResetWarn: 'Barcha sayyoralar, yutuqlar va yulduz changini oʻchirishga ishonchingiz komilmi? Bu qaytarilmaydi.',
      sTutorial: 'Oʻquv qoʻllanmani qayta', qAuto: 'Avto', qHigh: 'Yuqori', qMed: 'Oʻrta', qLow: 'Past', on: 'Yoqilgan', off: 'Oʻchirilgan',
      tNormal: 'Oddiy', tLarge: 'Katta', tSmall: 'Kichik',
      letterTitle: 'Kun xati', letterSig: '— sening mitti doʻstlaring',
      chronAll: 'Hammasi', chronAdvice: 'Maslahatlarim', chronBonds: 'Munosabatlar', chronNature: 'Tabiat',
      chronEmpty: 'Hozircha hech narsa boʻlmadi. Hikoya endi boshlanmoqda…',
      shelfTitle: 'Bankalar rafi', newJar: 'Yangi banka', jarLocked: 'Bobda ochiladi', pop: 'aholi', day: 'k.',
      achTitle: 'Yutuqlar', achLocked: 'ochilmagan',
      energyLow: 'Osmon energiyasi kam', weatherSet: 'Ob-havo: {w}', rainbowNeed: 'Kamalak yomgʻirdan keyin boʻladi',
      tapResident: 'Aholiga bosing', newDay: '{n}-kun',
      stars: 'Yulduz changi', dailyGift: 'Kunlik sovgʻa: +{n} ✦',
      tutorial1: 'Bu bankadagi sening dunyoing. Barmogʻing bilan aylantir — sayyorani hamma tomondan koʻr.',
      tutorial2: 'Ikkita barmoq bilan yaqinlashtir va uzoqlashtir. Chiroyli, shundaymi?',
      tutorial3: 'Aholi aʼzosiga bosing — kamera yaqinlashadi va kartochka ochiladi.',
      tutorial4: 'Kartochkada kunlik bitta maslahat tanlang. Eshitishi… yoki yoʻq — unga bogʻliq.',
      tutorial5: 'Pastda ob-havo gʻildiragi. Ob-havo osmon energiyasini sarflaydi, u oʻzi toʻplanadi.',
      tutorial6: '«Yilnoma» tugmasi dunyodagi barcha voqealarni saqlaydi. Kechqurun qarab tur!',
      tutNext: 'Keyingi', tutSkip: 'Oʻtkazib yuborish',
      errToast: 'Bir nimadir xato boʻldi, lekin oʻyin saqlangan',
      noWebgl: 'Grafikani ishga tushirishning imkoni yoʻq', noWebglHint: 'Brauzeringiz WebGL ni qoʻllab-quvvatlamaydi. Brauzerni yangilang yoki apparat tezlashtirishni yoqing.',
      seed: 'Urugʻ', debug: 'debug', newPlanet: 'Yangi sayyora yaratildi', chapterDone: 'Bob tugadi',
      stories: 'Ochilgan hikoyalar', storyOpen: 'Hikoya ochildi: {s}',
      quit: 'Menyuga', reallyMenu: 'Menyuga chiqilsinmi? Dunyo saqlanadi.',
      mood: { great: 'Balandlikda', good: 'Xursand', ok: 'Yaxshi', low: 'Gʻamgin', bad: 'Yomon' },
      age: { child: 'bola', adult: 'katta', elder: 'qariya' },
      relations: { friend: 'doʻst', best: 'yaqin doʻst', pair: 'juftlik', family: 'oila', rival: 'raqib', known: 'tanish' },
    },
    weather: { clear: 'Musof', sun: 'Quyosh', rain: 'Yomgʻir', wind: 'Shamol', snow: 'Qor', fog: 'Tuman', storm: 'Momoqaldiroq', rainbow: 'Kamalak' },
    needs: { food: 'Ovqat', rest: 'Dam', safety: 'Tinchlik', social: 'Muloqot', meaning: 'Maʼno' },
    traits: { brave: 'jasur', social: 'muloqotchan', hard: 'mehnatkash', trusting: 'ishonchan', curious: 'qiziquvchan' },
    chapter: {
      1: 'Birinchi chiroqlar', 2: 'Qishloq', 3: 'Bayram', 4: 'Doʻstona dunyo', 5: 'Bankadagi shahar', 6: 'Donolik',
      d1: 'Birinchi gulxan yoq', d2: 'Qishloqni oʻstir: 8 aholi, 5 uy, dala', d3: 'Birinchi bayramni oʻtkaz',
      d4: '3 kun ketma-ket 70+ uygʻunlik', d5: 'Maktab, bozor va mayak', d6: 'Yilnomada 12 hikoya och',
    },
    advice: {
      go_home: 'Uyga qayt', talk: 'Qoʻshni bilan gaplash', risk: 'Xavqiga tush', wait: 'Kut', build: 'Uy qur',
      plant: 'Daraxt ek', forgive: 'Kechir', confess: 'Eʼtirof et', rest: 'Dam ol', passion: 'Sevgan ishing bilan shugʻullan',
      trust: 'Ishon', leave: 'Safarga chiq', save: 'Zaxiraga qoʻy', share: 'Ulash', learn: 'Yangi oʻrgan',
      slow: 'Shoshma', help: 'Boshqaga yordam ber', fish: 'Baliq tut', dance: 'Raqs tush', look_sky: 'Osimga qara',
      make_peace: 'Tinch ol', be_brave: 'Jasurroq boʻl', be_careful: 'Ehtiyot boʻl', celebrate: 'Bayram qil',
    },
    ach: {
      first_fire: 'Birinchi olov', first_home: 'Birinchi uy', first_wedding: 'Birinchi toʻy', first_birth: 'Birinchi tugʻilish',
      rainbow_seen: 'Kamalak', no_quarrel_5: 'Besh kun nizosiz', wise_advice: 'Dono maslahat', ignored_advice: 'Qatʼiyat',
      storm_survived: 'Momoqaldiroqdan omon chiqdi', harvest_10: 'Dehqon', pop_12: 'Oʻn ikkita', pop_24: 'Toʻliq banka',
      elder_first: 'Yillar donoligi', stars_3: 'Yulduzlar hikoyasi', love_story: 'Maxfiy muhabbat', reconciliation: 'Kelishuv',
      festival_held: 'Bayram tashkilotchisi', lighthouse: 'Birinchi mayak', school_built: 'Ilm — nur',
      full_shelf: 'Toʻliq raf', chronicle_50: 'Yilnomachi', discovery_shell: 'Chigʻanoq', discovery_star: 'Tushgan yulduz',
      three_plants: 'Bogʻbon', day_30: 'Bankada bir oy',
    },
    story: {
      secret_love: 'Maxfiy muhabbat', wise_elder: 'Dono qariya', first_lighthouse: 'Birinchi mayak',
      neighbors_peace: 'Qoʻshnilarning kelishuvi', child_stars: 'Bola va yulduzlar', great_harvest: 'Buyuk hosil',
      fisherman_luck: 'Baliqchining omadi', storm_hero: 'Momoqaldiroq qahramoni', rainbow_wish: 'Kamalak ostidagi tilak',
      festival_founder: 'Bayram otasi', shy_singer: 'Jim qoʻshiq', seed_keeper: 'Urugʻ posboni',
      night_watcher: 'Tun qorovuli', well_digger: 'Quduq qazuvchi', cloud_dreamer: 'Bulut orzuqori',
      two_brothers: 'Iki aka-uka', lost_hat: 'Yoʻqolgan shlyapa', warm_winter: 'Iliq qish',
      moon_walkers: 'Oy ostida yuruvchilar', tiny_garden: 'Mitti bogʻ',
    },
    letter: {
      header: 'Salom! Bugun bizda bunday ishlar boʻldi…',
      noAdvice: 'Bugun hech kim maslahat bermadi, biz shunchaki yashadik. Yaxshi chiqdi!',
      openers: ['Shishadan tashqaridagi aziz doʻst,', 'Hammamizdan salom,', 'Biz eʼtiboringni sezamiz,'],
    },
    days: { one: '{n} kun', few: '{n} kun', many: '{n} kun' },
  };
  uz.ev = {
    harvest: [
      '{name} {place} moʻl hosil yigʻdi. Kechqurun butun qishloq zuhroh boʻldi.',
      'Hosil ajoyib chiqdi: {name} savatlarga mevalar toʻldirdi {place}.',
      'Dalalar bugʻdoydan shovqinladi — {name} aytishicha, bu banka tarixidagi eng yaxshi hosil.',
      'Qoʻshnilar {name} ga yomgʻrdan oldin hosil yigʻishga yordam berdi. Qoʻshiq aytib ishladilar.',
      '{name} hosilni hammaga boʻldi, daldan ishlaganlarga ham.',
      'Don rasmda oltindek yaltiraydi. {name} butun kun tabassum qiladi.',
    ],
    drought: [
      'Qurgʻoqchilik: qishloqdagʻi soycha quriydi, {name} quduqdan tomchi-tomcha suv tashiydi.',
      'Oʻt sargʻaydi. {name} koʻchatlarni qovurgʻichdan panjarlaydi.',
      'Quruq shamol. {name} shisha ortidagi katta osmonga qarab yomgʻr tilaydi.',
      '{place} yoriqlar bilan qoplandi. {name} oxirgi suvni asraydi.',
      'Iliq. Shirketlar ham berkindi. {name} choʻkichdan putha sugʻoradi.',
      'Hovuz ipqalin qoldi. {name} quduqdagi tomchalarni sanaydi.',
    ],
    flood: [
      'Yomgʻir soychani toʻldirdi! {name} zaxiralarni tepalikka koʻchirdi.',
      'Suv boʻsagʻagacha koʻtarildi. {name} va qoʻshnilar qumdan toʻgʻon qurdilar.',
      '{place} mitti toshqin: {name} etikdan suv chiqarib kuldi.',
      'Daryo qirgʻoqdan chiqdi. {name} qoʻshnilarni sodada olib oʻtdi.',
      'Toshqindan keyin {name} qirgʻoqda yaltiragan chigʻanoq topdi.',
      'Suv ketdi, dalalarda loy qoldi. {name} aytadi: yer endi toʻqroq.',
    ],
    storm: [
      'Momoqaldiroq! Chaqmoq {place} ustida yonib oʻtdi. {name} derazada oʻtirib gʻuldurgacha sonadi.',
      'Shamol daraxtlarni egdi. {name} uy tomini arqonlar bilan mustahkamledi.',
      'Gʻuldur butun qishloqni uygʻotdi. {name} sham yondirdi va boʻron tinchiguncha ertak aytdi.',
      'Chaqmoq eski daraxtga tushdi — {name} uchqundan gulxan yoqdi.',
      'Boʻrondan keyin havo toza-taza. {name} birinchi boʻlib kamalakka chiqdi.',
      'Boʻron qayiq yelkenini yirtib tashladi. {name} uni tuzatib quritishga ilib qoʻydi.',
    ],
    festival: [
      'Bayram! {name} pirog pishirdi, bolalar bayroqlar bilan yugurishdi, gʻirromlar kechgacha yonishi.',
      '{place} kechki bayram: qoʻshiqlar, gulxan atrofida raqslar va iliq soʻzlar.',
      '{name} bayramni shunchaki oʻtkazdi — «chunki hayot goʻzal».',
      'Bayramda {name} va {other} birga raqslar tushdi, hamma qarsak chaldi.',
      'Yulduzqurtlar gʻirromi, ochiq osmon ostida dasturxon — {name} mamnun qoldi.',
      'Kun qoqioqcha «fehlverk» bilan tugadi. Gʻoya muallifi — {name}.',
    ],
    wedding: [
      '{name} va {other} turmush qurdi! Gullar, musiqa va butun qishloqning xursand yuzlari.',
      '{place} toʻy: {name} taʼsirli nutq soʻzladi, {other} baxtdan yigʻladi.',
      'Iki taqdir bittaga aylandi: {name} va {other} mis simdan uzuk almashdi.',
      'Toʻy dasturxoni zoʻr chiqdi. {name} uch qavatli non pishirdi.',
      'Toʻydan keyin {name} va {other} soycha boʻyidagi yangi uyga koʻchishdi.',
      'Hatto bulutlar ham {name} va {other} toʻyiga tabassum qilgandek.',
    ],
    birth: [
      '{name} oilasida bola tugʻildi! Butun kun qishloq eshik oldida toʻplandi.',
      'Mitti barmoqlar, tugma burun: {name} da goʻdak dunyoga keldi.',
      'Yangi aholi! {name} beshikni tebratib allyorim aytadi.',
      'Qoshiqni choʻkichga urdi — {name} da yangi chaqaloq bor. Qishloq xursand!',
      '{name}ning goʻdagi shisha ortidagi osmoni birinchi koʻrdi va yorugʻlikka qoʻlin choʻzdi.',
      'Beshik oʻtdan toʻqildi. {name} bolaga qarab toʻyolmaydi.',
    ],
    discovery: [
      '{name} qirgʻoqda barcha ranglarda yaltiragan chigʻanoq topdi.',
      '{name} tunda tushayotgan yulduzni koʻrdi va tilak qildi.',
      'Tepalikda {name} yaltiragan tosh qazib oldi — endi u qishloq talismani.',
      '{name} soychaga olib boradigan, gullar bilan qoplangan yangi yoʻl ochdi.',
      'Qiziqib {name} barcha daraxtlarni sanadi va birinchi xaritani chizdi.',
      'Yulduzqurt {name}ning kaftida uxladi, u uni ehtiyot bilan oʻtga olib bordi.',
    ],
    quarrel: [
      '{name} va {other} mayda-chuyda nizo qilib, uch soat gaplashmadi.',
      '{place} nizo: {name} eshikni yapildirdi, {other} oʻylov bilan soychaga ketti.',
      'Gʻurur {name} ga birinchi uzr aytishga toʻsqinlik qildi. {other} ham jim.',
      '{name} va {other} hosil chelagini boʻlishmadi. Kulguli ish chiqdi.',
      '{name} ogʻir soʻz aytdi, endi yuragida toshdek ogʻirlik.',
      'Nizo tutuni butun kun koʻrindi. {name} va {other} uylariga tarqaldi.',
    ],
    reconciliation: [
      '{name} birinchi qoʻlin choʻzdi — {other} kechirdi. Nizo unutildi.',
      'Tinchlik! {name} va {other} choy ichib kechagi ustidan kulishdi.',
      '{name} {other} uchun tinchlik non-pirog pishirdi. Gʻurur tuzdan tez eriydi.',
      'Doʻstlik avvalgidan mustahkam: {name} va {other} kelishuv daraxtini ekdi.',
      'Gulxan atrofida {name} iliq soʻz aytdi — {other} bosh irgʻadi, hammasi yaxshi boʻldi.',
      'Nizodan keyin {name} va {other} bir-birini yaxshiroq tushunadigan boʻldi.',
    ],
    move: [
      '{name} yangi uyga koʻchdi! Birinchi ishi — oynaga gul qoʻydi.',
      'Yangi tom, mustahkam devorlar: {name} yangi uy chirogʻini oʻtkazdi.',
      '{name} buyumlarni aravachaga ortib tashidi, butun kun yogʻoch va bayram hidi tarqadi.',
      '{name}ning uyi endi eng uyquli joy, deydi qoʻshnilar.',
      'Yangi uydan tutun — ishonchli belgi: endi bu yerda yashashadi.',
      '{name} eshik oldiga altıbogʻ osmoq. Uy zoʻr chiqdi.',
    ],
    gift: [
      '{name} {other} ga shunchaki dala gullaridan buket berdi.',
      '{place} sovgʻa: {name} {other} uchun yongʻoq poʻstlogʻidan quticha yasadi.',
      '{other} baxtdan yigʻlab yubordi — {name} eng pishgan nokni sovgʻa qildi.',
      'Ertalab {other} eshigida {name} dan rezavorlar savati topildi.',
      '{name} yogʻochdan turna haykalchasini oʻyib {other} ga berdi.',
      '{name} hatto mitti sovgʻani ham katta yurak bilan beradi.',
    ],
    miracle: [
      'KAMALAK! Butun qishloq uylardan chiqdi. {name} pichirda tilak aytdi — aytilishicha, roʻyobga chiqadi.',
      'Yomgʻir va quyoshdan keyin {place} ustida kamalak koʻtarildi. Bolalar ostida sakrashdi.',
      'Bankada moʻjiza: qoʻsh kamalak! {name} birinchi koʻrib qichqirdi.',
      'Kamalak sayyora ustida bir soat turdi. {name} uni toʻqima qogʻozga chizdi.',
      'Kamalak ranglarida hoʻl tomlar, oʻt va hatto {name}ning mushigi.',
      '{name} dedi: kamalak — bu osmonning tabassumi. Hech kim bahslashmadi.',
    ],
    aging: [
      '{name} yillar bilan sekin oqib oʻylaydigan boʻldi, daryodek. Donolik keldi.',
      '{name}ning sochlaridagi kumush quyosh ostida yaltiraydi. Yoshlar uning hikoyalarini tinglaydi.',
      '{name} yubileyni nishonladi: qoʻshnilarni mehm qildi, kechgacha ertak aytdi.',
      '{name}ning qariligi yengil: har kun soychada sayr va nabiralar uchun bir qoshiq boʻtqa.',
      '{name} endi kechlari ovozlab kitob oʻqiydi, butun koʻcha yigʻilib tinglaydi.',
      '{name}ning oyoqlari avvalgidek emas, ammo koʻzlari hammadan uzoq koʻradi.',
    ],
    departure: [
      '{name} yulduzlarga sokin ketdi. Chaqmoqchа sayyora ustiga koʻtarilib, tunda yonadi.',
      'Abadiy yod: {name} halol va iliq yashadi. Qishloq uning sharafiga fonlar yoqdi.',
      '{name} yorugʻlikka aylandi. Qoʻshnilar uning sevgan daraxtini asraymiz dedilar.',
      'Sayyora ustida yangi yulduzcha koʻtarildi — bu {name} bizga osmondan qoʻl bulyapti.',
      '{name}ning bolalari uning merosini oladi: feʼl-atvor va mehribon xotira.',
      'Yumshoq nur {place} koʻtarildi — {name} oxirgi goʻzal safarga yoʻl oldi.',
    ],
    advice_ok: [
      '{name} sening «{a}» maslahatinga quloq soldi — va hammasi zoʻr chiqdi.',
      '«{a}» maslahati asqatdi: {name} minnatdorchilik bilan qoʻl buladi.',
      '{name} «{a}» maslahatiga amal qildi. Senga ishonchi mustahkamlanadi.',
      'Sening «{a}» stikeringiz moʻlga tegdi: {name} natijadan xursand.',
      '{name} sening maslahating bilan qildi («{a}»), va kun zoʻr oʻtdi.',
      '«{a}» — qanday dono maslahat! — dedi {name}, va haq edi.',
    ],
    advice_ignored: [
      '{name} «{a}» maslahatini eshitmay, oʻz yoʻli bilan ketdi.',
      '«Keyingi safar!» — dedi {name} va «{a}» stikerini eʼtiborsiz qoldirdi.',
      '{name} sening «{a}» stikeringizga hatto qaramadi. Qatʼiyat!',
      '«{a}» maslahati shamolda qoldi: {name} oʻz ishi bilan band edi.',
      '{name} «{a}» maslahatiga shubhalandi — va oʻzicha xavqiga tushdi.',
      'Sening «{a}» asqamadi: {name} oʻz yoʻlini tanladi.',
    ],
    built: [
      'Gulxan yonardi — bankada yana bir iliq oʻchoq paydo boʻldi.',
      'Soycha boʻyida yangi uy qaddi: devorlar, tom, oynada iliq nur.',
      'Mayak dengiz ustida olovini yoqdi. Endi kemalarga suzish joy bor.',
      'Maktab eshigini ochdi: bolalar harflarni aytayotgani eshitiladi.',
      'Bozor shovqinlaydi: pirog, rezavor, kulgi va halol almashuv.',
      'Quduq birinchi suvni berdi — sovuq, jarangdor.',
    ],
    new_resident: [
      'Sayyoraga yaltiragan chang qoʻndi — va aholiga aylandi! Ismi {name}.',
      'Yangi aholi kamalak koʻprigidan tushdi. Birkada — {name}.',
      'Soycha qirgʻogʻidagi tuman ichidan {name} chiqdi. «Mana shu yerda yashayman», — dedi.',
      'Uyadagi joʻja yangi aholiga ism olib keldi: {name}.',
      'Shamol ruhi tugʻildi — qishloq {name} ni kutib oladi!',
      'Urugʻ kurtak, kurtak — inson berdi: bizda yangi aholi bor, {name}.',
    ],
  };

  // ---------------- ENGLISH ----------------
  const en = {
    ui: {
      day: 'Day', morning: 'Morning', afternoon: 'Day', evening: 'Evening', night: 'Night',
      harmony: 'Harmony', skyEnergy: 'Sky Energy', chronicle: 'Chronicle', residents: 'Residents',
      pause: 'Pause', play: 'Play', resume: 'Resume', settings: 'Settings', shelf: 'Shelf',
      achievements: 'Achievements', close: 'Close', ok: 'OK', cancel: 'Cancel', yes: 'Yes',
      speed: 'Speed', speed1: '×1', speed2: '×2',
      menuTitle: 'World in a Jar', menuSub: 'A tiny living planet inside a glass jar. Shape the weather, give gentle advice — and watch their stories unfold.',
      menuAch: 'Achievements', menuLang: 'Language',
      adviceTitle: 'Advice for today', adviceGiven: 'Advice already given today',
      followed: 'took your advice', ignored: 'went their own way',
      settingsTitle: 'Settings', sLang: 'Language', sQuality: 'Quality', sSound: 'Sound', sMusic: 'Music', sVibro: 'Vibration',
      sTextSize: 'Text size', sReduce: 'Reduce motion', sReset: 'Reset progress', sResetWarn: 'Really erase all planets, achievements and star dust? This cannot be undone.',
      sTutorial: 'Replay tutorial', qAuto: 'Auto', qHigh: 'High', qMed: 'Medium', qLow: 'Low', on: 'On', off: 'Off',
      tNormal: 'Normal', tLarge: 'Large', tSmall: 'Small',
      letterTitle: 'Letter of the day', letterSig: '— your tiny friends',
      chronAll: 'All', chronAdvice: 'My advice', chronBonds: 'Bonds', chronNature: 'Nature',
      chronEmpty: 'Nothing has happened yet. The story is only beginning…',
      shelfTitle: 'Jar shelf', newJar: 'New jar', jarLocked: 'Unlocks in a chapter', pop: 'res.', day: 'd.',
      achTitle: 'Achievements', achLocked: 'locked',
      energyLow: 'Not enough Sky Energy', weatherSet: 'Weather: {w}', rainbowNeed: 'Rainbows come after rain and sun',
      tapResident: 'Tap a resident', newDay: 'Day {n}',
      stars: 'Star dust', dailyGift: 'Daily gift: +{n} ✦',
      tutorial1: 'This is your world in a jar. Spin it with your finger to see the planet from all sides.',
      tutorial2: 'Pinch to zoom in and out. Pretty, right?',
      tutorial3: 'Tap any resident — the camera flies closer and their card opens.',
      tutorial4: 'Choose one piece of advice per day. They may listen… or not.',
      tutorial5: 'Below is the weather wheel. Weather spends Sky Energy, which refills on its own.',
      tutorial6: 'The Chronicle button keeps every event. Check it in the evening!',
      tutNext: 'Next', tutSkip: 'Skip',
      errToast: 'Something went wrong, but the game is saved',
      noWebgl: 'Could not start the graphics', noWebglHint: 'Your browser does not seem to support WebGL. Please update it or enable hardware acceleration.',
      seed: 'Seed', debug: 'debug', newPlanet: 'New planet created', chapterDone: 'Chapter complete',
      stories: 'Open stories', storyOpen: 'Story unlocked: {s}',
      quit: 'To menu', reallyMenu: 'Return to menu? The world will be saved.',
      mood: { great: 'Delighted', good: 'Happy', ok: 'Fine', low: 'Sad', bad: 'Awful' },
      age: { child: 'child', adult: 'adult', elder: 'elder' },
      relations: { friend: 'friend', best: 'best friend', pair: 'couple', family: 'family', rival: 'rival', known: 'acquaintance' },
    },
    weather: { clear: 'Clear', sun: 'Sun', rain: 'Rain', wind: 'Wind', snow: 'Snow', fog: 'Fog', storm: 'Storm', rainbow: 'Rainbow' },
    needs: { food: 'Food', rest: 'Rest', safety: 'Ease', social: 'Social', meaning: 'Meaning' },
    traits: { brave: 'brave', social: 'outgoing', hard: 'hardworking', trusting: 'trusting', curious: 'curious' },
    chapter: {
      1: 'First Lights', 2: 'Village', 3: 'Festival', 4: 'Friendly World', 5: 'Town in a Jar', 6: 'Wisdom',
      d1: 'Light the first campfire', d2: 'Grow the village: 8 residents, 5 homes, a field', d3: 'Hold the first festival',
      d4: 'Harmony 70+ for three days', d5: 'School, market and lighthouse', d6: 'Unlock 12 stories',
    },
    advice: {
      go_home: 'Go home', talk: 'Talk to a neighbour', risk: 'Take a risk', wait: 'Wait', build: 'Build a home',
      plant: 'Plant a tree', forgive: 'Forgive', confess: 'Confess', rest: 'Rest', passion: 'Do what you love',
      trust: 'Trust', leave: 'Set out on a journey', save: 'Save up supplies', share: 'Share', learn: 'Learn something new',
      slow: 'Slow down', help: 'Help someone', fish: 'Go fishing', dance: 'Dance', look_sky: 'Look at the sky',
      make_peace: 'Make peace', be_brave: 'Be braver', be_careful: 'Be careful', celebrate: 'Throw a celebration',
    },
    ach: {
      first_fire: 'First Fire', first_home: 'First Home', first_wedding: 'First Wedding', first_birth: 'First Birth',
      rainbow_seen: 'Rainbow', no_quarrel_5: 'Five Days Without Quarrels', wise_advice: 'Wise Advice', ignored_advice: 'Stubborn Head',
      storm_survived: 'Storm Weathered', harvest_10: 'Farmer', pop_12: 'A Dozen', pop_24: 'Full Jar',
      elder_first: 'Wisdom of Years', stars_3: 'Three Star Tales', love_story: 'Secret Love', reconciliation: 'Reconciliation',
      festival_held: 'Festival Maker', lighthouse: 'First Lighthouse', school_built: 'Learning is Light',
      full_shelf: 'Full Shelf', chronicle_50: 'Chronicler', discovery_shell: 'Seashell', discovery_star: 'Fallen Star',
      three_plants: 'Gardener', day_30: 'A Month in the Jar',
    },
    story: {
      secret_love: 'Secret Love', wise_elder: 'The Wise Elder', first_lighthouse: 'The First Lighthouse',
      neighbors_peace: 'Neighbours at Peace', child_stars: 'The Child and the Stars', great_harvest: 'The Great Harvest',
      fisherman_luck: 'The Fisherman\u2019s Luck', storm_hero: 'Storm Hero', rainbow_wish: 'A Wish Under the Rainbow',
      festival_founder: 'Father of Festivals', shy_singer: 'The Quiet Song', seed_keeper: 'Keeper of Seeds',
      night_watcher: 'The Night Watcher', well_digger: 'The Well Digger', cloud_dreamer: 'Cloud Dreamer',
      two_brothers: 'Two Brothers', lost_hat: 'The Lost Hat', warm_winter: 'A Warm Winter',
      moon_walkers: 'Moon Walkers', tiny_garden: 'The Tiny Garden',
    },
    letter: {
      header: 'Hi! Here is what happened to us today…',
      noAdvice: 'No advice was given today, so we simply lived. It went well!',
      openers: ['Dear friend beyond the glass,', 'Greetings from all of us,', 'We feel your attention,'],
    },
    days: { one: '{n} day', few: '{n} days', many: '{n} days' },
  };
  en.ev = {
    harvest: [
      '{name} gathered a rich harvest {place}. The whole village feasted in the evening.',
      'The harvest was splendid: {name} brought baskets of fruit {place}.',
      'The fields rustled with wheat — {name} says it is the best harvest in the jar\u2019s history.',
      'Neighbours helped {name} bring in the harvest before the rains. They sang as they worked.',
      '{name} shared the harvest with everyone, even those who did not work the field.',
      'Grain gleams like gold on the threshing floor. {name} has smiled all day.',
    ],
    drought: [
      'Drought: the brook by the village grew shallow, {name} carries water from the well drop by drop.',
      'The grass turned yellow. {name} shields the sprouts from the scorching sun.',
      'A dry wind. {name} prays for rain, looking at the great sky beyond the glass.',
      'Cracks spread {place}. {name} guards the last of the water.',
      'Heat. Even the dragonflies hid. {name} waters the garden from a cup.',
      'The pond shrank to a thread. {name} counts the drops left in the well.',
    ],
    flood: [
      'Rain filled the brook to bursting! {name} rescued supplies, carrying them uphill.',
      'Water rose to the very doorsteps. {name} and the neighbours built a sand embankment.',
      'A tiny flood {place}: {name} laughed, bailing water out with a boot.',
      'The river burst its banks. {name} ferried neighbours across on a little raft.',
      'After the flood {name} found a glistening shell on the shore.',
      'The water withdrew, leaving silt on the fields. {name} says the land is richer now.',
    ],
    storm: [
      'A storm! Lightning flashed {place}. {name} sat by the window counting seconds to the thunder.',
      'The wind bent the trees. {name} tied the roof down with ropes.',
      'Thunder woke the whole village. {name} lit a splinter and told a tale until the storm passed.',
      'Lightning struck an old tree {place} — {name} kindled a campfire from the spark.',
      'After the storm the air is crystal clear. {name} was first out to see the rainbow.',
      'The storm tore the little boat\u2019s sail. {name} mended it and hung it to dry.',
    ],
    festival: [
      'A festival! {name} baked pies, children ran with pennants, garlands glowed until night.',
      'An evening festival {place}: songs, dances around the fire and warm words.',
      '{name} threw a festival just because — «because life is good».',
      'At the festival {name} and {other} danced together and everyone clapped.',
      'Firefly garlands, tables under the open sky — {name} was pleased.',
      'The day ended with a dandelion firework. The idea belonged to {name}.',
    ],
    wedding: [
      '{name} and {other} got married! Wreaths, music and the happy faces of the whole village.',
      'A wedding {place}: {name} gave a touching speech, {other} cried with joy.',
      'Two fates became one: {name} and {other} exchanged rings of copper wire.',
      'The wedding feast was a triumph. {name} baked a three-tiered loaf.',
      'After the wedding {name} and {other} moved into a new cottage by the brook.',
      'Even the clouds seemed to smile upon the wedding of {name} and {other}.',
    ],
    birth: [
      'A child was born to {name}! All day the village crowded at the door.',
      'Tiny fingers, a button nose: {name} has a baby.',
      'A new resident! {name} rocks the cradle and sings a lullaby.',
      'A spoon clinked on a cup — there is a new baby with {name}. The village rejoices!',
      '{name}\u2019s baby first saw the sky beyond the glass and reached a hand toward the light.',
      'The cradle is woven of grass. {name} cannot stop looking at the little one.',
    ],
    discovery: [
      '{name} found a wonderful shell on the shore, shimmering with every colour.',
      '{name} spotted a falling star at night and made a wish.',
      'On the hill {name} dug up a glittering pebble — now it is the village talisman.',
      '{name} discovered a new path to the brook, overgrown with flowers.',
      'Curious, {name} counted every tree and drew the first map.',
      'A firefly fell asleep on {name}\u2019s palm, and was gently carried back to the grass.',
    ],
    quarrel: [
      '{name} and {other} squabbled over a trifle and did not speak for three hours.',
      'A quarrel {place}: {name} slammed the door, {other} went to the brook to think.',
      'Pride kept {name} from apologising first. {other} stays silent too.',
      '{name} and {other} could not share the harvest bucket. It came to something silly.',
      'Harsh words were said by {name}, and now the heart feels like stone.',
      'The smoke of the quarrel hung all day. {name} and {other} went their separate ways.',
    ],
    reconciliation: [
      '{name} was the first to reach out — and {other} forgave. The quarrel is forgotten.',
      'Peace! {name} and {other} drank tea and laughed about yesterday.',
      '{name} baked a peace pie for {other}. Pride melts faster than frost.',
      'Friendship stronger than before: {name} and {other} planted a reconciliation tree.',
      'By the fire {name} said a kind word — {other} nodded, and all was well.',
      'After the quarrel {name} and {other} understand each other better.',
    ],
    move: [
      '{name} moved into a new home! First thing, a flower was set on the windowsill.',
      'A new roof, sturdy walls: {name} held a housewarming.',
      '{name} carted the belongings over, and all day smelled of shavings and celebration.',
      '{name}\u2019s house is now the cosiest place, the neighbours say.',
      'Smoke from the new chimney of {name}\u2019s house — a sure sign: someone lives here now.',
      '{name} hangs a swing by the porch. The house turned out wonderfully.',
    ],
    gift: [
      '{name} gave {other} a bouquet of wild flowers, just because.',
      'A gift {place}: {name} made {other} a little box from a walnut shell.',
      '{other} cried with happiness — {name} gave the ripest pear.',
      'In the morning {other} found a basket of berries from {name} by the door.',
      '{name} carved a wooden crane and gave it to {other}.',
      'Even a small gift from {name} comes with a big heart.',
    ],
    miracle: [
      'A RAINBOW! The whole village came out of their houses. {name} whispered a wish — they say it comes true.',
      'After rain and sun a rainbow rose {place}. Children leapt beneath it.',
      'A miracle in the jar: a double rainbow! {name} saw it first and shouted with joy.',
      'The rainbow hung over the planet for a whole hour. {name} sketched it on birch bark.',
      'The wet roofs, grass and even {name}\u2019s cat wore the rainbow\u2019s colours.',
      '{name} said the rainbow is the sky smiling at us. Nobody argued.',
    ],
    aging: [
      '{name} has grown unhurried in thought with the years, like a river. Wisdom has come.',
      'Silver glints in {name}\u2019s hair under the sun. The young listen to their stories.',
      '{name} celebrated an anniversary: feasting the neighbours, telling tales till night.',
      '{name}\u2019s old age is light: a daily walk by the brook and a bowl of porridge for the grandchildren.',
      '{name} now reads aloud in the evenings, and the whole street gathers to listen.',
      '{name}\u2019s legs are not what they were, but the eyes see farther than anyone\u2019s.',
    ],
    departure: [
      '{name} quietly went to the stars. A little light rose above the planet and glimmers in the night.',
      'Everlasting memory: {name} lived honestly and warmly. The village lit lanterns in their honour.',
      '{name} became light. The neighbours promised to care for their beloved tree.',
      'A new little star rose above the planet — {name} waving to us from the sky.',
      '{name}\u2019s children receive their legacy: their character and a kind memory.',
      'A soft light rose {place} — {name} set out on one last beautiful journey.',
    ],
    advice_ok: [
      '{name} took your advice «{a}» — and everything turned out wonderfully.',
      'The advice «{a}» helped: {name} waves a grateful hand at you.',
      '{name} followed the advice «{a}». Their trust in you grows.',
      'Your sticker «{a}» hit the mark: {name} is pleased with the result.',
      '{name} did as you advised («{a}»), and the day went well.',
      '«{a}» — what wise advice! said {name}, and was right.',
    ],
    advice_ignored: [
      '{name} went their own way, ignoring the advice «{a}».',
      '«Maybe next time!» said {name}, leaving your sticker «{a}» unnoticed.',
      '{name} did not even glance at your sticker «{a}». Stubbornness!',
      'The advice «{a}» stayed in the wind: {name} was busy with their own plans.',
      '{name} doubted the advice «{a}» — and decided to risk it their own way.',
      'Your «{a}» was not needed: {name} chose their own road.',
    ],
    built: [
      'A campfire blazed — there is one more hearth of warmth in the jar.',
      'A new house rose by the brook: walls, a roof, warm light in the window.',
      'The lighthouse lit its fire above the sea. The ships now have somewhere to sail.',
      'The school opened its doors: you can hear children chanting their letters.',
      'The market hums: pies, berries, laughter and honest trade.',
      'The well gave its first water — cold and ringing.',
    ],
    new_resident: [
      'A glowing speck flew to the planet — and became a resident! Their name is {name}.',
      'A new resident stepped off the rainbow bridge. The tag reads {name}.',
      'Out of the mist by the brook appeared {name}. «I shall live here,» they said.',
      'A chick from the nest brought the name of a new resident: {name}.',
      'A soul of the wind was born — the village welcomes {name}!',
      'A seed gave a sprout, and the sprout gave a person: we have a new resident, {name}.',
    ],
  };

  const dicts = { ru, uz, en };
  let lang = 'ru';
  const missing = {};

  function resolve(dict, key) {
    const parts = key.split('.');
    let cur = dict;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      const p = parts[i];
      if (Array.isArray(cur)) {
        const idx = parseInt(p, 10);
        cur = isFinite(idx) ? cur[idx] : undefined;
      } else if (typeof cur === 'object') {
        cur = cur[p];
      } else { return undefined; }
    }
    return cur;
  }
  function fill(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return (params[k] !== undefined && params[k] !== null) ? String(params[k]) : m;
    });
  }
  function t(key, params) {
    let val = resolve(dicts[lang], key);
    if (val === undefined) val = resolve(en, key);
    if (val === undefined) {
      if (WJ.Errors) WJ.Errors.debugWarn('i18n missing: ' + key);
      return key;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const g = params && params.gender;
      val = (g === 'f' && val.f) ? val.f : (val.m || val.f);
      if (val === undefined) return key;
    }
    if (Array.isArray(val)) val = val[0];
    return fill(val, params || {});
  }
  // Случайный выбор шаблона: ключ семейства + rng
  function tRand(familyKey, rng, params) {
    const arr = resolve(dicts[lang], familyKey) || resolve(en, familyKey);
    if (!arr || !arr.length) return familyKey;
    let v = arr[Math.floor(rng.next() * arr.length) % arr.length];
    if (v && typeof v === 'object') {
      const g = params && params.gender;
      v = (g === 'f' && v.f) ? v.f : (v.m || v.f);
    }
    return fill(v, params || {});
  }
  function plural(key, n) {
    n = Math.abs(Math.floor(n));
    const d = dicts[lang].days;
    let form;
    if (lang === 'ru') {
      const m10 = n % 10, m100 = n % 100;
      form = (m10 === 1 && m100 !== 11) ? 'one' : ((m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'few' : 'many');
    } else form = (n === 1) ? 'one' : 'many';
    return fill(d[form] || d.many, { n });
  }
  function setLang(code) {
    code = String(code || '').toLowerCase().slice(0, 2);
    if (code === 'be' || code === 'kk' || code === 'uk') code = 'ru';
    lang = dicts[code] ? code : 'en';
    return lang;
  }
  return { t, tRand, plural, setLang, get lang() { return lang; }, dicts, _missing: missing };
})();
