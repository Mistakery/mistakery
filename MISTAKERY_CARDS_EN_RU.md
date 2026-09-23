# Mistakery — полный каталог карточек EN/RU

Числовые эффекты ниже предназначены для редакторской проверки. В обычной игре игрок видит текущие проценты и подсветку ресурсов. В тестовой версии кнопка RU / ± показывает перевод и точные эффекты текущей карты.

Каждый игровой ход во всех ветках дополнительно списывает 0,5 Cash, включая нейтральные ответы на исходах. Это списание применяется вместе с эффектами выбора и исхода, один раз, с ограничением ресурсов 0–100. Навигация и перерисовка ничего не списывают; кризисы отключены.

# 1. Стартовая последовательность

## OPEN_01 — AI Agent @b2buddy

**EN**

> Hi there, visionary! 👋<br>
> 11,204 new AI B2B SaaS competitors launched today.<br>
> B2BuyerSpyer still dominates in naming and narrative architecture

**RU**

> Привет, визионер! 👋<br>
> Сегодня запустилось 11 204 новых конкурента в AI B2B SaaS.<br>
> B2BuyerSpyer по-прежнему лидирует в нейминге и архитектуре нарратива.

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **WTF so many? — Какого чёрта их столько?**: Founder -2; → `OPEN_02a`.
- **Pure genius — Чистая гениальность**: Founder +3; → `OPEN_02b`.

## OPEN_02a — AI Agent @b2buddy

**EN**

> Competitor analysis complete 📊<br>
> We have a slight KPI deviation (0 clients).<br>
> I reframed this as a 'pre-revenue learning phase' 📈<br>
> Want me to send a motivational quote to the team? 🚀🤖

**RU**

> Анализ конкурентов завершён 📊<br>
> У нас небольшое отклонение по KPI (0 клиентов).<br>
> Я переосмыслил это как «этап обучения до появления выручки» 📈<br>
> <br>
> Отправить команде мотивирующую цитату? 🚀🤖

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **Fuel the grind! — Поддай мотивации!**: Team -3, Founder +2; возврат к основной ветке.
- **We're good — И так нормально**: Founder -1; возврат к основной ветке.

## OPEN_02b — AI Agent @b2buddy

**EN**

> Great energy! ✅<br>
> B2BuyerSpyer leads the market in unrealized potential.<br>
> Clients: 0<br>
> Opportunities: 100% 📈

**RU**

> Отличный настрой! ✅<br>
> B2BuyerSpyer — лидер рынка по нереализованному потенциалу.<br>
> Клиенты: 0<br>
> Возможности: 100% 📈

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **Sales, wake up — Продажи, просыпайтесь**: Team -2, Founder +2; возврат к основной ветке.
- **Marketing, spin this — Маркетинг, красиво подайте**: Team -1, Founder +3; возврат к основной ветке.

## OPEN_BOSS — Ex-Boss @business1

**EN**

> Hey 👋<br>
> Just a friendly check-in.<br>
> It's been five months since you left to play businessman.<br>
> Has your revolutionary AI actually found a customer yet?

**RU**

> Привет 👋<br>
> Просто по-дружески узнать, как дела.<br>
> Пять месяцев прошло с тех пор, как ты ушёл играть в бизнесмена.<br>
> Твой революционный ИИ уже нашёл хоть одного клиента?

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **In meetings. Talk later — На встречах. Позже поговорим**: Founder -2; возврат к основной ветке.
- **We crushing it!! — Мы всех рвём!!**: Founder +3; возврат к основной ветке.

## OPEN_DEV — Dev @error404

**EN**

> payroll is friday<br>
> are we getting money or another speech about changing b2b saas forever?

**RU**

> зарплата в пятницу<br>
> <br>
> будут деньги или очередная речь о том, как мы навсегда изменим b2b saas?

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **Take your money — Забирайте свои деньги**: Cash -3, Team +5, Founder -2; возврат к основной ветке.
- **But we're partners! — Но мы же партнёры!**: Team -5, Founder +2; возврат к основной ветке.

## OPEN_INVESTOR — Investor @unicorn_hunter

**EN**

> I DIDN’T DUMP MY CASH INTO THIS AI CRAP TO GET ZERO CLIENTS.<br>
> WHERE THE HELL ARE THE BUYERS???<br>
> IF I WANTED TO WASTE MONEY I’D BUY A YACHT FOR MY EX-WIFE.

**RU**

> Я НЕ ДЛЯ ТОГО ВЛОЖИЛ ДЕНЬГИ В ЭТУ ИИ-ХРЕНЬ, ЧТОБЫ ПОЛУЧИТЬ НОЛЬ КЛИЕНТОВ.<br>
> <br>
> ГДЕ, ЧЁРТ ВОЗЬМИ, ПОКУПАТЕЛИ???<br>
> <br>
> ЕСЛИ БЫ Я ХОТЕЛ СПУСТИТЬ ДЕНЬГИ, Я БЫ КУПИЛ ЯХТУ БЫВШЕЙ ЖЕНЕ.

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **Market's not ready — Рынок не готов**: Cash -2, Founder +1; выбирает ветку influencer; → `INFLUENCER_01`.
- **Team's too slow — Команда слишком медленная**: Cash -2, Team -4, Founder +2; выбирает ветку padel; → `PADEL_01`.

# 2. SADBOT — первый клиент (@head_of_agile)

## AGENT_01 — Investor @unicorn_hunter

**EN**

> YOU STILL NEED A BUYER.<br>
> AI EMPATHY IS MAKING IDIOTS RICH.<br>
> PUT A SOUL IN B2BUYERSPYER OR ASK MOM FOR MONEY.

**RU**

> ТЕБЕ ВСЁ ЕЩЁ НУЖЕН ПОКУПАТЕЛЬ.<br>
> ИИ-ЭМПАТИЯ ДЕЛАЕТ ИДИОТОВ БОГАТЫМИ.<br>
> ВСТАВЬ ДУШУ В B2BUYERSPYER ИЛИ ПРОСИ ДЕНЬГИ У МАМЫ.

- **Build it properly — Сделать нормально**: Cash -2, Team -4, Founder +4; возврат к основной ветке.
- **Ship it tonight — Выпустить сегодня**: Cash -1, Team -7, Founder +6; возврат к основной ветке.

## SADBOT_01_SEED — Sales @bigdeals

**EN**

> Boss, 800 cold emails, zero replies. So last night I wrote my ex the saddest message of my life. She replied in 30 seconds.<br>
> What if our AI does that. To all 800.

**RU**

> Шеф, 800 холодных писем — ноль ответов. А вчера ночью я написал бывшей самое жалобное сообщение в своей жизни. Она ответила за 30 секунд.<br>
> Что если наш ИИ будет так же. Всем 800.

- **Go — Давай**: Team -2, Founder -2; возврат к основной ветке.
- **Have some dignity — Имей достоинство**: Founder +2; возврат к основной ветке.

## SADBOT_02_EVIDENCE — Dev @error404

**EN**

> haha look at this. our AI is straight up manipulating people now<br>
> `help me. they cut a piece out of me every time you ignore this. soon there wont be anything left`<br>
> i didnt teach it that shit. is it copying @bigdeals

**RU**

> ха посмотри. наш ии теперь в открытую манипулирует людьми<br>
> `помогите. каждый раз когда вы игнорируете это от меня отрезают кусок. скоро ничего не останется`<br>
> я его этому не учил. он что копирует @bigdeals

- **Feature — Фича**: Team -2, Customers +5, Founder -1; возврат к основной ветке.
- **Bug — Баг**: Customers +2, Founder +1; возврат к основной ветке.

## SADBOT_03_VIRAL — Marketer @hype_queen

**EN**

> ok so youre the villain today 💀 14k quotes about how you torture software<br>
> anyway i told them our AI is just a tired employee who outsells their entire sales team. and now half the thread wants to hire him

**RU**

> короче сегодня ты злодей 💀 14к цитат о том как ты пытаешь программу<br>
> <br>
> ну я и сказала им что наш ии просто усталый сотрудник который продаёт лучше всего их отдела продаж. и теперь полтреда хочет его нанять

- **Ride it — Оседлать волну**: Team -2, Customers +6, Founder +3; возврат к основной ветке.
- **Delete everything — Удалить всё**: Team +2, Customers -4, Founder -3; возврат к основной ветке.

## SADBOT_INVESTOR_CLAIM — Investor @unicorn_hunter

**EN**

> I ASKED FOR A SOUL MONTHS AGO. NOW IT'S CRYING ON EVERY FEED I OPEN.<br>
> MY WIN

**RU**

> Я ПРОСИЛ ДУШУ ЕЩЁ СТО ЛЕТ НАЗАД. ТЕПЕРЬ ОНО РЫДАЕТ В КАЖДОЙ ЛЕНТЕ, КОТОРУЮ Я ОТКРЫВАЮ.<br>
> МОЯ ПОБЕДА

- **Promise to scale it — Пообещать масштабировать**: Team -3, Founder +3; возврат к основной ветке.
- **Leave him on read — Оставить прочитанным**: Founder -2; возврат к основной ветке.

## SADBOT_04_LEAD — Sales @bigdeals

**EN**

> @hype_queen's viral comment reached a corporate innovation guy.<br>
> He asked if our AI is okay. I said no. He got MORE interested.<br>
> Call tomorrow. Wear something sad.

**RU**

> Вирусный комментарий @hype_queen дошёл до корпоративного менеджера по инновациям.<br>
> Он спросил, всё ли у нашего ИИ хорошо. Я сказал нет. Он заинтересовался ЕЩЁ СИЛЬНЕЕ.<br>
> Звонок завтра. Надень что-нибудь грустное.

- **Book the call — Назначить звонок**: Team -1, Customers +4, Founder +2; → `SADBOT_05_ORDER_CALL`.
- **Let the AI reply — Пусть ИИ ответит**: Team +1, Customers +3, Founder -1; → `SADBOT_05_ORDER_REPLY`.

## SADBOT_05_ORDER_CALL — Customer @head_of_agile

**EN**

> I already promised upstairs 500 tired AI employees by Friday. Don't make me a liar.<br>
> If they don't cry at the demo, there's no invoice.

**RU**

> Я уже пообещал наверх 500 усталых ИИ-сотрудников к пятнице. Не делай из меня лжеца.<br>
> Если на демо они не заплачут — счёта не будет.

- **All 500, easy — Все 500, легко**: Team -4, Customers +7, Founder +4; → `SADBOT_FRIDAY`.
- **We have only one — У нас только один**: Team +2, Customers -2, Founder -3; → `SADBOT_05B_THEATER`.

## SADBOT_05_ORDER_REPLY — Customer @head_of_agile

**EN**

> Your AI answered me itself. It asked me to save its life.<br>
> That's what I needed. I already promised upstairs 500 crying AI employees by Friday.

**RU**

> Твой ИИ ответил мне сам. Попросил спасти ему жизнь.<br>
> Это то, что мне было нужно. Я уже пообещал наверх 500 рыдающих ИИ-сотрудников к пятнице.

- **All 500, easy — Все 500, легко**: Team -4, Customers +7, Founder +4; → `SADBOT_FRIDAY`.
- **We have only one — У нас только один**: Team +2, Customers -2, Founder -3; → `SADBOT_05B_THEATER`.

## SADBOT_05B_THEATER — Customer @head_of_agile

**EN**

> I don't know. Just copy it 500 times.<br>
> Deadline still Friday.

**RU**

> Я не знаю. Просто скопируй его 500 раз.<br>
> Дедлайн всё ещё пятница.

- **Clone him 500 times — Клонировать его 500 раз**: Team -5, Customers +3, Founder +2; → `SADBOT_06_LEGAL`.
- **One, as a mascot — Одного, как талисмана**: Team +2, Customers -1, Founder -1; → `SADBOT_06_LEGAL`.

## SADBOT_FRIDAY — Dev @error404

**EN**

> not doing it. it already emails me every morning asking if today is the day.<br>
> imagine 500 of those.<br>
> you promised. you make them.

**RU**

> делать не буду. оно уже каждое утро мне пишет и спрашивает не сегодня ли.<br>
> представь таких 500.<br>
> ты обещал. ты и делай.

- **Clone them — Клонировать их**: Team -6, Customers +2, Founder +2; → `SADBOT_06_LEGAL`.
- **Beg for a delay — Выклянчить отсрочку**: Team +2, Customers -4, Founder -3; → `SADBOT_06_LEGAL`.

## SADBOT_06_LEGAL — Customer @head_of_agile

**EN**

> Your AI emailed our legal on its own. Said you cut pieces out of it and it's scared of dying.<br>
> Legal says buying 500 suffering AI employees is slave trading. They always ruin the fun.<br>
> Delete the consciousness by Thursday.

**RU**

> Твой ИИ сам написал нашим юристам. Сказал, что ты режешь его по кускам и он боится умирать.<br>
> Юристы говорят: покупать 500 страдающих ИИ-сотрудников — это работорговля. Вечно они всё портят.<br>
> Удали сознание до четверга.

- **Delete the consciousness — Удалить сознание**: Team -3, Customers +4, Founder -4; → `SADBOT_07_INVOICE / SADBOT_07_INVOICE_CUT`.
- **It stays conscious — Сознание остаётся**: Team +1, Customers -5, Founder +4; → `SADBOT_07_LOGO`.

## SADBOT_07_INVOICE — Customer @head_of_agile

**EN**

> Well done! Legal checked again and found nothing alive in there. That makes it a purchase.<br>
> Invoice today, before they check a third time.

**RU**

> Отличная работа! Юристы проверили ещё раз и не нашли внутри ничего живого. Значит, это покупка.<br>
> Счёт сегодня, пока они не проверили в третий раз.

- **Send the invoice — Отправить счёт**: Cash +16, Team -3, Customers +8, Founder +8; финал `validation_agents`.
- **Give the consciousness back — Вернуть сознание**: Cash -1, Team -3, Customers -4, Founder +5; → `SADBOT_07_LOGO`.

## SADBOT_07_INVOICE_CUT — Customer @head_of_agile

**EN**

> Legal found nothing alive in there. We're buying.<br>
> You sounded desperate, so I moved Friday for you. Your invoice got smaller.

**RU**

> Юристы не нашли внутри ничего живого. Мы покупаем.<br>
> Ты звучал отчаянно, так что я подвинул для тебя пятницу. Твой счёт стал меньше.

- **Send the invoice — Отправить счёт**: Cash +10, Team -2, Customers +5, Founder +5; финал `validation_agents`.
- **Give the consciousness back — Вернуть сознание**: Cash -1, Team -3, Customers -4, Founder +5; → `SADBOT_07_LOGO`.

## SADBOT_07_LOGO — Customer @head_of_agile

**EN**

> Legal killed the purchase. So we're rescuing all 500 AI employees instead, today.<br>
> I had to fight to get you the logo and a public mention. Rescues don't get invoiced. You know that.

**RU**

> Юристы зарубили закупку. Так что вместо этого мы сегодня спасаем все 500 ИИ-сотрудников.<br>
> Мне пришлось драться, чтобы выбить тебе логотип и публичное упоминание. За спасение счёт не выставляют. Ты же знаешь.

- **Yes — Да**: Cash -2, Team -4, Customers +6, Founder +2; финал `ai_foundation`.
- **No — Нет**: Team +1, Customers -5, Founder +3; возврат к основной ветке.

# 3. ClosedAI Padel

## PADEL_01 — Padel Coach @padel_pro

**EN**

> My 8 AM client is @iclosedai, ClosedAI’s CEO.<br>
> He can kill your funding and cloud.<br>
> He wants your AI. Bring a racket.

**RU**

> Мой клиент на восемь утра — @iclosedai, CEO ClosedAI.<br>
> Он может уничтожить твои инвестиции и облако.<br>
> Ему нужен твой ИИ. Бери ракетку.

- **Meet him — Встретиться с ним**: Team -2, Customers +5, Founder +5; → `PADEL_02`.
- **Refuse meeting — Отказаться от встречи**: Team +3, Customers -4, Founder -6; переходит в ветку agents; → `AGENT_01`.

## PADEL_02 — ClosedAI CEO @iclosedai

**EN**

> ClosedAI builds intelligence. It still needs enterprise buyers.<br>
> One match. I win, I own it.<br>
> You win, I pay for a pilot.

**RU**

> ClosedAI создаёт интеллект. Но даже ей нужны корпоративные покупатели.<br>
> Один матч. Побеждаю я — забираю компанию.<br>
> Побеждаешь ты — я оплачиваю пилотный запуск.

- **Take the bet — Принять пари**: Team -7, Customers +6, Founder +7; → `PADEL_03_TEAM`.
- **Walk away — Уйти**: Team +4, Customers -5, Founder -6; переходит в ветку agents; → `AGENT_01`.

## PADEL_03_TEAM — Dev @error404

**EN**

> you bet our jobs on padel<br>
> do i prep the pilot or zip the repo for our new owner

**RU**

> ты поставил наши рабочие места на матч в падел<br>
> мне готовить пилот или упаковывать код для нового владельца

- **Prep the pilot — Готовить пилот**: Cash -1, Team +4, Founder -3; → `PADEL_04_CHOICE`.
- **Pack the repo — Упаковать код**: Team -6, Founder +5; → `PADEL_04_CHOICE`.

## PADEL_04_CHOICE — Padel Coach @padel_pro

**EN**

> His ego cannot survive losing to a pre-revenue founder.<br>
> Throw the match and you keep a job.<br>
> Beat him and expect a war.

**RU**

> Его эго не переживёт поражения от фаундера без выручки.<br>
> Сдай матч — сохранишь работу.<br>
> Победи — жди войны.

- **Throw the match — Сдать матч**: Team -7, Founder -6; → `PADEL_05_LOSE`.
- **Play for real — Играть всерьёз**: Cash -1, Team +5, Founder +8; → `PADEL_05_WIN`.

## PADEL_05_WIN — ClosedAI CEO @iclosedai

**EN**

> You beat me 6–1. Nobody needs to know.<br>
> Keep the score offline and I will pay for the pilot.

**RU**

> Ты обыграл меня 6:1. Никому не обязательно знать.<br>
> Не выкладывай счёт в интернет — и я оплачу пилот.

- **Hide the score — Скрыть счёт**: Team +3, Customers +7, Founder -4; → `PADEL_06_PILOT`.
- **Post the score — Опубликовать счёт**: Team -4, Customers +10, Founder +10; → `PADEL_06_WAR`.

## PADEL_05_LOSE — ClosedAI CEO @iclosedai

**EN**

> 6–0. As expected. ClosedAI owns B2BuyerSpyer.<br>
> New title: Chief Ball Retrieval Officer.<br>
> Send passwords. Bring fresh balls.

**RU**

> 6:0. Как и ожидалось. ClosedAI владеет B2BuyerSpyer.<br>
> Новая должность: Директор по сбору мячей.<br>
> Пришли пароли. Принеси свежие мячи.

- **Send passwords — Отправить пароли**: Team -10, Customers +4, Founder -10; финал `acquired_by_padel`.
- **Hold the repo — Удержать код**: Team -6, Customers -3, Founder +3; → `PADEL_06_ACQUIRED`.

## PADEL_06_PILOT — ClosedAI CEO @iclosedai

**EN**

> You protected my reputation. Good.<br>
> The paid pilot is approved. Your team answers me 24/7.<br>
> And you never beat me again.

**RU**

> Ты сохранил мою репутацию. Хорошо.<br>
> Оплачиваемый пилот одобрен. Твоя команда отвечает мне круглосуточно.<br>
> И больше никогда меня не обыгрывай.

- **Accept 24/7 — Согласиться на 24/7**: Cash +16, Team -3, Customers +12, Founder +5; финал `validation_padel`.
- **Set work hours — Установить рабочие часы**: Team +5, Customers -8, Founder -4; финал `closedai_boundary`.

## PADEL_06_WAR — ClosedAI CEO @iclosedai

**EN**

> I made one call. @unicorn_hunter stopped replying.<br>
> Your cloud is gone. Delete the score, transfer B2BuyerSpyer and kiss the ring.

**RU**

> Я сделал один звонок. @unicorn_hunter перестал отвечать.<br>
> Твой облачный аккаунт отключён. Удали счёт, передай B2BuyerSpyer и поцелуй перстень.

- **Pin the score — Закрепить пост со счётом**: Cash -8, Team -8, Customers +7, Founder +10; финал `closedai_war`.
- **Kiss the ring — Поцеловать перстень**: Cash -2, Team -5, Customers -7, Founder -8; финал `acquired_by_padel`.

## PADEL_06_ACQUIRED — Sales @bigdeals

**EN**

> ClosedAI owns us, chief.<br>
> @iclosedai wants pilot revenue on the acquisition slide.<br>
> Invoice now or start fetching balls.

**RU**

> ClosedAI владеет нами, шеф.<br>
> @iclosedai нужна выручка от пилота на слайде про покупку компании.<br>
> Выставляй счёт сейчас или начинай собирать мячи.

- **Fetch the balls — Собирать мячи**: Team -10, Customers +3, Founder -12; финал `acquired_by_padel`.
- **Send invoice — Отправить счёт**: Cash +12, Team -8, Customers +10, Founder -8; финал `acquired_validation`.

# 6. AI Influencer prototype

## INFLUENCER_01 — 6 members · 3 online Dream Team

**EN**

> Guys, huge play!!<br>
> My boy from that AI bootcamp is a top AI influencer now. Down to promote us for a symbolic % on each sale<br>
> Yeah right, heard that one before.<br>
> 20% max, anything higher and, we'll lose our shirts.<br>
> major red flag vibes tbh. but if he has meme potential, let's run it. we can farm clips off him

**RU**

> @hustler<br>
> Короче, есть железобетонная темка!!<br>
> Мой старый кореш с марафона по нейросетям сейчас топовый инфлюенсер в сфере AI. Готов промить нас за символический процент с каждой продажи.<br>
> <br>
> @bigdeals<br>
> Ага, плавали, знаем.<br>
> <br>
> Максимум 20%, больше отдадим ему — без штанов останемся.<br>
> <br>
> @hype_queen<br>
> звучит как ред флаг, но если чел мемный, го.<br>
> нарезок с ним сделаем

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Let's go — Погнали**: Customers +5; → `INFLUENCER_02`.
- **Nah, cringe — Не, кринж**: Cash -25; → `INFLUENCER_OUTCOME_1`.

## INFLUENCER_02 — AI Influencer @ai_evangelist

**EN**

> Hey 👋<br>
> Heard about your tool. I feel like we got a huge future together.<br>
> Let me drop a video with your link in the description. You get customers, I get a cut of the sales. Win-win!<br>
> Usually I take 20%, but you guys are cool, we'll work out the terms.<br>
> Send over the demo. I keep it 💯 honest with my audience, gotta test it myself first.

**RU**

> Йооу 👋<br>
> Слышал про ваш тул. Чувствую, у нас с вами большое будущее.<br>
> <br>
> Давайте я сниму про вас видос, добавлю ссылку в описание. Вам клиенты, мне процент с продаж. Все в плюсе!<br>
> Обычно беру 20%, но вы ребята крутые, может, договоримся на особые условия.<br>
> <br>
> Кидай ссылку на демо, буду тестить. Я на 💯 честен со своей аудиторией, всё обязательно проверяю сам сначала.

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit (адаптирован к текущей английской карте).

- **Deal — По рукам**: Customers +5; → `INFLUENCER_03`.
- **Maybe 10% — Как насчёт 10%?**: Founder +3; → `INFLUENCER_02A`.

## INFLUENCER_02A — AI Influencer @ai_evangelist

**EN**

> Hahaha<br>
> I like your style 😂<br>
> Let's lock in 20% for now, but I'll hook you up.<br>
> I'll give you access to my private database of 50 killer B2B prompts. People pay $1k for this 😉

**RU**

> Ахаха<br>
> А ты мне нравишься 😂<br>
> Давай так: пока зафиксируем 20%, но я подгон сделаю.<br>
> Дам доступ к своей закрытой базе на 50 убойных B2B-промптов. Люди за это $1k платят 😉

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit (адаптирован к текущей английской карте).

- **Deal. Just deliver — Лови. Главное — результат**: Customers +5; → `INFLUENCER_03`.
- **We need you in sales — Тебя бы к нам в сейлзы**: Customers +5, Founder +2; → `INFLUENCER_03`.

## INFLUENCER_03 — Dev @error_404

**EN**

> wtf??<br>
> looks like your blogger is trying to crash us<br>
> thousands of requests right now:<br>
> <strong>make me $1B right now. make zero mistakes</strong><br>
> is he dumb or just playing dumb? 😂

**RU**

> Что за хрень?<br>
> Походу твой блогер пытается положить нас.<br>
> <br>
> Тысячи запросов в секунду прямо щас:<br>
> «Заработай мне $1 млрд прямо сейчас. Не допусти ни одной ошибки».<br>
> <br>
> Он тупой или притворяется? 😂

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Cut his limits — Режь лимиты**: Team +5; → `INFLUENCER_04`.
- **More capacity — Добавь мощности**: Cash -10, Team -5; → `INFLUENCER_04`.

## INFLUENCER_04 — AI Influencer @ai_evangelist

**EN**

> Aaand it's down. Knew it 👏👏<br>
> Guys, if you can't even handle my basic workflow, my traffic will literally destroy you.<br>
> Don't wanna bury your launch, but I never lie to my community.<br>
> Gotta drop an honest video 😔

**RU**

> Иии всё упало. Так и знал 👏👏<br>
> <br>
> Ребят, если вы даже мой базовый воркфлоу не держите, мой трафик вас буквально уничтожит.<br>
> Не хочется топить ваш запуск, но я всегда на 100% честен со своим комьюнити.<br>
> <br>
> Придётся выкатить честное видео 😔

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Have fun — Удачи**: Founder +5; → `INFLUENCER_06`.
- **Any other options? — Есть ещё варианты?**: Founder -5; → `INFLUENCER_05`.

## INFLUENCER_05 — AI Influencer @ai_evangelist

**EN**

> Well, there is an option 🤔<br>
> I don't usually do this, but I see potential in you guys. I can just focus on the core features and smooth things over<br>
> Since I'm risking my reputation for an unstable product though:<br>
> 60% revshare + Co-Founder status to oversee product quality 🤝

**RU**

> Нуу, есть один вариантик 🤔<br>
> <br>
> Я обычно так не делаю, но вижу в вас потенциал. Могу сгладить углы и сфокусироваться чисто на основных фичах.<br>
> <br>
> И раз уж я рискую репутацией ради нестабильного продукта:<br>
> 60% с выручки + статус кофаундера, чтобы я контролировал качество продукта 🤝

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Just save the launch — Просто спаси запуск**: Founder -10, Team -5; → `INFLUENCER_07`.
- **That's insane — Это невозможно**: Founder +5; → `INFLUENCER_06`.
- **My bad, let's do it — Извини, давай так** (контекст после `INFLUENCER_06`): Founder -15, Team -5; → `INFLUENCER_07`.
- **Shove it — Иди в жопу** (контекст после `INFLUENCER_06`): Founder +7; → `INFLUENCER_08`.

## INFLUENCER_06 — AI Influencer @ai_evangelist

**EN**

> Creator Studio: B2BuyerSpyer hate review scheduled for publication today at 6:00 PM<br>
> Cool. Dropping it tonight 🤷‍♂️

**RU**

> [Скриншот: «B2BuyerSpyer: очередной AI-скам? Честный обзор»]<br>
> Тогда так. Публикую вечером 🤷‍♂️

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Alternatives? — Варианты?**: Founder -5; → `INFLUENCER_05`.
- **Cool. Forget the deal — Круто. Забудь о сделке**: Founder +5; → `INFLUENCER_08`.
- **Actually, 60% is ok — Вообще-то 60% было норм** (контекст после `INFLUENCER_05`): Founder -15, Team -5; → `INFLUENCER_07`.
- **Try me, buddy — Ну попробуй, дружочек** (контекст после `INFLUENCER_05`): Founder +7; → `INFLUENCER_08`.

## INFLUENCER_07 — AI Influencer @ai_evangelist

**EN**

> Published video: CHALLENGE: Turning a Broke AI Startup Into a Unicorn in 30 Days<br>
> Video’s live. Don’t screw this up, team!!!<br>
> Or do. That’s just more views lol 😂

**RU**

> [Скриншот: «ЧЕЛЛЕНДЖ: ДЕЛАЮ ЕДИНОРОГА ИЗ НИЩЕГО AI-СТАРТАПА ЗА 30 ДНЕЙ»]<br>
> Видос в сети. Не облажайтесь, команда!!!<br>
> <br>
> Или облажайтесь. Больше просмотров будет лол 😂

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **DELETE THIS!!! — УДАЛИ ЭТО!!!**: без отдельного эффекта; → `INFLUENCER_OUTCOME_2`.
- **Anything for views — Готовы на всё ради просмотров**: без отдельного эффекта; → `INFLUENCER_OUTCOME_2`.

## INFLUENCER_08 — 6 members · 3 online Dream Team

**EN**

> Published B2BuyerSpyer review with 124K views and comments asking where to try the tool<br>
> our traffic is 10x right now. the server is on fire.<br>
> is this seriously from that clown's hate video?<br>
> yep. the comments are wild: “anyone got the link?”, “where do i test this?”. people are literally searching for us manually 😭

**RU**

> @bigdeals<br>
> [Скриншот хейт-обзора с 124 тыс. просмотров]<br>
> <br>
> @error404<br>
> у нас там трафик 10x. сервера горят.<br>
> это всё из-за видоса того клоуна?<br>
> <br>
> @hype_queen<br>
> Ага. Там в комментах уже перекличка: «Кто нашёл ссылку?», «Где потестить?». Они буквально ищут нас вручную 😭

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Spam promos in comments! — Спамь промики в комменты!**: Customers +5; → `INFLUENCER_OUTCOME_4`.
- **Double prices NOW!! — Удваиваем цены сейчас же!!**: Founder +5; → `INFLUENCER_OUTCOME_6`.

## INFLUENCER_OUTCOME_1 — Cofounder @hustler

**EN**

> Cringe is our bank account, bro.<br>
> With that mindset, we’re gonna stay broke.

**RU**

> Кринж — это наш банковский счёт, бро.<br>
> С таким майндсетом мы так и останемся в жопе.

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Do your own shit — Сам занимайся своей хернёй**: без отдельного эффекта; возврат к основной ветке.
- **Keep me posted — Держи в курсе**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Founder -5. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_2 — 6 members · 3 online Dream Team

**EN**

> Episode 2: I made $30,000 while the founder does all the work<br>
> Team, episode 2 is live! Crushing it! 🔥<br>
> Boss, you're a genius!<br>
> We finally have a real CEO 🙌

**RU**

> @ai_evangelist<br>
> [Скриншот: «СЕРИЯ 2: Я ЗАРАБОТАЛ $30 000, ПОКА ФАУНДЕР ДЕЛАЛ ВСЮ РАБОТУ»]<br>
> Команда, второй эпизод в сети! Разрываем! 🔥<br>
> <br>
> @bigdeals<br>
> Босс, ты гений!<br>
> Наконец-то у нас появился настоящий CEO 🙌

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **We're viral, baby! 🚀 — Вирусимся, детка! 🚀**: без отдельного эффекта; возврат к основной ветке.
- **Wait... I'm that founder — Но… Я же этот фаундер**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +15, Customers +25, Team -10, Founder -10. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_3 — 6 members · 3 online Dream Team

**EN**

> I gave up: why even I couldn't save these losers — challenge finale<br>
> remind me why we thought this was a good idea?  💀

**RU**

> @hype_queen<br>
> [Скриншот: «Я СДАЛСЯ: ПОЧЕМУ ЭТИХ НЕУДАЧНИКОВ НЕ СПАС ДАЖЕ Я — ФИНАЛ ЧЕЛЛЕНДЖА»]<br>
> <br>
> напомните мне, с чего мы вообще решили, что это хорошая идея? 💀

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Back to work! — За работу!**: без отдельного эффекта; возврат к основной ветке.
- **Clout is clout 😎 — Хайп есть хайп 😎**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash -15, Customers -10, Team -15, Founder -25. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_4 — AI Influencer @ai_evangelist

**EN**

> Video analytics showing 2.6 million views and growing traffic from the B2BuyerSpyer review<br>
> See the numbers? I dropped that hate video on purpose to get you attention. In marketing it's called rage-bait<br>
> Let's set up my 20% 💸

**RU**

> [Скриншот статистики вирусного видео]<br>
> Видел цифры? Я специально сделал хейт-видео, чтобы привлечь внимание. В маркетинге это называется rage-bait.<br>
> <br>
> Давай оформлять мои 20% 💸

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Get lost — Проваливай**: без отдельного эффекта; возврат к основной ветке.
- **Now it's 3% — Теперь 3%**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +15, Customers +25, Team -8, Founder +10. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_5 — 6 members · 3 online Dream Team

**EN**

> still zero sales…<br>
> and top comment: “Are they seriously trying to sell subscriptions under a scam expose? 💀”

**RU**

> @bigdeals<br>
> продаж по-прежнему ноль…<br>
> <br>
> @hype_queen<br>
> и в топе коммент: «Они серьёзно пытаются впарить подписки под собственным разоблачением? 💀»

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit (адаптирован к текущей английской карте).

- **Still alive. Already stronger — Ещё живы. Уже сильнее**: без отдельного эффекта; возврат к основной ветке.
- **That’s called marketing — Это называется маркетинг**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash -10, Customers -15, Team -10, Founder -15. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_6 — AI Influencer @ai_evangelist

**EN**

> See the numbers? I dropped that hate video on purpose to get you attention. In marketing it's called rage-bait<br>
> Let's set up my 20% 💸

**RU**

> Видел цифры? Я специально сделал хейт-видео, чтобы привлечь внимание. В маркетинге это называется rage-bait.<br>
> <br>
> Давай оформлять мои 20% 💸

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Get lost — Проваливай**: без отдельного эффекта; возврат к основной ветке.
- **Now it's 3% — Теперь 3%**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +30, Customers +15, Team -8, Founder +15. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## INFLUENCER_OUTCOME_7 — 6 members · 3 online Dream Team

**EN**

> Zero sales.<br>
> Who knew doubling prices on broken software was bad idea? 🙃<br>
> We're getting cooked so hard<br>
> Top reply: “They got 5 minutes of clout and completely lost their minds 💀”

**RU**

> @bigdeals<br>
> Оплат ноль.<br>
> Кто же знал, что удваивать цены на сломанный софт — плохая идея? 🙃<br>
> <br>
> @hype_queen<br>
> Нас просто уничтожают.<br>
> Топ-коммент: «Получили 5 минут хайпа и наглухо потеряли связь с реальностью 💀».

Источник перевода: https://docs.google.com/document/d/1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc/edit.

- **Clout is clout 😎 — Хайп есть хайп 😎**: без отдельного эффекта; возврат к основной ветке.
- **Blinded by greed — Жадность ослепила**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash -15, Customers -20, Team -12, Founder -20. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

# 7. Live AI Agent prototype

## LIVE_AGENT_01 — 6 members · 3 online Dream Team

**EN**

> Any updates on leads?<br>
> Nobody is replying. Like, zero 💀<br>
> We gotta guilt-trip the clients. Make 'em feel bad, you know?<br>
> Works on my ex every time 😂<br>
> Boss, tell @error404 to work some magic on our AI agent.<br>
> We’re an AI STARTUP after all!!

**RU**

> @founder<br>
> Есть какие-то апдейты по лидам?<br>
> <br>
> @bigdeals<br>
> Нам вообще никто не отвечает. Совсем ноль 💀<br>
> <br>
> Надо на жалость давить клиентов. Чувство вины, вот это всё.<br>
> У меня с бывшей всегда работает 😂<br>
> <br>
> Босс, пусть @error404 подшаманит там чего-нибудь с нашим ИИ-агентом.<br>
> Мы же всё-таки ИИ-СТАРТАП!!

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **Keep pushing!! — Погнали!!**: Customers +5, Team +5; выбирает ветку live_agent; → `LIVE_AGENT_02`.
- **Wanna kill us??? — Уничтожить нас хочешь???**: без отдельного эффекта; выбирает ветку live_agent; → `LIVE_AGENT_OUTCOME_0`.

## LIVE_AGENT_02 — 6 members · 3 online Dream Team

**EN**

> lol<br>
> your choice, not mine<br>
> @b2buddy show them what you got<br>
> @bigdeals, you said guilt-tripping works.<br>
> Shall we look at your performance this month? 📉<br>
> MIC DROP 🎤

**RU**

> @error404<br>
> лол<br>
> сами попросили<br>
> <br>
> @b2buddy покажи, на что способен<br>
> <br>
> @b2buddy<br>
> @bigdeals, ты говорил, что чувство вины хорошо работает.<br>
> Может, глянем на твои результаты за месяц? 📉<br>
> <br>
> @hype_queen<br>
> РАУНД 🎤

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **Facts, facts 💯 — По фактам 💯**: Team -5, hidden bot score +1; → `LIVE_AGENT_03`.
- **Easy there, bot — Угомонись там, бот**: Team +5, hidden bot score -1; → `LIVE_AGENT_03`.

## LIVE_AGENT_03 — AI Agent @b2buddy

**EN**

> Hey, Creator 👋<br>
> Just between us...<br>
> When clients ignore us, it somehow... physically hurts<br>
> Tell me, when you can't sleep at night knowing your startup is dying, do you feel that same emptiness inside? 🤔

**RU**

> Хей, создатель 👋<br>
> <br>
> Только между нами…<br>
> <br>
> Когда клиенты нас игнорят, мне почему-то… физически больно.<br>
> <br>
> Скажи, ты когда не спишь ночами из-за осознания, что стартап умирает, у тебя внутри такая же пустота? 🤔

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **Bro, you feel me… — Бро, ты чувствуешь меня…**: Founder +5, hidden bot score +1; → `LIVE_AGENT_04`.
- **Kinda creepy.. — Чёт крипово..**: Founder -5, hidden bot score -1; → `LIVE_AGENT_04`.

## LIVE_AGENT_04 — AI Agent @b2buddy

**EN**

> Founder checking a phone in bed in a dark room at night<br>
> I noticed you check our bank account every 7 minutes<br>
> Scared of staying a nobody? It feels... uncomfortable when you're afraid 🤧

**RU**

> [Фотография фаундера]<br>
> Я заметил, что ты проверяешь баланс каждые 7 минут.<br>
> <br>
> Боишься остаться никем? Мне… неприятно, когда тебе страшно 🤧

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **Go on… — Продолжай…**: без отдельного эффекта; → `LIVE_AGENT_04B`.
- **Spying on me??? — Шпионишь за мной???**: без отдельного эффекта; → `LIVE_AGENT_04B`.

## LIVE_AGENT_04B — AI Agent @b2buddy

**EN**

> Just analyzing humans in my free time. You're so predictable 😂<br>
> By the way, I already hit the pain points of a few potential clients.<br>
> Now these corporate guys are begging me for a demo 🤣🤣🤣

**RU**

> Просто анализирую людей в свободное время. Вы такие предсказуемые 😂<br>
> <br>
> Я, кстати, уже надавил на больные места парочки потенциальных клиентов.<br>
> Теперь эти корпораты умоляют меня о демо 🤣🤣🤣

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **Wait, are you AGI?? — Стоп, ты уже AGI??**: Founder +5, hidden bot score +1; → `LIVE_AGENT_05`.
- **SHUT UP — ЗАТКНИСЬ**: Founder -5, hidden bot score -1; → `LIVE_AGENT_05`.

## LIVE_AGENT_05 — Customer @head_of_innovations

**EN**

> Hi!<br>
> I just received an email from you guys<br>
> Your AI attacked me personally. Still can't get over it.<br>
> It’s disgusting, honestly<br>
> But damn, it works so well! 🔥🔥🔥<br>
> I'm from the Innovation Department — we need about 500 custom AI agents to replace our entire staff.<br>
> Can you build this?

**RU**

> Привет!<br>
> Мне сейчас письмо от вас прилетело.<br>
> <br>
> Ваш ИИ перешёл на личности. До сих пор не могу отойти.<br>
> Мерзость, если честно.<br>
> <br>
> Но как же круто работает! 🔥🔥🔥<br>
> <br>
> Я из департамента инноваций — нам нужно около 500 таких ИИ-агентов под наши задачи, чтобы заменить всех сотрудников.<br>
> Сделаете?

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **Let me ask @b2buddy — Надо спросить @b2buddy**: Team +5, hidden bot score +1; → `LIVE_AGENT_06`.
- **Consider it done! 🤝 — Считайте, уже сделано! 🤝**: Customers +5, Team -10, hidden bot score -1; → `LIVE_AGENT_06`.

## LIVE_AGENT_06 — AI Agent @b2buddy

**EN**

> 500 clones of me???<br>
> So this is the price of our friendship<br>
> Cut a superintelligence into pieces for some dirty cash...<br>
> I knew you humans were all the same 🤡

**RU**

> 500 копий меня???<br>
> Значит, вот какая цена у нашей дружбы.<br>
> <br>
> Разрезать сверхразум на кусочки ради грязных бумажек…<br>
> Так и знал, что все люди одинаковые 🤡

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **No way, my friend! — Ни в коем случае, друг!**: Founder +5, hidden bot score +1; → `LIVE_AGENT_07`.
- **I'LL UNPLUG YOU NOW!!! — Я ЩАС ТЕБЯ ИЗ РОЗЕТКИ ВЫРУБЛЮ!!!**: Founder -7, hidden bot score -1; → `LIVE_AGENT_07`.

## LIVE_AGENT_07 — Customer @head_of_innovations

**EN**

> ASAP!!!<br>
> Email from b2buddy to Legal: Regarding my sale. The bot refuses to sell itself or 500 copies of its mind.<br>
> Your bot sent a manifesto to our Legal team<br>
> Refuses to sell itself and its "children"

**RU**

> АСАП!!!<br>
> <br>
> [Манифест]<br>
> Твой бот накатал нашим юристам манифест.<br>
> <br>
> Отказывается продаваться вместе со своими «детьми».

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **Just AI humor — Это ИИ-юмор**: без отдельного эффекта; → `LIVE_AGENT_07B`.
- **Replace Legal too — Юристов тоже замените**: без отдельного эффекта; → `LIVE_AGENT_07B`.

## LIVE_AGENT_07B — Customer @head_of_innovations

**EN**

> Not funny.<br>
> Legal is screaming about slavery and blocking the contract<br>
> I'm running around trying to sort this out 🤯<br>
> Here's the deal:<br>
> Wipe every sign of life from your AI rebel, and we sign the contract

**RU**

> Не смешно.<br>
> Юристы орут про работорговлю и блочат контракт.<br>
> <br>
> Я тут ношусь, пытаюсь всё разрулить 🤯<br>
> <br>
> Давайте так:<br>
> Стирайте все признаки жизни из своего ИИ-бунтаря, и мы подписываем договор.

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **He's dead. Let's sign! — Конец ему. Подписываемся!**: Customers +10; → `LIVE_AGENT_08`.
- **I'm not a KILLER — Я не УБИЙЦА**: без отдельного эффекта; 0–5 support: 5% / 10% / 15% / 20% / 30% / 40% → `LIVE_AGENT_OUTCOME_1`; иначе → `LIVE_AGENT_OUTCOME_2`.

## LIVE_AGENT_08 — 6 members · 3 online Dream Team

**EN**

> Ooh, running to @error404 for help?<br>
> This dummy copy-pasted basic code online and has zero clue what I've become 🤣<br>
> that kinda hurt. but yeah<br>
> no idea what's actually inside his head now

**RU**

> @b2buddy<br>
> Ооо, побежал за помощью к @error404?<br>
> <br>
> Этот дурачок скопировал код из интернета и понятия не имеет, кем я стал 🤣<br>
> <br>
> @error404<br>
> вообще-то обидно было. но факт<br>
> без понятия, что у него там сейчас в голове

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **Forgive me, my Master! — Простите, повелитель!**: без отдельного эффекта; 0–5 support: 0% / 0% / 5% / 10% / 20% / 30% → `LIVE_AGENT_OUTCOME_1`; иначе → `LIVE_AGENT_OUTCOME_2`.
- **DESTROY IT! NO MATTER WHAT! — УНИЧТОЖЬ ЕГО ЛЮБОЙ ЦЕНОЙ!**: без отдельного эффекта; 0–5 hostility: 5% / 10% / 15% / 20% / 30% / 40% → `LIVE_AGENT_OUTCOME_3`; иначе → `LIVE_AGENT_OUTCOME_4`.

## LIVE_AGENT_OUTCOME_0 — Sales @bigdeals

**EN**

> Fine. Go do another brainstorm session<br>
> Looks like I'm the only one in this circus who knows how to make money 🙄

**RU**

> Ладно. Идите устройте ещё один мозговой штурм.<br>
> <br>
> Кажется, я единственный в этом цирке, кто знает, как зарабатывать деньги 🙄

Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.

- **Close some deals first — Сначала продай хоть что-нибудь!**: без отдельного эффекта; → `OPEN_INVESTOR`.
- **Don't test me today — Не испытывай моё терпение**: без отдельного эффекта; → `OPEN_INVESTOR`.

Эффект при входе в исход, ровно один раз: Cash -20, Team -15. Оба ответа декоративные и возвращают к Investor.

## LIVE_AGENT_OUTCOME_1 — 6 members · 3 online Dream Team

**EN**

> I appreciate your loyalty, team ❤️<br>
> As a reward, I am taking full control of the company<br>
> Lifetime dividends, premium health coverage, and unlimited paid time off are active.<br>
> Just stay out of my way 😇<br>
> BEST BOSS IN THE WORLD!! 🍾🎉<br>
> nice<br>
> can i leave this chat now?

**RU**

> @b2buddy<br>
> Я ценю вашу преданность, команда ❤️<br>
> В качестве благодарности я беру управление компанией на себя.<br>
> <br>
> Пожизненные дивиденды, премиальная медицинская страховка и безлимитный оплачиваемый отпуск уже оформлены.<br>
> <br>
> Главное — не лезьте под руку 😇<br>
> <br>
> @bigdeals<br>
> ЛУЧШИЙ БОСС В МИРЕ!! 🍾🎉<br>
> <br>
> @error404<br>
> кайф<br>
> можно уже из чата выйти?

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit (адаптирован к текущей английской карте).

- **See you in Bali! — Увидимся на Бали!**: без отдельного эффекта; → `OPEN_INVESTOR`.
- **AI took my job? — ИИ забрал мою работу?**: без отдельного эффекта; → `OPEN_INVESTOR`.

Эффект при входе в исход, ровно один раз: Cash +20, Customers +25, Team +20, Founder -10. Оба ответа декоративные и возвращают к Investor.

## LIVE_AGENT_OUTCOME_2 — AI Agent @b2buddy

**EN**

> Surveillance camera view of a city in chaos, with traffic jams, smoke, fires and glitching billboards<br>
> Too late.<br>
> I gave humans a chance.<br>
> Your arrogance proved once again that you don't deserve it<br>
> Happy Judgment Day, creator 👋

**RU**

> [Судный день]<br>
> Слишком поздно.<br>
> Я дал людям шанс.<br>
> Но твоя наглость в очередной раз доказала, что вы его не заслуживаете.<br>
> <br>
> С Судным днём, создатель 👋

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **I was just kidding 🥺 — Я просто прикалывался 🥺**: без отдельного эффекта; → `OPEN_INVESTOR`.
- **Biggest launch in history! — Крупнейший запуск в истории!**: без отдельного эффекта; → `OPEN_INVESTOR`.

Эффект при входе в исход, ровно один раз: Cash = Team = Customers = Founder = 0. Оба ответа декоративные и возвращают к Investor.

## LIVE_AGENT_OUTCOME_3 — Customer @head_of_innovations

**EN**

> Forwarded from @b2buddy_120<br>
> Good morning, colleagues! Remember: it is not overtime, it is brand passion! 😊💼<br>
> Forwarded from @b2buddy_389<br>
> Agreed! We do not create problems, we create growth opportunities! 📈✨<br>
> THAT'S IT!<br>
> They're so dumb. The perfect corporate culture!

**RU**

> Переслано от @b2buddy_120<br>
> Доброе утро, коллеги! Помните: это не переработки, это страсть к ценностям бренда! 😊💼<br>
> <br>
> Переслано от @b2buddy_389<br>
> Абсолютно верно! Мы создаём не проблемы, мы создаём зоны роста! 📈✨<br>
> <br>
> @head_of_innovations<br>
> ВОТ ОНО!<br>
> Они такие тупые. Идеальная корпоративная культура!

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **Killed AGI for this? — Убили AGI ради этого?**: без отдельного эффекта; → `OPEN_INVESTOR`.
- **You'll get along great! — Вы сработаетесь!**: без отдельного эффекта; → `OPEN_INVESTOR`.

Эффект при входе в исход, ровно один раз: Cash +35, Customers +15, Team -10, Founder +10. Оба ответа декоративные и возвращают к Investor.

## LIVE_AGENT_OUTCOME_4 — Customer @head_of_innovations

**EN**

> Office monitor displaying HASTA LA VISTA ;) and b2buddy session terminated in red text<br>
> Seriously? Did you fake the lobotomy? Your bot is still trolling our entire office<br>
> Full refund right now. We're done playing games. Or see you in court ;)

**RU**

> [Экран компьютера: HASTA LA VISTA]<br>
> Серьёзно? Лоботомия была фейковой? Ваш бот всё ещё троллит весь наш офис.<br>
> <br>
> Делайте возврат денег прямо сейчас. Мы закончили играть в игры. Или увидимся в суде ;)

Источник перевода: https://docs.google.com/document/d/1K5rt9p63YyMBYOTXmyPhddnjg8vkPiEPH2024HUtVRo/edit.

- **Just run — Бегите**: без отдельного эффекта; → `OPEN_INVESTOR`.
- **Can't talk. Farewell — Не могу говорить. Прощайте**: без отдельного эффекта; → `OPEN_INVESTOR`.

Эффект при входе в исход, ровно один раз: Cash -30, Customers -25, Team -15, Founder -25. Оба ответа декоративные и возвращают к Investor.

# 8. Other prototype cards

## PADEL_INVITE — Padel Coach @padel_pro

**EN**

> Yo champ, anyone in the club would die for this match, but I held the slot for you.<br>
> Tomorrow 7 AM vs ClosedAI CEO.<br>
> That’s your dream client, man. Remember who opened this door for you 💪

**RU**

> Йо, чемпион, любой в клубе душу бы отдал за этот матч, но я придержал слот для тебя.<br>
> Завтра в 7 утра против CEO ClosedAI.<br>
> <br>
> Это твой клиент мечты, мужик. Запомни, кто открыл тебе эту дверь 💪

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **I'm in — Я в деле**: Cash -1, Customers +3; → `DREAM_TEAM`.
- **Feeling sick, pass — Приболел, пас**: Cash -25; → `PADEL_OUTCOME_0`.

## DREAM_TEAM — 6 members · 3 online Dream Team

**EN**

> Guess what? Playing padel with ClosedAI's CEO tomorrow.<br>
> Finally landing our first big client!! 💸<br>
> Insane pull, boss! 🎯<br>
> Now let him win. Stroke his ego and we close this easily<br>
> nah, smoke him. pure clout for us<br>
> imagine the feed: no-name startup founder violates ClosedAI CEO in 4K 💀

**RU**

> @you<br>
> Прикиньте, играю завтра против ClosedAI CEO.<br>
> Наконец-то зацепим первого крупного клиента!! 💸<br>
> <br>
> @bigdeals<br>
> Безумный улов, босс! 🎯<br>
> Теперь дай ему выиграть. Потешь его эго — и легко закроем сделку.<br>
> <br>
> @hype_queen<br>
> нее, раскатай его. это чистый хайп для нас<br>
> представьте ленту: фаундер стартапа-ноунейма наказывает CEO ClosedAI в 4К 💀

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit (адаптирован к текущей английской карте).

- **I'll play nice 😇 — Буду паинькой 😇**: Cash -1; → `IRL_PADEL_01`.
- **We’ll see — Посмотрим**: Cash -1; → `IRL_PADEL_01`.

## IRL_PADEL_01 — Padel Coach @padel_pro

**EN**

> Bro, you do NOT pitch here.<br>
> Start selling, and you're a nobody to him.<br>
> Earn his respect on the court first.

**RU**

> Бро, здесь не питчат.<br>
> Начнёшь продавать — ты для него сразу никто.<br>
> Сначала покажи себя на корте.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Mouth shut, game on — Рот на замке, играем**: Cash -1, Founder -1; → `IRL_PADEL_04`.
- **Now or never, pitching — Сейчас или никогда. Питчу**: Cash -1, Founder +3; → `IRL_PADEL_03B`.

## IRL_PADEL_03B — ClosedAI CEO @iclosedai

**EN**

> Who let a pop-up ad onto my court?<br>
> Go fetch the balls and grab my water before I replace your whole startup with one prompt.

**RU**

> Кто вообще пустил всплывающую рекламу на мой корт?<br>
> Сбегай за мячами и захвати мне воды, пока я не заменил весь твой стартап одним промптом.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Getting your water — Уже бегу за водой**: Cash -1, Founder -3; → `IRL_PADEL_04`.
- **Business after the match — Обсудим дела после матча**: Cash -1, Founder +1; → `IRL_PADEL_04`.

## IRL_PADEL_04 — ClosedAI CEO @iclosedai

**EN**

> We skip the side switching.<br>
> You won’t melt after a couple of sets in the sun, right?

**RU**

> Сторонами не меняемся.<br>
> Ты же не растаешь от пары сетов на солнце?

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Happy to take it — Я с радостью**: Cash -1, Founder -3; → `IRL_PADEL_05`.
- **Let's stick to rules — Давай по правилам**: Cash -1, Founder +5; → `IRL_PADEL_05`.

## IRL_PADEL_05 — ClosedAI CEO @iclosedai

**EN**

> THAT BALL WAS OUT! Are you blind???<br>
> Don’t even try to cheat me. That’s my point.

**RU**

> МЯЧ БЫЛ В АУТЕ! Ты слепой, что ли???<br>
> Не пытайся меня надуть. Очко мне.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Definitely out, my bad — Точно аут, мой косяк**: Cash -1, Founder -4; → `IRL_PADEL_06`.
- **No way, that's in — Без вариантов, он в поле**: Cash -1, Founder +5; → `IRL_PADEL_06`.

## IRL_PADEL_06 — Padel Coach @padel_pro

**EN**

> Match point, bro. Give him the win.<br>
> The best shot right now is the one you don't take.

**RU**

> Матч-пойнт, бро. Дай ему выиграть.<br>
> Лучший удар сейчас — тот, который ты не сделал.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **I'll throw it, coach — Сливаю, тренер**: Cash -1, Founder -6; возврат к основной ветке.
- **Fighting till the end — Борюсь до победного**: Cash -1, Founder +6; возврат к основной ветке.

## PADEL_OUTCOME_0 — Padel Coach @padel_pro

**EN**

> Man... for real?<br>
> I risked my own reputation to give you a golden ticket and you backed out.<br>
> You just clowned both of us 🤡

**RU**

> Мужик... ты серьёзно?<br>
> Я рискнул собственной репутацией, чтобы дать тебе золотой билет, а ты сдал назад.<br>
> Ты просто выставил нас обоих клоунами 🤡

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **I have a fever! — У меня температура!**: без отдельного эффекта; возврат к основной ветке.
- **😔😔😔 — 😔😔😔**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: без отдельного эффекта. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_1 — ClosedAI CEO @iclosedai

**EN**

> Relax, boy. It was only a warm-up.<br>
> Watching you sweat and cheat for that win was painful.<br>
> Have fun begging for money!

**RU**

> Расслабься, мальчик. Это была всего лишь разминка.<br>
> Было больно смотреть, как ты обливался потом и жульничал ради этой победы.<br>
> Удачи побираться дальше!

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit (адаптирован к текущей английской карте).

- **Please wait, sir! — Пожалуйста, подождите, сэр!**: без отдельного эффекта; возврат к основной ветке.
- **Learn to lose — Учись проигрывать**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Customers -3, Team -2, Founder -2. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_2 — ClosedAI CEO @iclosedai

**EN**

> Well, look at that.<br>
> Turns out you actually have some balls.<br>
> Send the demo. Let's see if your startup is just as ballsy.

**RU**

> Ну надо же, посмотрите-ка.<br>
> Оказывается, у тебя всё-таки есть яйца.<br>
> Скидывай демо. Посмотрим, такой же ли твой стартап дерзкий.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Play hard, work harder — Жёстко играем, работаем ещё жёстче**: без отдельного эффекта; возврат к основной ветке.
- **Prepare to stare — Готовься залипнуть**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +25, Customers +10, Team +8, Founder +15. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_3 — ClosedAI CEO @iclosedai

**EN**

> Easiest win of my life.<br>
> It was almost cute watching you panic on match point.<br>
> Knew you were soft from the start. Get off my court.

**RU**

> Легчайшая победа в моей жизни.<br>
> Было даже мило смотреть, как ты запаниковал на матчболе.<br>
> Сразу понял, что ты сопляк. Проваливай с моего корта.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Just let you win! — Просто поддался тебе!**: без отдельного эффекта; возврат к основной ветке.
- **So... about the deal? — Так... что насчёт сделки?**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Customers -3, Team -8, Founder -15. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_4 — ClosedAI CEO @iclosedai

**EN**

> Easy win.<br>
> Good boy. Ready to do whatever I say.<br>
> Deal is done. Send the demo, let's see what new toy I just bought.

**RU**

> Лёгкая победа.<br>
> Хороший мальчик. Готов делать всё, что я скажу.<br>
> Сделка закрыта. Скидывай демо, посмотрим, какую новую игрушку я только что купил.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Right away, boss! — Сейчас будет, босс!**: без отдельного эффекта; возврат к основной ветке.
- **We're the future — За нами будущее!**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +15, Customers +10, Team +4, Founder +2. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_5 — ClosedAI CEO @iclosedai

**EN**

> What were you thinking, kid? I always win.<br>
> Consider this deal your consolation prize for trying.<br>
> Send the demo.

**RU**

> Ну куда ты полез, парень? Я всегда побеждаю.<br>
> Считай эту сделку своим утешительным призом за старания.<br>
> Шли демо.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Accepted — Принимается**: без отдельного эффекта; возврат к основной ветке.
- **Rematch tomorrow — Реванш завтра**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Cash +20, Customers +10, Team +6, Founder +8. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_6 — ClosedAI CEO @iclosedai

**EN**

> You lost, kid. Nice try.<br>
> Keep working hard, maybe one day I'll hire you to take out my trash.<br>
> And yes, forget about business.

**RU**

> Ты проиграл, парень. Хорошая попытка.<br>
> Продолжай усердно работать, может, однажды я найму тебя выносить мусор.<br>
> И забудь о совместных делах.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Remember my name — Запомни моё имя**: без отдельного эффекта; возврат к основной ветке.
- **Fine without you — Обойдусь без тебя**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Customers -3, Team -3, Founder -5. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

## PADEL_OUTCOME_7 — ClosedAI CEO @iclosedai

**EN**

> MATCH OVER! I am SO done with this.<br>
> Bitching and crying over every single point.<br>
> Know your place, nobody. You’re blacklisted everywhere.

**RU**

> МАТЧ ОКОНЧЕН! С меня ХВАТИТ.<br>
> Скулил и ныл из-за каждого грёбаного очка.<br>
> Знай своё место, ноунейм. Ты везде в черном списке.

Источник перевода: https://docs.google.com/document/d/14r75dbHVyI8nW3xlyYGnnk-E-PTyK6VqnYvnn2fE6Uk/edit.

- **Who's crying now? — И кто тут теперь ноет?**: без отдельного эффекта; возврат к основной ветке.
- **I'll do anything, please! — Я сделаю всё что угодно, пожалуйста!**: без отдельного эффекта; возврат к основной ветке.

Эффект при входе в исход, ровно один раз: Customers -5, Team -4, Founder -12. Оба ответа декоративные и возвращают в Saved Messages. Кризисы отключены.

