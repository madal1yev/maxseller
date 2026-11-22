import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react'

export type Language = 'uz' | 'ru' | 'en'
export type Theme = 'dark' | 'light'
type Vars = Record<string, string | number>

const LANGUAGE_KEY = 'maxseller-lang'
const THEME_KEY = 'maxseller-theme'

// [key, uzbek, russian, english]
const entries = [
  // Common
  ['common.catalog', 'Katalog', 'Каталог', 'Catalog'],
  ['common.login', 'Kirish', 'Войти', 'Sign in'],
  ['common.register', "Ro'yxatdan o'tish", 'Регистрация', 'Sign up'],
  ['common.logout', 'Chiqish', 'Выйти', 'Sign out'],
  ['common.refresh', 'Yangilash', 'Обновить', 'Refresh'],
  ['common.retry', 'Qayta urinish', 'Повторить', 'Retry'],
  ['common.error', 'Xatolik', 'Ошибка', 'Error'],
  ['common.loading', 'Yuklanmoqda...', 'Загрузка...', 'Loading...'],
  ['common.save', 'Saqlash', 'Сохранить', 'Save'],
  ['common.confirm', 'Tasdiqlash', 'Подтвердить', 'Confirm'],
  ['common.open', 'Ochish', 'Открыть', 'Open'],
  ['common.download', 'Yuklash', 'Скачать', 'Download'],
  ['common.backToCatalog', 'Katalogga qaytish', 'Назад в каталог', 'Back to catalog'],
  ['common.all', 'Hammasi', 'Все', 'All'],
  ['common.name', 'Ism', 'Имя', 'Name'],
  ['common.email', 'Email', 'Email', 'Email'],
  ['common.phone', 'Telefon', 'Телефон', 'Phone'],
  ['common.total', 'Jami', 'Итого', 'Total'],
  ['common.status', 'Holat', 'Статус', 'Status'],
  ['common.payment', "To'lov", 'Оплата', 'Payment'],
  ['common.date', 'Sana', 'Дата', 'Date'],
  ['common.type', 'Turi', 'Тип', 'Type'],
  ['common.amount', 'Summa', 'Сумма', 'Amount'],
  ['common.order', 'Buyurtma', 'Заказ', 'Order'],
  ['common.orders', 'Buyurtmalar', 'Заказы', 'Orders'],
  ['common.products', 'Mahsulotlar', 'Товары', 'Products'],
  ['common.product', 'Mahsulot', 'Товар', 'Product'],
  ['common.custom', 'Individual loyiha', 'Индивидуальный проект', 'Custom project'],
  ['common.readyProduct', 'Tayyor mahsulot', 'Готовый товар', 'Ready product'],
  ['common.paymentMethod', "To'lov usuli", 'Способ оплаты', 'Payment method'],
  ['common.verified', 'Tasdiqlangan', 'Подтверждён', 'Verified'],
  ['common.unverified', 'Tasdiqlanmagan', 'Не подтверждён', 'Not verified'],
  ['common.cabinet', 'Kabinet', 'Кабинет', 'Cabinet'],
  ['common.details', 'Batafsil', 'Подробнее', 'Details'],
  ['common.search', 'Qidirish', 'Поиск', 'Search'],
  ['common.pcs', 'dona', 'шт.', 'pcs'],
  ['common.currency', "so'm", 'сум', 'UZS'],

  // Navigation
  ['nav.home', 'MaxSeller bosh sahifa', 'Главная MaxSeller', 'MaxSeller home'],
  ['nav.menu', 'Asosiy menyu', 'Основное меню', 'Main menu'],
  ['nav.advantages', 'Afzalliklar', 'Преимущества', 'Advantages'],
  ['nav.how', 'Qanday sotib olinadi', 'Как купить', 'How to buy'],
  ['nav.faq', 'Savollar', 'Вопросы', 'FAQ'],
  ['nav.websites', 'Veb-saytlar', 'Веб-сайты', 'Websites'],
  ['nav.cart', 'Savat, {count} mahsulot', 'Корзина, товаров: {count}', 'Cart, {count} items'],
  ['nav.cartTitle', 'Savat', 'Корзина', 'Cart'],
  ['nav.logout', 'Chiqish', 'Выйти', 'Sign out'],
  ['nav.channel', 'Kanal', 'Канал', 'Channel'],
  ['nav.theme', 'Rejimni almashtirish', 'Сменить тему', 'Toggle theme'],
  ['nav.language', 'Tilni tanlash', 'Выбор языка', 'Select language'],
  ['nav.burger', 'Menyuni ochish', 'Открыть меню', 'Open menu'],

  // Hero
  ['hero.chip', 'Digital Products Store', 'Магазин цифровых товаров', 'Digital Products Store'],
  ['hero.title', 'Raqamli mahsulotlar', 'Цифровые товары', 'Digital products'],
  ['hero.accent', 'bir joyda!', 'в одном месте!', 'in one place!'],
  ['hero.lead', "Veb-saytlar, dizayn shablonlar, ilmiy ishlar va video darsliklar.", 'Сайты, дизайн-шаблоны, научные работы и видеоуроки.', 'Websites, design templates, academic papers and video courses.'],
  ['hero.viewCatalog', "Katalogni ko'rish", 'Смотреть каталог', 'Browse catalog'],
  ['hero.telegram', 'Telegram kanal', 'Telegram-канал', 'Telegram channel'],
  ['hero.quality', 'Sifat · Qulaylik · Zamonaviylik', 'Качество · Удобство · Современность', 'Quality · Convenience · Modernity'],
  ['hero.paid', "To'langan", 'Оплачен', 'Paid'],
  ['hero.demoProduct', 'Biznes landing page', 'Бизнес-лендинг', 'Business landing page'],
  ['hero.demoMeta', "Raqamli mahsulot · 150 000 so'm", 'Цифровой товар · 150 000 сум', 'Digital product · 150,000 UZS'],
  ['hero.fileReady', 'Fayl kabinetda tayyor', 'Файл готов в кабинете', 'File ready in your cabinet'],
  ['hero.available', '· 24/7 mavjud', '· доступно 24/7', '· available 24/7'],
  ['hero.always', 'har doim siz uchun', 'всегда для вас', 'always for you'],
  ['hero.fast', 'Tezkor', 'Быстро', 'Fast'],
  ['hero.fastText', 'sotuv', 'продажа', 'sales'],

  // Categories, order and payment labels
  ['category.web', 'Veb-saytlar va Landing Page', 'Сайты и лендинги', 'Websites & landing pages'],
  ['category.design', 'Dizayn shablonlar', 'Дизайн-шаблоны', 'Design templates'],
  ['category.docs', 'Ilmiy ishlar va materiallar', 'Научные работы и материалы', 'Academic papers & materials'],
  ['category.video', 'Video darsliklar', 'Видеоуроки', 'Video courses'],
  ['status.NEW', 'Yangi', 'Новый', 'New'],
  ['status.PENDING_CONFIRMATION', 'Tasdiq kutilmoqda', 'Ожидает подтверждения', 'Awaiting confirmation'],
  ['status.AWAITING_PAYMENT', "To'lov kutilmoqda", 'Ожидает оплаты', 'Awaiting payment'],
  ['status.PAYMENT_PROCESSING', "To'lov tekshirilmoqda", 'Проверка оплаты', 'Payment processing'],
  ['status.PAID', "To'langan", 'Оплачен', 'Paid'],
  ['status.IN_PROGRESS', 'Ish jarayonida', 'В работе', 'In progress'],
  ['status.READY_FOR_DELIVERY', 'Topshirishga tayyor', 'Готов к выдаче', 'Ready for delivery'],
  ['status.DELIVERED', 'Topshirildi', 'Выдан', 'Delivered'],
  ['status.COMPLETED', 'Bajarildi', 'Завершён', 'Completed'],
  ['status.CANCELLED', 'Bekor qilindi', 'Отменён', 'Cancelled'],
  ['status.REFUNDED', 'Pullar qaytarildi', 'Возврат средств', 'Refunded'],
  ['payment.UNPAID', "To'lanmagan", 'Не оплачен', 'Unpaid'],
  ['payment.REVIEW', 'Tekshiruvda', 'На проверке', 'In review'],
  ['payment.PAID', "To'langan", 'Оплачен', 'Paid'],
  ['payment.FAILED', 'Rad etilgan', 'Отклонён', 'Failed'],
  ['payment.REFUNDED', 'Qaytarilgan', 'Возвращён', 'Refunded'],

  // Landing sections
  ['features.title', 'Nega MaxSeller', 'Почему MaxSeller', 'Why MaxSeller'],
  ['features.fast.title', 'Tezkor sotuv', 'Быстрая продажа', 'Fast delivery'],
  ['features.fast.text', "To'lov tasdiqlangach fayl kabinetingizda paydo bo'ladi. Kutish yo'q.", 'После подтверждения оплаты файл появится в кабинете. Без ожидания.', 'Once payment is confirmed, the file appears in your cabinet. No waiting.'],
  ['features.support.title', '24/7 xizmat', 'Поддержка 24/7', '24/7 support'],
  ['features.support.text', 'Savollarga kechayu kunduz javob beramiz.', 'Отвечаем на вопросы круглосуточно.', 'We answer questions around the clock.'],
  ['features.quality.title', 'Sifat nazorati', 'Контроль качества', 'Quality control'],
  ['features.quality.text', 'Har bir mahsulot sotuvga qo\'yilishdan oldin tekshiriladi.', 'Каждый товар проверяется перед продажей.', 'Every product is checked before it goes on sale.'],
  ['features.easy.title', 'Qulaylik', 'Удобство', 'Convenience'],
  ['features.easy.text', "Hammasi bir joyda: tanlash, buyurtma, to'lov va fayl olish.", 'Всё в одном месте: выбор, заказ, оплата и получение файла.', 'Everything in one place: browse, order, pay and download.'],
  ['steps.title', 'Qanday sotib olinadi', 'Как купить', 'How to buy'],
  ['steps.hint', '4 qadam — bir ko‘rishda tushunarli', '4 шага — понятно с первого взгляда', '4 steps — clear at a glance'],
  ['steps.1.title', 'Mahsulotni tanlang', 'Выберите товар', 'Choose a product'],
  ['steps.1.text', 'Katalogdan kerakli faylni toping yoki individual buyurtma bering.', 'Найдите нужный файл в каталоге или оформите индивидуальный заказ.', 'Find the file you need in the catalog or place a custom order.'],
  ['steps.2.title', 'Buyurtmani tasdiqlang', 'Подтвердите заказ', 'Confirm your order'],
  ['steps.2.text', "Akkauntga kiring va aloqa ma'lumotlarini tasdiqlang — buyurtma bazaga yoziladi.", 'Войдите в аккаунт и подтвердите контактные данные — заказ сохраняется в базе.', 'Sign in and confirm your contact details — the order is saved in the database.'],
  ['steps.3.title', "To'lov chekini yuklang", 'Загрузите чек оплаты', 'Upload the payment receipt'],
  ['steps.3.text', "To'lov qilib, chek rasmini yuboring. Admin tasdiqlaydi.", 'Оплатите и отправьте фото чека. Администратор подтвердит оплату.', 'Pay and send a receipt photo. The admin will confirm it.'],
  ['steps.4.title', 'Faylni oling', 'Получите файл', 'Get your file'],
  ['steps.4.text', "To'lov tasdiqlangach mahsulotni kabinetdan yuklab oling.", 'После подтверждения оплаты скачайте товар из кабинета.', 'After payment confirmation, download the product from your cabinet.'],
  ['faq.title', "Ko'p so'raladigan savollar", 'Частые вопросы', 'Frequently asked questions'],
  ['faq.q1', 'Fayl qaysi formatda beriladi?', 'В каком формате передаётся файл?', 'What format is the file delivered in?'],
  ['faq.a1', 'Veb-saytlar va shablonlar ZIP, Figma yoki Canva havolasi ko\'rinishida, ilmiy materiallar Word va PDF, darslar esa video fayl yoki yopiq kanal havolasi sifatida beriladi.', 'Сайты и шаблоны передаются в ZIP, ссылками Figma или Canva, научные материалы — в Word/PDF, а уроки — видеофайлом или ссылкой на закрытый канал.', 'Websites and templates come as ZIP, Figma or Canva links; academic materials as Word/PDF; courses as video files or a private channel link.'],
  ['faq.q2', 'To\'lovni qanday qilaman?', 'Как оплатить?', 'How do I pay?'],
  ['faq.a2', "Buyurtma yaratgach to'lov usulini tanlaysiz. To'lov qilib, chek rasmini buyurtma sahifasiga yuklaysiz — admin faqat backendda tasdiqlaydi.", 'После создания заказа вы выбираете способ оплаты, оплачиваете и загружаете фото чека на страницу заказа — администратор подтверждает его только в backend.', 'After placing an order, choose a payment method, pay and upload the receipt on the order page — the admin confirms it in the backend only.'],
  ['faq.q3', 'Shablonni o\'zgartirsam bo\'ladimi?', 'Можно ли изменить шаблон?', 'Can I edit the template?'],
  ['faq.a3', "Ha. Barcha fayllar tahrirlanadigan holatda beriladi, o'z loyihangizda erkin ishlatishingiz mumkin.", 'Да. Все файлы передаются в редактируемом виде и могут использоваться в вашем проекте.', 'Yes. All files are editable and can be used freely in your project.'],
  ['faq.q4', 'Katalogda kerakli narsa yo\'q. Nima qilaman?', 'Нужного товара нет в каталоге. Что делать?', 'I cannot find what I need. What should I do?'],
  ['faq.a4', 'Individual buyurtma sahifasida loyiha turi va batafsil talablaringizni yozing. Admin ularni ko\'rib, narx va muddatni aniqlashtiradi.', 'На странице индивидуального заказа укажите тип проекта и подробные требования. Администратор уточнит цену и сроки.', 'On the custom order page, describe the project type and detailed requirements. The admin will clarify price and timing.'],
  ['final.title', 'Kanalga qo\'shiling', 'Подпишитесь на канал', 'Join our channel'],
  ['final.text', "Yangi mahsulotlar va chegirmalar birinchi bo'lib Telegram kanalda e'lon qilinadi.", 'Новые товары и скидки первыми публикуются в Telegram-канале.', 'New products and discounts are announced first on our Telegram channel.'],
  ['footer.text', "Raqamli mahsulotlar do'koni. Sifat, qulaylik, zamonaviylik.", 'Магазин цифровых товаров. Качество, удобство, современность.', 'Digital products store. Quality, convenience, modernity.'],
  ['footer.live', 'Jonli yangilanish ulangan', 'Подключены живые обновления', 'Live updates connected'],

  // Catalog and product
  ['catalog.text', "Barcha mahsulotlar tayyor fayl ko'rinishida beriladi.", 'Все товары передаются в виде готовых файлов.', 'All products are delivered as ready-to-use files.'],
  ['catalog.search', 'Mahsulot qidirish', 'Поиск товаров', 'Search products'],
  ['catalog.about', '{title} haqida', 'О товаре {title}', 'About {title}'],
  ['catalog.emptyTitle', 'Hech narsa topilmadi', 'Ничего не найдено', 'Nothing found'],
  ['catalog.emptyText', "Boshqa so'z yozing yoki individual buyurtma berishingiz mumkin.", 'Попробуйте другой запрос или оформите индивидуальный заказ.', 'Try another search or place a custom order.'],
  ['catalog.order', 'Buyurtma berish', 'Оформить заказ', 'Place order'],
  ['catalog.askPrice', "Narxini so'rang", 'Уточнить цену', 'Ask for price'],
  ['catalog.buyNow', 'Hozir olaman', 'Купить сейчас', 'Buy now'],
  ['catalog.addCart', "Savatga qo'shish", 'В корзину', 'Add to cart'],
  ['product.loading', 'Mahsulot yuklanmoqda...', 'Товар загружается...', 'Loading product...'],
  ['product.notFound', 'Mahsulot topilmadi', 'Товар не найден', 'Product not found'],
  ['product.notFoundText', 'Katalogga qaytib boshqa mahsulot tanlang.', 'Вернитесь в каталог и выберите другой товар.', 'Go back to the catalog and choose another product.'],
  ['product.fileAfterPayment', "To'lov tasdiqlangach fayl yuboriladi", 'Файл отправляется после подтверждения оплаты', 'File is sent after payment confirmation'],
  ['product.trackStatus', 'Buyurtma holatini kabinetingizda kuzatib borasiz', 'Вы отслеживаете статус заказа в кабинете', 'Track your order status in your cabinet'],
  ['product.botNotice', 'Xabarnoma boti orqali holat xabarlarini olasiz', 'Вы получаете уведомления через бота', 'You receive status updates via the notification bot'],
  ['product.customPrefix', 'Yoki individual loyihangiz bo\'lsa,', 'Если у вас индивидуальный проект,', 'If you have a custom project, use the'],
  ['product.customLink', 'buyurtma berish', 'оформите заказ', 'order page'],
  ['product.customSuffix', 'sahifasidan foydalaning.', 'на этой странице.', 'to place an order.'],

  // Authentication
  ['auth.newAccount', 'Yangi akkaunt', 'Новый аккаунт', 'New account'],
  ['auth.signIn', 'Kirish', 'Вход', 'Sign in'],
  ['auth.createAccount', 'Mijoz akkaunti yaratish', 'Создание аккаунта клиента', 'Create a customer account'],
  ['auth.signInTitle', 'Kabinetingizga kiring', 'Войдите в кабинет', 'Sign in to your cabinet'],
  ['auth.intro', 'Email orqali bir martalik kod bilan kiring — parol eslab qolish shart emas. Savatingiz kirishdan keyin ham saqlanadi.', 'Войдите по одноразовому коду из email — пароль запоминать не нужно. Корзина сохраняется после входа.', 'Sign in with a one-time email code — no password to remember. Your cart is preserved after sign-in.'],
  ['auth.methodsLoading', 'Kirish usullari tekshirilmoqda...', 'Проверка способов входа...', 'Checking sign-in methods...'],
  ['auth.emailChannel', 'Email orqali', 'Через email', 'Via email'],
  ['auth.unavailableTitle', 'Email orqali kirish hozircha mavjud emas', 'Вход по email пока недоступен', 'Email sign-in is not available yet'],
  ['auth.unavailableText', 'Email yuboruvchi sozlanmagan. .env da EMAIL_PROVIDER=gmail, GMAIL_USER va GMAIL_APP_PASSWORD kiriting.', 'Email-провайдер не настроен. Укажите EMAIL_PROVIDER=gmail, GMAIL_USER и GMAIL_APP_PASSWORD в .env.', 'Email provider is not configured. Set EMAIL_PROVIDER=gmail, GMAIL_USER and GMAIL_APP_PASSWORD in .env.'],
  ['auth.name', 'Ismingiz', 'Ваше имя', 'Your name'],
  ['auth.fullName', 'Ism Familiya', 'Имя Фамилия', 'Full name'],
  ['auth.emailAddress', 'Email manzili', 'Email-адрес', 'Email address'],
  ['auth.sending', 'Yuborilmoqda...', 'Отправка...', 'Sending...'],
  ['auth.sendCode', 'Kod yuborish', 'Отправить код', 'Send code'],
  ['auth.codeSent', 'Kod yuborildi', 'Код отправлен', 'Code sent'],
  ['auth.toYourAddress', 'Manzilingizga', 'На ваш адрес', 'To your address'],
  ['auth.code', 'Tasdiqlash kodi', 'Код подтверждения', 'Verification code'],
  ['auth.codeExpired', 'Kod muddati tugagan. Yangi kod so\'rang.', 'Срок действия кода истёк. Запросите новый код.', 'The code has expired. Request a new one.'],
  ['auth.checking', 'Tekshirilmoqda...', 'Проверка...', 'Verifying...'],
  ['auth.confirmLogin', 'Kirishni tasdiqlash', 'Подтвердить вход', 'Confirm sign-in'],
  ['auth.resend', 'Kodni qayta yuborish', 'Отправить код повторно', 'Resend code'],
  ['auth.resendIn', 'Qayta yuborish {seconds} soniyadan keyin', 'Повторная отправка через {seconds} сек.', 'Resend in {seconds} seconds'],
  ['auth.editContact', "Ma'lumotlarni o'zgartirish", 'Изменить данные', 'Edit details'],
  ['auth.haveAccount', 'Akkauntingiz bormi?', 'Уже есть аккаунт?', 'Already have an account?'],
  ['auth.noAccount', "Akkauntingiz yo'qmi?", 'Нет аккаунта?', 'No account yet?'],
  ['auth.newCode', 'Yangi tasdiqlash kodi yuborildi', 'Отправлен новый код подтверждения', 'A new verification code was sent'],
  ['auth.codeDelivered', 'Tasdiqlash kodi yuborildi', 'Код подтверждения отправлен', 'Verification code sent'],
  ['auth.enterName', 'Ismingizni kiriting', 'Введите ваше имя', 'Enter your name'],
  ['auth.enterEmail', 'Email manzilini to\'g\'ri kiriting', 'Введите корректный email', 'Enter a valid email address'],
  ['auth.requestFirst', "Avval kod so'rang", 'Сначала запросите код', 'Request a code first'],
  ['auth.enterCode', 'Tasdiqlash kodini kiriting', 'Введите код подтверждения', 'Enter the verification code'],
  ['auth.welcome', 'Xush kelibsiz!', 'Добро пожаловать!', 'Welcome!'],
  ['auth.created', 'Akkaunt yaratildi. Xush kelibsiz!', 'Аккаунт создан. Добро пожаловать!', 'Account created. Welcome!'],
  ['auth.contactConfirmed', "Ma'lumotlar tasdiqlandi", 'Данные подтверждены', 'Details confirmed'],
  ['auth.noSession', 'Kirish uchun sessiya olinmadi. Qaytadan urining.', 'Не удалось получить сессию. Попробуйте снова.', 'No session was received. Please try again.'],
  ['auth.help', 'Kod faqat sizning email manzilingizga yuboriladi. Uni hech kimga aytmang.', 'Код отправляется только на ваш email. Никому его не сообщайте.', 'The code is sent only to your email. Never share it.'],

  // Checkout
  ['checkout.loading', "Ma'lumotlar yuklanmoqda...", 'Загрузка данных...', 'Loading data...'],
  ['checkout.instant', 'Tezkor buyurtma', 'Быстрый заказ', 'Instant order'],
  ['checkout.customTitle', 'Loyihangizni buyurtma qiling', 'Закажите ваш проект', 'Order your project'],
  ['checkout.confirmTitle', 'Buyurtmani tasdiqlash', 'Подтверждение заказа', 'Confirm order'],
  ['checkout.intro', "Ma'lumotlaringizni tasdiqlang. Buyurtma kabinetingizda saqlanadi, to'lov va fayl ham shu yerda bo'ladi.", 'Подтвердите данные. Заказ сохранится в кабинете, там же будут оплата и файл.', 'Confirm your details. The order is saved in your cabinet, where payment and files are handled too.'],
  ['checkout.contacts', "1. Aloqa ma'lumotlari", '1. Контактные данные', '1. Contact details'],
  ['checkout.notes', "Qo'shimcha izoh", 'Дополнительный комментарий', 'Additional notes'],
  ['checkout.notesPlaceholder', 'Istaklaringiz yoki savollaringiz...', 'Ваши пожелания или вопросы...', 'Your preferences or questions...'],
  ['checkout.loginToOrder', 'Buyurtma berish uchun', 'Для оформления заказа', 'To place an order,'],
  ['checkout.loginLink', 'tizimga kiring', 'войдите в аккаунт', 'sign in'],
  ['checkout.projectDetails', '2. Loyiha tafsilotlari', '2. Детали проекта', '2. Project details'],
  ['checkout.projectType', 'Loyiha turi *', 'Тип проекта *', 'Project type *'],
  ['checkout.projectTypePlaceholder', 'Masalan: Landing page, CRM, dizayn', 'Например: лендинг, CRM, дизайн', 'For example: landing page, CRM, design'],
  ['checkout.budget', "Taxminiy byudjet (so'm)", 'Примерный бюджет (сум)', 'Estimated budget (UZS)'],
  ['checkout.requirements', 'Batafsil talablar *', 'Подробные требования *', 'Detailed requirements *'],
  ['checkout.requirementsPlaceholder', "Loyiha nima qilishi kerak, kimlar uchun, qanday funksiyalar bo'lishi kerak, dizayn va texnologiya istaklari...", 'Что должен делать проект, для кого, какие функции нужны, пожелания по дизайну и технологиям...', 'What the project should do, who it is for, required features, design and technology preferences...'],
  ['checkout.agreedTotal', 'Kelishilgan summa (ixtiyoriy)', 'Согласованная сумма (необязательно)', 'Agreed amount (optional)'],
  ['checkout.budgetFallback', "Bo'sh qolsa byudjet ishlatiladi", 'Если оставить пустым, используется бюджет', 'If empty, the budget is used'],
  ['checkout.adminPrice', 'Admin keyinchalik narxni aniqlashtirishi mumkin.', 'Администратор может уточнить цену позже.', 'The admin may clarify the price later.'],
  ['checkout.cartSection', '2. Savat', '2. Корзина', '2. Cart'],
  ['checkout.cartEmpty', "Savat bo'sh", 'Корзина пуста', 'Cart is empty'],
  ['checkout.cartEmptyText', 'Katalogdan mahsulot qo\'shing yoki individual buyurtma bering.', 'Добавьте товар из каталога или оформите индивидуальный заказ.', 'Add a product from the catalog or place a custom order.'],
  ['checkout.toCatalog', "Katalogga o'tish", 'Перейти в каталог', 'Go to catalog'],
  ['checkout.perPiece', '/ dona', '/ шт.', '/ pcs'],
  ['checkout.decrease', 'Kamaytirish', 'Уменьшить', 'Decrease'],
  ['checkout.increase', "Ko'paytirish", 'Увеличить', 'Increase'],
  ['checkout.remove', "O'chirish", 'Удалить', 'Remove'],
  ['checkout.paymentSection', "3. To'lov usuli", '3. Способ оплаты', '3. Payment method'],
  ['checkout.noMethods', "To'lov usullari yuklanmadi. Keyinroq qayta urining.", 'Способы оплаты не загрузились. Повторите позже.', 'Payment methods failed to load. Please try again later.'],
  ['checkout.submitting', 'Yuborilmoqda...', 'Отправка...', 'Submitting...'],
  ['checkout.submit', 'Buyurtmani tasdiqlash', 'Подтвердить заказ', 'Confirm order'],
  ['checkout.summary', 'Buyurtma xulosasi', 'Сводка заказа', 'Order summary'],
  ['checkout.summaryType', 'Turi', 'Тип', 'Type'],
  ['checkout.itemCount', 'Mahsulotlar soni', 'Количество товаров', 'Number of items'],
  ['checkout.paymentInfo', "Buyurtma yaratilgandan so'ng to'lov ma'lumotlarini buyurtma sahifasida yuborishingiz mumkin.", 'После создания заказа вы можете отправить данные оплаты на странице заказа.', 'After the order is created, you can submit payment details on the order page.'],
  ['checkout.secure', "Ma'lumotlaringiz himoyalangan", 'Ваши данные защищены', 'Your data is protected'],
  ['checkout.loginRequired', 'Buyurtma berish uchun tizimga kiring.', 'Войдите в аккаунт, чтобы оформить заказ.', 'Sign in to place an order.'],
  ['checkout.validPhone', "Telefon raqamini to'g'ri kiriting", 'Введите корректный номер телефона', 'Enter a valid phone number'],
  ['checkout.emptyCart', "Savat bo'sh. Avval mahsulot qo'shing.", 'Корзина пуста. Сначала добавьте товар.', 'Your cart is empty. Add a product first.'],
  ['checkout.shortRequirements', 'Loyiha talablarini kamida 10 belgi yozing', 'Опишите требования не менее 10 символов', 'Write at least 10 characters of requirements'],
  ['checkout.created', 'Buyurtma qabul qilindi!', 'Заказ принят!', 'Order placed!'],
  ['checkout.failed', 'Buyurtma yaratilmadi', 'Заказ не создан', 'Order was not created'],

  // Cabinet
  ['cabinet.hello', "Assalomu alaykum, {name}", 'Здравствуйте, {name}', 'Hello, {name}'],
  ['cabinet.intro', "Buyurtmalaringiz, xaridlaringiz, to'lovlar va fayllaringiz bir joyda.", 'Ваши заказы, покупки, платежи и файлы в одном месте.', 'Your orders, purchases, payments and files in one place.'],
  ['cabinet.tab.orders', 'Buyurtmalar', 'Заказы', 'Orders'],
  ['cabinet.tab.purchases', 'Xaridlar', 'Покупки', 'Purchases'],
  ['cabinet.tab.payments', "To'lovlar", 'Платежи', 'Payments'],
  ['cabinet.tab.receipts', 'Hujjatlar', 'Документы', 'Documents'],
  ['cabinet.tab.downloads', 'Yuklamalar', 'Загрузки', 'Downloads'],
  ['cabinet.tab.activity', 'Faoliyat', 'Активность', 'Activity'],
  ['cabinet.tab.profile', 'Profil', 'Профиль', 'Profile'],
  ['cabinet.noOrders', "Hali buyurtma yo'q", 'Заказов пока нет', 'No orders yet'],
  ['cabinet.noOrdersText', 'Katalogdan mahsulot tanlang yoki individual buyurtma bering.', 'Выберите товар в каталоге или оформите индивидуальный заказ.', 'Choose a product in the catalog or place a custom order.'],
  ['cabinet.project', 'Loyiha', 'Проект', 'Project'],
  ['cabinet.purchasesText', 'Sotib olingan mahsulotlar va ularga biriktirilgan buyurtmalar', 'Купленные товары и связанные с ними заказы', 'Purchased products and their linked orders'],
  ['cabinet.noPurchases', "Hali xarid yo'q", 'Покупок пока нет', 'No purchases yet'],
  ['cabinet.noPurchasesText', "To'lov tasdiqlangach mahsulotlar shu yerda ko'rinadi.", 'После подтверждения оплаты товары появятся здесь.', 'Products will appear here after payment confirmation.'],
  ['cabinet.noPayments', "To'lovlar yo'q", 'Платежей нет', 'No payments'],
  ['cabinet.noPaymentsText', "Buyurtma yaratgach to'lov ma'lumotlari shu yerda paydo bo'ladi.", 'После создания заказа данные оплаты появятся здесь.', 'Payment details will appear here after an order is created.'],
  ['cabinet.documents', "To'lov hujjatlari", 'Платежные документы', 'Payment documents'],
  ['cabinet.documentsText', "Buyurtmalaringiz bo'yicha yaratilgan hujjatlar", 'Документы, созданные по вашим заказам', 'Documents created for your orders'],
  ['cabinet.noDocuments', 'Hujjat yo\'q', 'Документов нет', 'No documents'],
  ['cabinet.noDocumentsText', "To'lov tasdiqlangach hujjat shu yerda paydo bo'ladi.", 'После подтверждения оплаты документ появится здесь.', 'The document will appear here after payment confirmation.'],
  ['cabinet.fiscal', 'Fiskal', 'Фискальный', 'Fiscal'],
  ['cabinet.internal', 'Ichki', 'Внутренний', 'Internal'],
  ['cabinet.files', 'Fayllar va yetkazib berish', 'Файлы и доставка', 'Files and delivery'],
  ['cabinet.filesText', 'Raqamli mahsulotlaringizni shu yerdan oling', 'Получите ваши цифровые товары здесь', 'Get your digital products here'],
  ['cabinet.noDownloads', 'Yuklama yo\'q', 'Загрузок нет', 'No downloads'],
  ['cabinet.noDownloadsText', "To'lov tasdiqlangach fayllar shu yerda paydo bo'ladi.", 'После подтверждения оплаты файлы появятся здесь.', 'Files will appear here after payment confirmation.'],
  ['cabinet.ready', 'Tayyor', 'Готов', 'Ready'],
  ['cabinet.purchase', 'Xarid', 'Покупка', 'Purchase'],
  ['cabinet.fileOnOrder', 'Fayl buyurtma sahifasida ham mavjud', 'Файл также доступен на странице заказа', 'File is also available on the order page'],
  ['cabinet.activityTitle', 'Faoliyat tarixi', 'История активности', 'Activity history'],
  ['cabinet.activityText', "Akkauntingiz bilan bog'liq so'nggi harakatlar", 'Последние действия, связанные с вашим аккаунтом', 'Recent actions related to your account'],
  ['cabinet.noActivity', 'Faoliyat yo\'q', 'Активности нет', 'No activity'],
  ['cabinet.noActivityText', 'Buyurtma va to\'lov harakatlari shu yerda yoziladi.', 'Действия с заказами и платежами записываются здесь.', 'Order and payment actions are recorded here.'],
  ['cabinet.personal', "Shaxsiy ma'lumotlar", 'Личные данные', 'Personal details'],
  ['cabinet.personalText', 'Buyurtmalar uchun ishlatiladigan ma\'lumotlar', 'Данные, используемые для заказов', 'Details used for orders'],
  ['cabinet.customerId', 'Mijoz ID', 'ID клиента', 'Customer ID'],
  ['cabinet.accountStatus', 'Hisob holati', 'Статус аккаунта', 'Account status'],
  ['cabinet.joined', "Qo'shilgan sana", 'Дата регистрации', 'Joined'],
  ['cabinet.lastLogin', 'Oxirgi kirish', 'Последний вход', 'Last sign-in'],
  ['cabinet.active', 'Faol', 'Активен', 'Active'],
  ['cabinet.suspended', 'Vaqtinchalik to‘xtatilgan', 'Временно приостановлен', 'Suspended'],
  ['cabinet.blocked', 'Bloklangan', 'Заблокирован', 'Blocked'],
  ['cabinet.newEmail', 'Yangi emailni tasdiqlash', 'Подтверждение нового email', 'Verify new email'],
  ['cabinet.codeSentTo', 'Kod yuborildi:', 'Код отправлен:', 'Code sent to:'],
  ['cabinet.resendIn', 'Qayta yuborish {seconds}s', 'Повторить через {seconds} сек.', 'Resend in {seconds}s'],
  ['cabinet.emailChanged', "Email o'zgartirildi, lekin kod yuborilmadi. Qayta saqlang yoki xatolikni tekshiring.", 'Email изменён, но код не отправлен. Сохраните снова или проверьте ошибку.', 'Email changed but no code was sent. Save again or check the error.'],
  ['cabinet.passwordTitle', "Parol o'rnatish/o'zgartirish", 'Установить/изменить пароль', 'Set/change password'],
  ['cabinet.passwordHelp', "Agar akkauntingizda parol bo'lmasa, joriy parol maydonini bo'sh qoldiring.", 'Если у аккаунта нет пароля, оставьте поле текущего пароля пустым.', 'If your account has no password, leave the current password field empty.'],
  ['cabinet.currentPassword', 'Joriy parol (agar mavjud bo\'lsa)', 'Текущий пароль (если есть)', 'Current password (if any)'],
  ['cabinet.newPassword', 'Yangi parol', 'Новый пароль', 'New password'],
  ['cabinet.savePassword', 'Parolni saqlash', 'Сохранить пароль', 'Save password'],
  ['cabinet.notifications', 'Xabarnomalar', 'Уведомления', 'Notifications'],
  ['cabinet.notificationHelp', 'Telegram bot faqat xabarnoma va yordam uchun', 'Telegram-бот только для уведомлений и поддержки', 'The Telegram bot is only for notifications and support'],
  ['cabinet.telegramHint', "@maxsellershop_bot ga /start va /link yuboring, so'ng kodni kiriting.", 'Отправьте /start и /link боту @maxsellershop_bot, затем введите код.', 'Send /start and /link to @maxsellershop_bot, then enter the code.'],
  ['cabinet.linkCode', 'Link kodi (masalan: AB12CD)', 'Код привязки (например: AB12CD)', 'Link code (e.g. AB12CD)'],
  ['cabinet.link', "Bog'lash", 'Привязать', 'Link'],
  ['cabinet.unlink', "Bog'lanishni uzish", 'Отвязать', 'Unlink'],
  ['cabinet.notifyOn', 'yoqilgan', 'включены', 'enabled'],
  ['cabinet.notifyOff', "o'chirilgan", 'выключены', 'disabled'],
  ['cabinet.websiteOnly', 'Buyurtmalar faqat veb-sayt orqali qabul qilinadi.', 'Заказы принимаются только через сайт.', 'Orders are accepted only through the website.'],
  ['cabinet.summary', 'Hisob qisqacha', 'Краткая сводка', 'Account summary'],
  ['cabinet.saved', 'Profil saqlandi', 'Профиль сохранён', 'Profile saved'],
  ['cabinet.savedVerify', 'Profil saqlandi. Yangi email manzilini tasdiqlang', 'Профиль сохранён. Подтвердите новый email', 'Profile saved. Verify your new email address'],
  ['cabinet.emailVerified', 'Email tasdiqlandi', 'Email подтверждён', 'Email verified'],
  ['cabinet.newCode', 'Yangi kod yuborildi', 'Отправлен новый код', 'A new code was sent'],
  ['cabinet.enterCode', 'Tasdiqlash kodini kiriting', 'Введите код подтверждения', 'Enter the verification code'],
  ['cabinet.orderNotFound', 'Buyurtma topilmadi', 'Заказ не найден', 'Order not found'],
  ['cabinet.fileLinkOpened', 'Fayl yuklash havolasi ochildi', 'Ссылка на скачивание открыта', 'Download link opened'],
  ['cabinet.telegramLinked', 'Telegram akkaunti bog\'landi', 'Telegram-аккаунт привязан', 'Telegram account linked'],
  ['cabinet.telegramLinkedShort', 'bog\'langan', 'привязан', 'linked'],
  ['cabinet.telegramUnlinked', 'Telegram bog\'lanishi uzildi', 'Привязка Telegram отключена', 'Telegram link removed'],
  ['cabinet.passwordSaved', 'Parol saqlandi', 'Пароль сохранён', 'Password saved'],

  // Order, success, track and shared UI
  ['order.details', 'Buyurtma tafsilotlari', 'Детали заказа', 'Order details'],
  ['order.numberLine', 'Buyurtma raqamingiz: {number}. Holatni shu sahifada yoki kabinetingizda kuzatib boring.', 'Номер вашего заказа: {number}. Статус можно отследить здесь или в кабинете.', 'Your order number is {number}. Track its status here or in your cabinet.'],
  ['order.statusTitle', 'Buyurtma holati', 'Статус заказа', 'Order status'],
  ['order.created', 'Yaratilgan:', 'Создан:', 'Created:'],
  ['order.reason', 'Sabab:', 'Причина:', 'Reason:'],
  ['order.paymentTitle', "To'lov", 'Оплата', 'Payment'],
  ['order.paymentMethodLine', "To'lov usuli: {method}", 'Способ оплаты: {method}', 'Payment method: {method}'],
  ['order.uploadHint', "To'lov qilgach chek rasmini yuklang. Admin tasdiqlagach mahsulot ochiladi.", 'После оплаты загрузите фото чека. Товар откроется после подтверждения администратором.', 'After paying, upload a receipt photo. The product unlocks after admin confirmation.'],
  ['order.receiptChoose', 'Chek rasmini tanlash (PNG, JPG)', 'Выбрать фото чека (PNG, JPG)', 'Choose receipt image (PNG, JPG)'],
  ['order.receiptAlt', "To'lov cheki", 'Чек оплаты', 'Payment receipt'],
  ['order.transactionNote', 'Tranzaksiya ID yoki izoh (ixtiyoriy)', 'ID транзакции или комментарий (необязательно)', 'Transaction ID or note (optional)'],
  ['order.sendReceipt', 'Chekni yuborish', 'Отправить чек', 'Send receipt'],
  ['order.cannotPay', "Bu buyurtma bo'yicha to'lov yuborib bo'lmaydi.", 'Для этого заказа нельзя отправить оплату.', 'Payment cannot be submitted for this order.'],
  ['order.paymentConfirmed', "To'lov tasdiqlangan", 'Оплата подтверждена', 'Payment confirmed'],
  ['order.history', 'Holat tarixi', 'История статусов', 'Status history'],
  ['order.historyText', "Har bir o'zgarish vaqt va sababi bilan saqlanadi", 'Каждое изменение сохраняется со временем и причиной', 'Every change is saved with time and reason'],
  ['order.noHistory', "Hali o'zgarish yo'q", 'Изменений пока нет', 'No changes yet'],
  ['order.actions', 'Harakatlar', 'Действия', 'Actions'],
  ['order.downloadProduct', 'Mahsulotni yuklash', 'Скачать товар', 'Download product'],
  ['order.downloadReceipt', "To'lov hujjatini yuklash (PDF)", 'Скачать документ оплаты (PDF)', 'Download payment document (PDF)'],
  ['order.cancel', 'Buyurtmani bekor qilish', 'Отменить заказ', 'Cancel order'],
  ['order.pdfNote', "PDF hujjat to'lov tasdig'i uchun ichki hujjat hisoblanadi, moliyaviy chek (fiscal receipt) emas.", 'PDF-документ является внутренним подтверждением оплаты, а не фискальным чеком.', 'The PDF is an internal payment confirmation, not a fiscal receipt.'],
  ['order.customer', 'Mijoz', 'Клиент', 'Customer'],
  ['order.documents', 'Hujjatlar', 'Документы', 'Documents'],
  ['order.allMine', 'Barcha buyurtmalarim', 'Все мои заказы', 'All my orders'],
  ['order.toCabinet', 'Kabinetingizga kiring', 'Войдите в кабинет', 'Sign in to your cabinet'],
  ['order.projectType', 'Loyiha turi', 'Тип проекта', 'Project type'],
  ['order.requirements', 'Talablar', 'Требования', 'Requirements'],
  ['order.itemsCount', '{count} ta mahsulot', 'Товаров: {count}', '{count} products'],
  ['order.loading', 'Buyurtma ma\'lumotlari yuklanmoqda...', 'Загрузка данных заказа...', 'Loading order details...'],
  ['order.loadFailed', "Buyurtma yuklanmadi", 'Заказ не загрузился', 'Order failed to load'],
  ['order.fileReadFailed', "Fayl o'qilmadi", 'Не удалось прочитать файл', 'File could not be read'],
  ['order.noReceipt', "Avval to'lov cheki rasmini tanlang", 'Сначала выберите фото чека', 'Choose a receipt image first'],
  ['order.receiptSent', 'Chek yuborildi. Admin tekshiruvidan keyin holat yangilanadi.', 'Чек отправлен. Статус обновится после проверки администратором.', 'Receipt sent. The status will update after admin review.'],
  ['order.receiptFailed', 'Chek yuborilmadi', 'Чек не отправлен', 'Receipt was not sent'],
  ['order.noFile', "Faylni olish imkoni yo'q", 'Не удалось получить файл', 'File is not available'],
  ['order.receiptDownloaded', "To'lov hujjati yuklandi", 'Документ оплаты скачан', 'Payment document downloaded'],
  ['order.documentFailed', 'Hujjat yuklanmadi', 'Документ не скачан', 'Document was not downloaded'],
  ['order.confirmCancel', 'Buyurtmani bekor qilishni tasdiqlaysizmi?', 'Подтвердите отмену заказа?', 'Cancel this order?'],
  ['order.cancelled', 'Buyurtma bekor qilindi', 'Заказ отменён', 'Order cancelled'],
  ['order.cancelFailed', "Bekor qilib bo'lmadi", 'Не удалось отменить', 'Could not cancel'],
  ['success.accepted', 'Buyurtma qabul qilindi', 'Заказ принят', 'Order placed'],
  ['success.thanks', 'Rahmat, {name}!', 'Спасибо, {name}!', 'Thank you, {name}!'],
  ['success.saved', 'Buyurtmangiz bazaga yozildi. Holatni kabinetingizda yoki buyurtma sahifasida kuzatib borishingiz mumkin.', 'Ваш заказ сохранён в базе. Статус можно отследить в кабинете или на странице заказа.', 'Your order is saved in the database. Track it in your cabinet or on the order page.'],
  ['success.number', 'Buyurtma raqami', 'Номер заказа', 'Order number'],
  ['success.details', "Buyurtma ma'lumotlari", 'Данные заказа', 'Order details'],
  ['success.paymentStatus', "To'lov holati", 'Статус оплаты', 'Payment status'],
  ['success.myOrders', 'Buyurtmalarim', 'Мои заказы', 'My orders'],
  ['success.paymentTip', "To'lov ma'lumotlarini buyurtma sahifasida yuborishingiz mumkin.", 'Данные оплаты можно отправить на странице заказа.', 'You can submit payment details on the order page.'],
  ['success.fileTip', "Fayl to'lov tasdiqlangach kabinetda paydo bo'ladi.", 'Файл появится в кабинете после подтверждения оплаты.', 'The file appears in your cabinet after payment confirmation.'],
  ['track.eyebrow', 'Buyurtmani kuzatish', 'Отслеживание заказа', 'Track order'],
  ['track.title', 'Buyurtmangiz qayerda?', 'Где ваш заказ?', 'Where is your order?'],
  ['track.text', "Buyurtma raqami va (agar mavjud bo'lsa) maxfiy token orqali holatni ko'ring. Akkauntga kirgan bo'lsangiz, buyurtmalaringizni kabinetda ham ko'rishingiz mumkin.", 'Узнайте статус по номеру заказа и (если есть) секретному токену. Если вы вошли в аккаунт, заказы доступны в кабинете.', 'Check the status using your order number and (if available) secret token. If signed in, you can also see orders in your cabinet.'],
  ['track.number', 'Buyurtma raqami', 'Номер заказа', 'Order number'],
  ['track.token', 'Maxfiy token (ixtiyoriy)', 'Секретный токен (необязательно)', 'Secret token (optional)'],
  ['track.tokenPlaceholder', 'Mavjud bo\'lsa kiriting', 'Введите, если есть', 'Enter if available'],
  ['track.searching', 'Qidirilmoqda...', 'Поиск...', 'Searching...'],
  ['track.find', 'Buyurtmani topish', 'Найти заказ', 'Find order'],
  ['track.notFound', 'Buyurtma topilmadi', 'Заказ не найден', 'Order not found'],
  ['track.loggedIn', 'Akkauntingiz bilan kirdingizmi?', 'Вы вошли в аккаунт?', 'Signed in to your account?'],
  ['track.myOrders', 'Kabinetdagi buyurtmalarim', 'Мои заказы в кабинете', 'My orders in cabinet'],
  ['ui.retry', 'Qayta urinish', 'Повторить', 'Retry'],
  ['ui.loading', 'Yuklanmoqda...', 'Загрузка...', 'Loading...'],
  ['ui.logout', 'Siz chiqdingiz', 'Вы вышли', 'You have signed out'],
  ['ui.added', '"{title}" savatga qo\'shildi', '{title} добавлен в корзину', '{title} added to cart'],
  ['ui.serverError', "Server bilan bog'lanib bo'lmadi", 'Не удалось подключиться к серверу', 'Could not connect to the server'],
  ['ui.checkServer', 'server ishga tushganligini tekshiring', 'проверьте, запущен ли сервер', 'check that the server is running'],

  // Cinematic store promo
  ['nav.promo', 'Reklama', 'Ролик', 'Ad film'],
  ['promo.kicker', '45 SONIYALIK PREZENTATSIYA', '45-СЕКУНДНАЯ ПРЕЗЕНТАЦИЯ', '45-SECOND STORE REEL'],
  ['promo.title', 'Bir do‘konda — barcha raqamli mahsulotlar', 'В одном магазине — все цифровые товары', 'All digital products in one store'],
  ['promo.text', 'Saytlar, dizayn, hujjatlar va kurslar. Reklamani tomosha qilib, nega MaxSeller ekanligini bilib oling.', 'Сайты, дизайн, документы и курсы. Посмотрите ролик и узнайте, почему MaxSeller.', 'Websites, design, documents and courses. Watch the reel and see why MaxSeller stands out.'],
  ['promo.play', 'Reklamani ko‘rish', 'Смотреть ролик', 'Watch the ad'],
  ['promo.watchVideo', 'MP4 ni ko‘rish', 'Смотреть MP4', 'Watch MP4'],
  ['promo.download', 'MP4 ni yuklash', 'Скачать MP4', 'Download MP4'],
  ['promo.meta', '45 sekund · animatsiya · ovoz effektlari', '45 секунд · анимация · звук', '45 seconds · animation · sound effects'],
  ['promo.badge1', '12 ta mahsulot', '12 товаров', '12 products'],
  ['promo.badge2', '4 yo‘nalish', '4 направления', '4 categories'],
  ['promo.badge3', '24/7 kabinet', 'Кабинет 24/7', 'Cabinet 24/7'],
  ['promo.qaTitle', 'Reklamada javob beramiz', 'Отвечаем в ролике', 'Answered in the ad'],
  ['promo.q1', 'Fayl qachon keladi?', 'Когда придёт файл?', 'When do I get the file?'],
  ['promo.q2', 'To‘lov qanday tasdiqlanadi?', 'Как подтверждается оплата?', 'How is payment confirmed?'],
  ['promo.q3', 'Faylni o‘zgartirsam bo‘ladimi?', 'Можно ли редактировать?', 'Can I edit it?'],
  ['promo.s1.tag', '01 · NIMA BU?', '01 · ЧТО ЭТО?', '01 · WHAT IS IT?'],
  ['promo.s1.title', 'Raqamli mahsulotlar do‘koni', 'Магазин цифровых товаров', 'Digital products store'],
  ['promo.s1.text', 'Tayyor veb-saytlar, dizayn shablonlari, ilmiy hujjatlar va video kurslar — bitta kabinetda.', 'Готовые сайты, дизайн-шаблоны, научные работы и видеокурсы — в одном кабинете.', 'Ready websites, design templates, academic papers and video courses — all in one cabinet.'],
  ['promo.s1.points', 'Veb-saytlar · Dizayn · Hujjatlar · Video kurslar', 'Сайты · Дизайн · Документы · Видеокурсы', 'Websites · Design · Documents · Video courses'],
  ['promo.s2.tag', '02 · NEGA KERAK?', '02 · ЗАЧЕМ НУЖНО?', '02 · WHY YOU NEED IT?'],
  ['promo.s2.title', 'Vaqt va pulingizni tejang', 'Экономьте время и деньги', 'Save time and money'],
  ['promo.s2.text', 'Noldan boshlash o‘rniga sifatli tayyor fayl oling va darhol ishlatishni boshlang.', 'Вместо работы с нуля возьмите качественный готовый файл и начните использовать его сразу.', 'Instead of starting from scratch, get a quality ready-made file and start using it right away.'],
  ['promo.s2.points', 'Tayyor fayl · Tahrirlanadigan · Tez yetkazib berish', 'Готовый файл · Редактируемый · Быстрая выдача', 'Ready file · Editable · Fast delivery'],
  ['promo.s3.tag', '03 · QANDAY ISHLAYDI?', '03 · КАК РАБОТАЕТ?', '03 · HOW IT WORKS?'],
  ['promo.s3.title', 'Tanlang → to‘lang → yuklang', 'Выберите → оплатите → скачайте', 'Choose → pay → download'],
  ['promo.s3.text', 'Email orqali bir martalik kod bilan kiring, buyurtma bering, to‘lov chekini yuklang — fayl kabinetga keladi.', 'Войдите по одноразовому коду из email, оформите заказ, загрузите чек — файл появится в кабинете.', 'Sign in with a one-time email code, place an order, upload the receipt — the file appears in your cabinet.'],
  ['promo.s3.points', 'Email OTP · Haqiqiy buyurtma · Admin tasdiqlaydi', 'Email OTP · Реальный заказ · Подтверждение админа', 'Email OTP · Real order · Admin approval'],
  ['promo.s4.tag', '04 · NIMA OLASIZ?', '04 · ЧТО ПОЛУЧАЕТЕ?', '04 · WHAT DO YOU GET?'],
  ['promo.s4.title', '12 ta mahsulot · 4 yo‘nalish', '12 товаров · 4 направления', '12 products · 4 categories'],
  ['promo.s4.text', 'Landing, onlayn do‘kon, portfolio, UI kit, Word, PDF va video darslar — hammasi siz uchun.', 'Лендинг, магазин, портфолио, UI-кит, Word, PDF и видеоуроки — всё для вас.', 'Landing pages, online store, portfolio, UI kit, Word, PDF and video lessons — all for you.'],
  ['promo.s4.points', 'Veb · Dizayn · Hujjat · Video', 'Веб · Дизайн · Документы · Видео', 'Web · Design · Documents · Video'],
  ['promo.s5.tag', '05 · ISHONCHLIMI?', '05 · ЭТО НАДЁЖНО?', '05 · IS IT TRUSTWORTHY?'],
  ['promo.s5.title', 'Haqiqiy buyurtma, haqiqiy yordam', 'Реальный заказ, реальная поддержка', 'Real orders, real support'],
  ['promo.s5.text', 'Buyurtma bazada saqlanadi, holatni kabinetingizda kuzatib borasiz. Telegram bot faqat xabarnoma uchun.', 'Заказ сохраняется в базе, статус видно в кабинете. Telegram-бот служит только для уведомлений.', 'Your order is stored in the database and its status is visible in your cabinet. The Telegram bot is only for notifications.'],
  ['promo.s5.points', 'Holat kuzatuv · 24/7 yordam · Xavfsiz kirish', 'Отслеживание · Поддержка 24/7 · Безопасный вход', 'Status tracking · 24/7 support · Secure sign-in'],
  ['promo.s6.tag', '06 · BOSHLANG', '06 · НАЧНИТЕ СЕЙЧАС', '06 · GET STARTED'],
  ['promo.s6.title', 'Bir klik va fayl sizning', 'Один клик — и файл ваш', 'One click and the file is yours'],
  ['promo.s6.text', 'Katalogga o‘ting, kerakli mahsulotni tanlang va bugun olishni boshlang.', 'Перейдите в каталог, выберите нужный товар и начните получать его сегодня.', 'Open the catalog, choose the product you need and start getting it today.'],
  ['promo.s6.points', 'Katalog · Savat · Kabinet', 'Каталог · Корзина · Кабинет', 'Catalog · Cart · Cabinet'],
  ['promo.mute', 'Ovozni o‘chirish', 'Выключить звук', 'Mute'],
  ['promo.unmute', 'Ovozni yoqish', 'Включить звук', 'Unmute'],
  ['promo.skip', 'O‘tkazib yuborish', 'Пропустить', 'Skip'],
  ['promo.replay', 'Qayta ko‘rish', 'Смотреть снова', 'Replay'],
  ['promo.cta', 'Katalogga o‘tish', 'Перейти в каталог', 'Open catalog'],
  ['promo.close', 'Yopish', 'Закрыть', 'Close'],
  ['promo.watermark', 'MAXSELLER · DIGITAL STORE', 'MAXSELLER · DIGITAL STORE', 'MAXSELLER · DIGITAL STORE'],
] as const

type Key = (typeof entries)[number][0]
export type I18nKey = Key
type Translation = Record<Language, string>

const dictionaries = Object.fromEntries(
  entries.map(([key, uz, ru, en]) => [key, { uz, ru, en }]),
) as Record<Key, Translation>

export type Translate = (key: Key, vars?: Vars) => string

export const LANGUAGES: { id: Language; label: string; short: string; flag: string }[] = [
  { id: 'uz', label: 'Oʻzbekcha', short: 'UZ', flag: '🇺🇿' },
  { id: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { id: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
]

function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (stored === 'uz' || stored === 'ru' || stored === 'en') return stored
  } catch {
    // localStorage may be unavailable in private mode.
  }
  return 'uz'
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage may be unavailable in private mode.
  }
  return 'dark'
}

interface I18nValue {
  lang: Language
  setLang: (lang: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readLanguage)
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(LANGUAGE_KEY, lang) } catch { /* ignore */ }
  }, [lang])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const setLang = useCallback((next: Language) => setLangState(next), [])
  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(() => setThemeState((current) => current === 'dark' ? 'light' : 'dark'), [])

  const t = useCallback<Translate>((key, vars) => {
    let text: string = dictionaries[key]?.[lang] ?? dictionaries[key]?.uz ?? key
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
    }
    return text
  }, [lang])

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, theme, setTheme, toggleTheme, t }),
    [lang, setLang, theme, setTheme, toggleTheme, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}

export function statusKey(status: string): Key {
  return ('status.' + status) as Key
}

export function paymentKey(status: string): Key {
  return ('payment.' + status) as Key
}

export function categoryKey(category: string): Key {
  return ('category.' + category) as Key
}
