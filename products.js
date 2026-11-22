/* =========================================================
   MAHSULOTLAR RO'YXATI — shu fayldan tahrirlang
   Har bir mahsulot:
   { id, cat, title, desc, price, tag }
   cat: "web" | "design" | "docs" | "video"
   price: so'mda (raqam). 0 bo'lsa "Narxini so'rang" chiqadi.
   tag: ixtiyoriy yorliq ("Yangi", "Hit", "")
   ========================================================= */
window.MAXSELLER_CONFIG = {
  brand: "MaxSeller",
  telegramChannel: "maxseller_uz",   // Telegram kanal
  instagram: "maxseller_uz",         // Instagram
  orderUsername: "maxseller_uz",     // Buyurtma shu akkauntga boradi (admin username'ini yozing)
  currency: "so'm"
};

window.MAXSELLER_CATEGORIES = [
  { id: "all",    name: "Hammasi" },
  { id: "web",    name: "Veb-saytlar va Landing Page" },
  { id: "design", name: "Dizayn shablonlar" },
  { id: "docs",   name: "Ilmiy ishlar va materiallar" },
  { id: "video",  name: "Video darsliklar" }
];

window.MAXSELLER_PRODUCTS = [
  { id: 1,  cat: "web",    title: "Biznes landing page",         desc: "Tayyor HTML/CSS/JS landing. Mobilga moslashgan, tez yuklanadi, matnlarni o'zgartirish oson.", price: 150000, tag: "Hit" },
  { id: 2,  cat: "web",    title: "Onlayn do'kon shabloni",      desc: "Katalog, savat va Telegram orqali buyurtma qabul qilish bilan tayyor do'kon sayti.",           price: 350000, tag: "Yangi" },
  { id: 3,  cat: "web",    title: "Portfolio sayt",              desc: "Dasturchi va dizaynerlar uchun shaxsiy portfolio. Qorong'i va yorug' rejim.",                  price: 120000, tag: "" },
  { id: 4,  cat: "design", title: "Instagram post shablonlari",  desc: "30 ta tahrirlanadigan post va story shabloni. Figma va Canva uchun.",                          price: 60000,  tag: "Hit" },
  { id: 5,  cat: "design", title: "Logotip va brend to'plami",   desc: "Logotip, ranglar, shriftlar va vizitka maketlari bitta to'plamda.",                            price: 99000,  tag: "" },
  { id: 6,  cat: "design", title: "UI Kit: mobil ilova",         desc: "120+ ekran va komponentlar. Figma fayli, tayyor Auto Layout.",                                  price: 180000, tag: "Yangi" },
  { id: 7,  cat: "docs",   title: "Referat va taqdimot to'plami",desc: "Tayyor tuzilma, andoza va namunalar. O'zingizning mavzuingizga moslab oling.",                  price: 40000,  tag: "" },
  { id: 8,  cat: "docs",   title: "Kurs ishi andozalari",        desc: "Titul varaq, mundarija, adabiyotlar ro'yxati — GOST bo'yicha formatlangan Word fayllar.",       price: 35000,  tag: "" },
  { id: 9,  cat: "docs",   title: "Ilmiy maqola yozish qo'llanmasi", desc: "Maqolani boshidan oxirigacha yozish, rasmiylashtirish va jurnalga topshirish bo'yicha PDF.",price: 55000,  tag: "" },
  { id: 10, cat: "video",  title: "Noldan veb-dasturlash",       desc: "HTML, CSS va JavaScript bo'yicha amaliy video darslar, har dars uchun kod fayllari bilan.",    price: 200000, tag: "Hit" },
  { id: 11, cat: "video",  title: "Figma darslari",              desc: "Interfeys dizaynini noldan o'rganish: komponentlar, grid, prototip.",                           price: 140000, tag: "" },
  { id: 12, cat: "video",  title: "Telegram bot yaratish",       desc: "Bot yaratish va serverga joylash bo'yicha video kurs va tayyor kodlar.",                        price: 0,      tag: "Yangi" }
];
