# KursTopAI — React + Node.js (tuzatilgan MVP)

KursTopAI — O‘zbekiston bo‘yicha ta’lim kurslarini topish va joylashtirish uchun React interfeysli MVP. Frontend React/Vite’da, API esa Node.js standart kutubxonalari bilan ishlaydi. Server uchun qo‘shimcha npm runtime paketi kerak emas; React interfeysini yig‘ish uchun Vite va React paketlari o‘rnatiladi.

> **Holat:** asosiy hisoblar, rollar, kurs moderatsiyasi, ota-ona bog‘lash kodi va tarif oqimlari HTTP API testlari bilan tekshirildi. Bu hali katta ommaviy platformaga tayyor production relizi emas. Payme/Click, generativ AI va video hosting hali ulanmagan.

## 1. Kerakli dasturlar

- Node.js 22.12 yoki undan yangi versiya
- Visual Studio Code
- React/Vite paketlarini o‘rnatish uchun internet

## 2. Windows’da ishga tushirish

1. ZIP arxivni **Extract All / Извлечь все** orqali chiqaring.
2. VS Code → **File → Open Folder** → `KursTopAI_React` papkasini tanlang.
3. VS Code terminalida bir marta:

```bash
npm install
```

4. Keyin `ISHGA_TUSHIRISH.bat` faylini ikki marta bosing. Yoki terminalda ikkita alohida oynadan foydalaning:

```bash
npm run server
```

Ikkinchi terminal:

```bash
npm run dev
```

5. Brauzerda `http://localhost:5173` ni oching.
6. API holatini tekshirish manzili: `http://localhost:4000/api/health`.

Agar `npm install` xato bersa, internet aloqasini va Node versiyasini tekshiring (`node -v`).

## 3. Administrator kirishi

Yangi, toza ma’lumotlar bazasida boshlang‘ich kirish:

- Email: `admin@kurstopai.uz`
- Parol: `ChangeMe123!`

Bu parol faqat birinchi lokal sinov uchun. `.env.example` ni `.env` deb nusxalagan bo‘lsangiz ham undagi lokal parol shu qiymat. Darhol kuchli parolga almashtiring. Agar eski `data/kurstopai.json` bazasida administrator paroli avval o‘zgartirilgan yoki noma’lum bo‘lsa, `.env` qiymatini o‘zgartirish mavjud parolni almashtirmaydi.

**Eski admin parolini tiklash:** avval ishlayotgan server oynasini to‘xtating (`Ctrl + C`), loyiha papkasida terminaldan bajaring:

```bash
npm run admin:reset -- admin@kurstopai.uz YangiKuchliParol12+
```

`YangiKuchliParol12+` o‘rniga o‘zingiz tanlagan, kamida 12 belgili parolni yozing. Keyin serverni qayta ishga tushiring. Bu buyruq admin akkauntini qayta sozlaydi; boshqa foydalanuvchi ma’lumotlarini o‘chirmaydi.

## 4. Rollar va ishlash tartibi

### O‘quvchi

- Bepul ro‘yxatdan o‘tadi.
- Kabinetida ota-onaga berish uchun **`KT-` + 10 belgili kod** ko‘rinadi.
- Kodni nusxalashi yoki yangisini yaratishi mumkin. Yangi kod yaratilsa, avvalgi kod darhol bekor bo‘ladi.
- Kurs qidiradi, sevimlilarga qo‘shadi, kursga yozilish so‘rovi yuboradi.
- Faqat kursga qabul qilingandan keyin baho va izoh qoldiradi.

### Ota-ona

1. Ro‘yxatdan o‘tishda **Ota-ona** rolini tanlaydi.
2. Ota-ona kabinetiga kirib, farzandining o‘quvchi kabinetidagi `KT-XXXXXXXXXX` kodini kiritadi.
3. Farzandining kurslari, yozilish holati, jadvali, davomat, o‘qituvchi izohlari, to‘lov holati va bildirishnomalarini ko‘radi.

Kod maxfiy hisoblanadi. Uni faqat farzand ishonadigan ota-onaga berishi kerak.

### O‘quv markazi / mustaqil o‘qituvchi / repetitor

1. Ro‘yxatdan o‘tishda tegishli rolni tanlaydi.
2. Telefon, faoliyat nomi, hujjat raqami va PDF/JPG/PNG tasdiqlovchi hujjatini yuboradi.
3. Ro‘yxatdan o‘tgach o‘z kabinetiga kiradi; hujjat administrator tomonidan tekshiriladi.
4. Tasdiqlangach START, BUSINESS yoki PREMIUM tarifini so‘raydi.
5. Tarif bo‘yicha administrator kiritgan to‘lov ko‘rsatmasini ko‘radi, bank o‘tkazmasini amalga oshirgach tranzaksiya ma’lumotini yuboradi.
6. Administrator bank tushumini tashqi bank ilovasi yoki hisobidan **qo‘lda** tekshiradi va tarifni faollashtiradi.
7. Faol tarif va kurs limiti doirasida dars/kurs joylaydi. Yangi e’lon administrator moderatsiyasidan so‘ng ommaviy katalogda ko‘rinadi.

Kurs joylashda: nom, fan, viloyat, tuman/shahar, online/offline format, narx, jadval kiritiladi. Offline yoki aralash kurs uchun manzil, online yoki aralash kurs uchun haqiqiy dars URL manzili majburiy.

## 5. Administrator paneli

Administrator quyidagilarni bajaradi:

- Hamkor hujjatlarini ko‘radi va arizani tasdiqlaydi/rad etadi.
- Kurs e’lonini moderatsiya qiladi.
- Tranzaksiya raqami yuborilgan obuna so‘rovini tekshiradi va faollashtiradi/rad etadi.
- START/BUSINESS/PREMIUM narxi, kurs limiti va faol holatini boshqaradi.
- Tarif to‘lovi bo‘yicha bank rekvizitlari/yo‘riqnomani o‘z kabinetidan tahrirlaydi.
- O‘quvchi to‘lovlari reyestrini ko‘radi.

Administrator login qila olmasa, yuqoridagi `admin:reset` buyrug‘idan foydalaning. Yangi bazada standart parol ishlaydi, mavjud bazada esa faqat reset buyrug‘i parolni aniq yangilaydi.

## 6. Tarif va to‘lovlar — muhim farq

- O‘quvchi va ota-ona uchun platformadan foydalanish bepul.
- Hamkor tariflari START/BUSINESS/PREMIUM. Narx va kurs limiti administrator tomonidan boshqariladi.
- Tarif uchun hozircha **qo‘lda bank o‘tkazmasi + tranzaksiya raqamini yuborish + administratorning qo‘lda tekshiruvi** ishlaydi. Tranzaksiya raqami yuborilishi o‘z-o‘zidan pul tushganini tasdiqlamaydi.
- O‘quvchi markazga bevosita to‘lasa, KursTopAI komissiyasi **0%**. Markaz pulni haqiqatan olgach, qabul qilingan o‘quvchi to‘lovini kabinetda tasdiqlaydi.
- **Payme/Click orqali platforma ichida haqiqiy to‘lov hozircha o‘chirilgan.** Bunday tanlov API’da rad etiladi; soxta `pending` to‘lov yozuvi yaratilmaydi.
- 3% komissiya faqat keyinchalik Payme/Click kabi platforma to‘lov provayderi to‘liq ulanib, webhook imzosi serverda tekshirilgandan keyin qo‘llanishi mumkin. Hozir pul yechish, komissiya ushlab qolish, avtomatik payout yoki refund ishlamaydi.

Haqiqiy to‘lov uchun merchant shartnomasi, test/prod kalitlari, imzolangan webhook, idempotency, refund/payout oqimlari va provayder sinovlari talab etiladi.

## 7. Tekshirilgan xatolar va tuzatishlar

- O‘quvchi dashboard’iga ota-ona kodini yangilash funksiyasi React prop sifatida uzatildi.
- Yangi va avvalgi student akkauntlar uchun `KT-` formatidagi unikal kod yaratiladi; kod login, `/api/me` va kabinetda ko‘rinadi.
- Provider ro‘yxatdan o‘tgach darhol kutish holatidagi kabinetga kira oladi.
- Administratorning eski parolini tiklash komandasi qo‘shildi.
- Tarif tanlash o‘chirilgan START tarifi bilan qotib qolmaydi; faol tariflar ro‘yxatidan tanlanadi.
- Bir vaqtning o‘zida takroriy tarif so‘rovlari bloklanadi; to‘lov ma’lumoti yuborilmagan tarifni admin faollashtira olmaydi.
- Admin bank rekvizitlari/yo‘riqnomasini paneldan saqlay oladi.
- Kurs joylash serverda ham tarif limiti bilan tekshiriladi; bo‘sh yoki kasr narx, noto‘g‘ri obuna davri va to‘lov usuli rad etiladi. Offline manzil va online HTTPS havola talab qilinadi; HTTP havolalar rad etiladi.
- Kurs narxi 0 bo‘lsa, u bepul yozilish sifatida belgilanadi; soxta pullik to‘lov yaratmaydi. Pullik kursda materiallar va online dars havolasi faqat hamkor yozilishni qabul qilib, to‘lovni tasdiqlagach ochiladi. Bepul kurs materiallari qabul qilingach ochiladi.
- Production rejimida standart admin paroli ham rad etiladi; 12 belgidan uzun, alohida kuchli parol talab qilinadi.
- Namuna kurslarga haqiqiy yozilish bloklangan.
- Platforma to‘lovi ulanmagani uchun hozircha bloklangan; bevosita to‘lovda komissiya 0%.
- Markaz o‘quvchini avval qabul qilmasdan to‘lovni tasdiqlay olmaydi; to‘lovni ikki marta tasdiqlash bloklanadi.
- Bir o‘quvchi/kurs yozilishini takrorlash, yaroqsiz baho, asossiz xabar va admin bo‘lmagan foydalanuvchining admin amaliga kirishi bloklanadi.
- Bir kunlik davomat takroriy qator bo‘lib ketmasdan o‘sha yozuv yangilanadi.
- Ota-ona to‘lov reyestrida kurs nomini ham ko‘radi.

## 8. Ma’lumotlarni saqlash

- JSON baza: `data/kurstopai.json`.
- Hamkor hujjatlari: `data/uploads/private/`.
- `.gitignore` `data/`, `.env`, maxfiy upload va `node_modules` papkasini repozitoriyga qo‘shmaydi.

Lokal sinov uchun JSON yetarli. Bir nechta server/ko‘p foydalanuvchi yuklamasi uchun PostgreSQL va migratsiya tizimiga o‘tish kerak.

## 9. Sozlamalar

`.env.example` — namuna. Lokal ishga tushirishda uni `.env` qilib nusxalash shart emas. Ishlab chiqarish serverida quyidagi qiymatlarni hosting muhit o‘zgaruvchilarida kiriting:

- `NODE_ENV=production`
- `KURSTOPAI_ADMIN_EMAIL`
- `KURSTOPAI_ADMIN_PASSWORD` (kuchli)
- `KURSTOPAI_SESSION_SECRET` (uzun tasodifiy sir)
- `KURSTOPAI_SUBSCRIPTION_PAYMENT_INSTRUCTIONS`
- `KURSTOPAI_DATA_DIR` (doimiy disk manzili)

Production rejimida standart session secret bilan server ishga tushmaydi. HTTPS va doimiy disk talab qilinadi.

## 10. Ishlab chiqarish serveriga chiqarishdan oldin

Bu loyiha MVP. Ommaviy xizmatga chiqarishdan avval PostgreSQL, HTTPS, CSRF himoyasi, kuchli session secret, audit log, backup, hujjat virus tekshiruvi/private object storage, rasmiy Payme/Click, SMS/push, generativ AI, video saqlash/streaming, privacy/rozilik jarayoni, yuklama va mustaqil xavfsizlik auditini yakunlang.

## 11. Hozircha demo bo‘lgan imkoniyatlar

- AI yordamchi katalogdagi kurslarni kalit so‘z bilan topadi; generativ AI modeli ulanmagan.
- 8 ta namuna kurs dizayn/qidiruvni ko‘rsatadi; ular haqiqiy markazlardan emas va ularga yozilish mumkin emas.
- Online dars uchun tashqi Zoom/Google Meet/Telegram havolasi saqlanadi; platforma ichki video hostingi va live streaming yo‘q.
- Kurs materiallari tashqi `https://` URL ko‘rinishida biriktiriladi; ichki fayl ombori/LMS to‘liq yaratilmagan.

## 12. Render'ga joylash

Render uchun Blueprint konfiguratsiyasi loyiha ildizidagi `render.yaml` faylida. To‘liq o‘zbekcha ko‘rsatma: [`RENDERGA_YUKLASH.md`](./RENDERGA_YUKLASH.md).

Qisqa tartib: loyihani GitHub Private repository'ga yuboring → Render Dashboard'da **New + → Blueprint** → repository'ni ulang → `KURSTOPAI_ADMIN_PASSWORD` uchun yangi kuchli parol kiriting → xarajatlarni tekshirib **Deploy Blueprint** ni bosing.

`render.yaml` Frankfurt region, Node 24.22.1, build/start buyruqlari, `/api/health` va `/var/data` doimiy diskini sozlaydi. Doimiy disk Render'da pullik Web Service talab qiladi; bepul rejada lokal fayllar deploy/restartdan keyin saqlanmasligi mumkin. Katta trafik uchun PostgreSQL'ga migratsiya zarur.
