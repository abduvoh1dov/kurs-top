# KursTopAI React — tuzatishlar (2026-11-01)

## Siz ko‘rsatgan asosiy kamchiliklar

1. **Admin paneliga kirish:** yangi bazada admin kirish rekvizitlari qayta tekshirildi; eski bazadagi parol boshqa bo‘lsa, `npm run admin:reset -- admin@kurstopai.uz YangiKuchliParol12+` orqali to‘xtatilgan serverda yangilash mumkin. Default login: `admin@kurstopai.uz` / `ChangeMe123!` (faqat yangi lokal baza uchun).
2. **Ota-ona nazorati kodi:** talaba ro‘yxatdan o‘tganda `KT-` + 10 belgili kod oladi. Kod login, `/api/me` va kabinetda qaytadi. O‘quvchi uni yangilashi mumkin. Eski bazalarga migratsiya qo‘shilgan. Kodni taxmin qilishga qarshi 10 xato urinish/15 daqiqalik cheklov qo‘shilgan.
3. **Kurs joylash va tarif:** hamkor avval hujjat tasdig‘idan, so‘ng obuna to‘lovi administrator tekshiruvidan o‘tadi. Faol obuna bo‘lmasa kurs joylash bloklanadi. Kurs limiti backend’da tekshiriladi. Kurs moderatsiyasi va obuna muddati ham ko‘rib chiqiladi.
4. **Tarif to‘lovi:** hamkor kabinetida bank ko‘rsatmasi, tranzaksiya raqami va izoh yuborish bor. Rekvizitni admin paneldan tahrirlash mumkin. Admin bank tushumini tashqi bank hisobidan o‘zi tekshiradi, shundan keyingina tarif faollashtiradi.
5. **Kursga to‘lov:** bevosita markazga to‘lovda platforma komissiyasi 0%. Payme/Click hali ulanmagani uchun platforma to‘lovi rad etiladi va soxta to‘lov yozuvi yaratilmaydi. 3% faqat real provayder integratsiyasi bajarilgandan keyin ushlab qolinishi mumkin.

## Qo‘shimcha topilgan va tuzatilgan holatlar

- Student dashboard ota-ona kodini yangilash callback’i bilan to‘g‘ri bog‘landi.
- Hamkor ro‘yxatdan o‘tgach kutish holatidagi kabinetiga darhol kiradi. Rad etilgan hamkor ham qayta login qilib administrator izohini ko‘ra oladi; rad etilgan akkauntga kurs joylash yoki tarif faollashtirish ruxsat berilmaydi. Faoliyat nomi, telefon, hujjat raqami va PDF/JPG/PNG fayli talab qilinadi; fayl sarlavhasi tekshiriladi va maxfiy papkada saqlanadi.
- Admin eski parolni almashtirishi uchun reset komandasi qo‘shildi. Production rejimi standart session secret yoki standart admin paroli bilan ishga tushmaydi.
- Tarif narxlari 0 dan katta butun son, kurs limiti 1–10000 oraliqda bo‘lishi shart.
- Takroriy tarif so‘rovi, to‘lovdan oldingi tarif faollashtirish, tarif limiti oshgan kurs joylash bloklanadi.
- Kurs narxi faqat butun so‘m bo‘lishi kerak; offline kursga manzil, online kursga HTTPS havola kerak.
- Bepul kurs `free` to‘lovi sifatida saqlanadi; pullik to‘lovni soxta tasdiqlash yaratmaydi.
- Pullik kursning materiallari va online havolasi faqat hamkor qabul qilib, pul kelganini tasdiqlagach studentga ochiladi. Bepul kurs materiallari qabuldan keyin ochiladi.
- Hamkor o‘quvchini qabul qilmasdan to‘lovni tasdiqlay olmaydi; takroriy tasdiq bloklanadi.
- Davomat sanasi haqiqiy kalendar sana bo‘lishi kerak; bir kunda qayta saqlash yangi dublikat o‘rniga mavjud yozuvni yangilaydi.
- Baho faqat qabul qilingan va to‘lovi tasdiqlangan o‘quvchidan olinadi; qiymat 1–5 butun son.
- Xabar yuborish kurs aloqasi bilan cheklanadi; asossiz uchinchi tomonga xabar berish bloklanadi.
- Ota-ona kabinetida kurs nomi bilan to‘lov holati ko‘rinadi.

## Sinov natijalari

Toza test bazasida 90 ta asosiy HTTP API tekshiruvi va obuna tugashi/yangilanishi bo‘yicha 8 ta qo‘shimcha HTTP tekshiruvi bajarildi: admin login va rol himoyasi, o‘quvchi/ota-ona ro‘yxati, kod yaratish/yangilash/bog‘lash, kod bruteforce cheklovi, hamkor hujjat tasdig‘i, tarif so‘rovi va to‘lovi, tarif limiti, kurs yaratish va moderatsiya, to‘lov yo‘llari, materiallarga ruxsat, bepul kurs, ota-ona ma’lumotlari, davomat, reyting, xabar ruxsatlari. Sinovlar o‘tdi.

`node --check server/index.cjs` va TypeScript JSX transpile sintaksis tekshiruvi xatosiz o‘tdi. Bu muhitda npm paketlarini internetdan o‘rnatish yakunlanmagani sababli Vite production build to‘liq bajarilmadi; `npm install` muvaffaqiyatli tugagan kompyuterda `npm run build` bilan yakuniy bundle quriladi.

## Hali tashqi xizmat talab qiladigan imkoniyatlar

- Payme/Click: merchant shartnomasi, API kalitlari, imzolangan webhook, refund/payout oqimi talab etiladi. Hozir platforma orqali haqiqiy pul olinmaydi.
- Generativ AI: model API kaliti va limit nazorati kerak; mavjud funksiya katalog asosidagi kalit-so‘zli tavsiya demo.
- Video hosting/live: video saqlash, transkodlash, private streaming va trafik infratuzilmasi kerak.
- JSON saqlash kichik MVP uchun; ommaviy relizdan oldin PostgreSQL, backup, monitoring va xavfsizlik auditi kerak.
