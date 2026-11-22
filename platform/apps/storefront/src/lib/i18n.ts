/**
 * Til lug'ati. Asosiy til — o'zbekcha (uz).
 * `ru` va `en` strukturalari kelajak lokalizatsiyasi uchun tayyorlangan.
 */
export const dictionaries = {
  uz: {
    brand: 'MaxSeller',
    slogan: 'Raqamli mahsulotlar bir joyda!',
    nav: {
      home: 'Bosh sahifa',
      products: 'Mahsulotlar',
      categories: 'Kategoriyalar',
      cart: 'Savat',
      orders: 'Xaridlarim',
      downloads: 'Yuklamalar',
      favorites: 'Sevimlilar',
      profile: 'Profil',
      login: 'Kirish',
      register: 'Ro\'yxatdan o\'tish',
      logout: 'Chiqish',
    },
    actions: {
      details: 'Batafsil',
      addToCart: 'Savatga qo\'shish',
      buyNow: 'Hozir sotib olish',
      checkout: 'Buyurtma berish',
      continueShopping: 'Xaridni davom ettirish',
      search: 'Qidirish',
      retry: 'Qaytadan urinib ko\'rish',
      loading: 'Yuklanmoqda...',
      cancel: 'Bekor qilish',
      save: 'Saqlash',
    },
    labels: {
      price: 'Narx',
      oldPrice: 'Eski narx',
      category: 'Kategoriya',
      rating: 'Reyting',
      reviews: 'Sharhlar',
      inCart: 'Savatda',
      empty: 'Hozircha ma\'lumot yo\'q',
      error: 'Ma\'lumotlarni yuklab bo\'lmadi',
    },
    messages: {
      addedToCart: 'Mahsulot savatga qo\'shildi',
      removedFromCart: 'Mahsulot savatdan o\'chirildi',
      loginRequired: 'Avval tizimga kiring',
      receiptUploaded: "To'lovingiz tekshirilmoqda. Iltimos, admin tasdiqlashini kuting.",
    },
  },
  ru: {
    brand: 'MaxSeller',
    slogan: 'Цифровые продукты в одном месте!',
    nav: {
      home: 'Главная',
      products: 'Товары',
      categories: 'Категории',
      cart: 'Корзина',
      orders: 'Мои покупки',
      downloads: 'Загрузки',
      favorites: 'Избранное',
      profile: 'Профиль',
      login: 'Войти',
      register: 'Регистрация',
      logout: 'Выйти',
    },
    actions: {
      details: 'Подробнее',
      addToCart: 'В корзину',
      buyNow: 'Купить сейчас',
      checkout: 'Оформить заказ',
      continueShopping: 'Продолжить покупки',
      search: 'Поиск',
      retry: 'Повторить',
      loading: 'Загрузка...',
      cancel: 'Отмена',
      save: 'Сохранить',
    },
    labels: {
      price: 'Цена',
      oldPrice: 'Старая цена',
      category: 'Категория',
      rating: 'Рейтинг',
      reviews: 'Отзывы',
      inCart: 'В корзине',
      empty: 'Пока нет данных',
      error: 'Не удалось загрузить данные',
    },
    messages: {
      addedToCart: 'Товар добавлен в корзину',
      removedFromCart: 'Товар удалён из корзины',
      loginRequired: 'Сначала войдите в систему',
      receiptUploaded: 'Ваш платёж проверяется. Пожалуйста, дождитесь подтверждения администратора.',
    },
  },
  en: {
    brand: 'MaxSeller',
    slogan: 'Digital products in one place!',
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      cart: 'Cart',
      orders: 'My orders',
      downloads: 'Downloads',
      favorites: 'Favorites',
      profile: 'Profile',
      login: 'Sign in',
      register: 'Sign up',
      logout: 'Sign out',
    },
    actions: {
      details: 'Details',
      addToCart: 'Add to cart',
      buyNow: 'Buy now',
      checkout: 'Checkout',
      continueShopping: 'Continue shopping',
      search: 'Search',
      retry: 'Try again',
      loading: 'Loading...',
      cancel: 'Cancel',
      save: 'Save',
    },
    labels: {
      price: 'Price',
      oldPrice: 'Old price',
      category: 'Category',
      rating: 'Rating',
      reviews: 'Reviews',
      inCart: 'In cart',
      empty: 'No data yet',
      error: 'Failed to load data',
    },
    messages: {
      addedToCart: 'Product added to cart',
      removedFromCart: 'Product removed from cart',
      loginRequired: 'Please sign in first',
      receiptUploaded: 'Your payment is under review. Please wait for admin confirmation.',
    },
  },
} as const

export type Locale = keyof typeof dictionaries
export type Dictionary = (typeof dictionaries)['uz']

export function getDictionary(locale: Locale = 'uz'): Dictionary {
  return dictionaries[locale] as Dictionary
}

export const t = getDictionary('uz')
