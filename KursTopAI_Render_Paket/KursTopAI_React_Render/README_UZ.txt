KURSTOPAI — REACT + NODE.JS (TUZATILGAN MVP)

ISHGA TUSHIRISH:
1. ZIP faylni arxivdan chiqaring.
2. Node.js 22.12+ o‘rnating.
3. VS Code’da KursTopAI_React papkasini oching.
4. Terminalda: npm install
5. ISHGA_TUSHIRISH.bat faylini bosing.
6. Brauzer: http://localhost:5173

ADMIN (faqat yangi/toza bazada):
Email: admin@kurstopai.uz
Parol: ChangeMe123!

ESKI ADMIN PAROLINI TIKLASH:
1. Ishlayotgan serverni Ctrl+C bilan to‘xtating.
2. Terminalda: npm run admin:reset -- admin@kurstopai.uz YangiKuchliParol12+
3. O‘zingiz tanlagan kamida 12 belgili kuchli parolni ishlating.
4. Serverni qayta ishga tushiring.

OTA-ONA KODI:
- O‘quvchi kabinetida KT- + 10 ta belgi ko‘rinishida chiqadi.
- O‘quvchi kodni nusxalab ota-onaga beradi.
- Ota-ona alohida akkaunt ochib, shu kodni kabinetida kiritadi.
- Yangi kod yaratilsa, eski kod bekor bo‘ladi.

HAMKOR / TARIF / KURS:
- Markaz, o‘qituvchi va repetitor hujjat yuboradi.
- Admin hujjatni tasdiqlaydi.
- Hamkor tarif tanlaydi, bank o‘tkazmasi rekvizitlarini ko‘radi, chek raqamini kiritadi.
- Admin bank tushumini tashqi manbada tekshirib tarifni faollashtiradi.
- Faol tarif limitida kurs joylanadi; admin kursni ham tasdiqlaydi.

TO‘LOV:
- Markazga bevosita to‘lov: 0% platforma komissiyasi.
- Payme/Click platforma to‘lovi hozircha ulanmagan va API orqali bloklangan.
- 3% komissiya real provider/webhook ulanmaguncha olinmaydi.
- Tarif uchun bank o‘tkazmasi hozircha qo‘lda tekshiriladi.

MUHIM:
- AI generativ model emas, katalog bo‘yicha demo tavsiya.
- Ichki video hosting yo‘q; tashqi dars havolalari ishlatiladi.
- Ma’lumotlar data/kurstopai.json ichida saqlanadi.
- Ommaviy ishga tushirishdan oldin PostgreSQL, HTTPS, kuchli parol/secret, backup va xavfsizlik auditi kerak.
Batafsil: README.md


YANGI TUZATISHLAR
- Ota-ona kodi uchun xato urinishlarni cheklash qo‘shildi. 10 marta xato urinishdan keyin 15 daqiqa kutish kerak.
- Hamkor ro‘yxatdan o‘tishida faoliyat nomi ham talab qilinadi.
- Pullik kurs materiallari va online havolalar faqat qabul + to‘lov tasdig‘idan keyin ochiladi. Bepul kursda materiallar qabul qilingandan keyin ochiladi.
- Bepul kurs “free” sifatida saqlanadi, undan soxta pul tasdig‘i yaratilmaydi.
- Noto‘g‘ri HTTP dars/material havolalari rad etiladi; faqat HTTPS qabul qilinadi.
- Production rejimida ChangeMe123! standart paroli bilan ishga tushirish bloklanadi.
- Kurs kartasida bepul narx va fikr qoldirishga ruxsat bor-yo‘qligi aniq ko‘rsatiladi.
- Rad etilgan hamkor ham qayta login qilib administrator izohini ko‘ra oladi; rad etilgan akkauntga kurs joylash yoki tarif faollashtirish ruxsat berilmaydi.

RENDERGA INTERNETGA JOYLASH:
1) Loyiha ildizidagi render.yaml Render Blueprint sozlamasi.
2) To‘liq ko‘rsatmani RENDERGA_YUKLASH.md faylidan o‘qing.
3) Loyihani GitHub Private repository'ga yuboring.
4) Render Dashboard > New + > Blueprint orqali repository'ni ulang.
5) KURSTOPAI_ADMIN_PASSWORD uchun yangi, kamida 12 belgili parol kiriting.
6) Render ko‘rsatgan narxni tekshirib Deploy Blueprint bosing.

ESLATMA: Ma'lumotlar bazasi va yuklangan hujjatlar /var/data doimiy diskiga yoziladi. Render doimiy disk uchun pullik Web Service talab qiladi. Bepul rejada ma'lumotlar yo‘qolishi mumkin.
