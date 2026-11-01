# KursTopAI — Render'ga joylash bo‘yicha qo‘llanma

Ushbu loyiha Render uchun tayyorlangan. `render.yaml` web servisni, build/start buyruqlarini, health-check, maxfiy muhit o‘zgaruvchilarini va doimiy diskni oldindan sozlaydi.

## Muhim: ma'lumotlar saqlanishi

- KursTopAI hozircha ma'lumotlarni JSON faylida saqlaydi.
- Render uchun `KURSTOPAI_DATA_DIR=/var/data` va `KURSTOPAI_UPLOAD_DIR=/var/data/uploads/private` sozlangan.
- `render.yaml` `/var/data` manziliga 1 GB doimiy disk ulaydi. Baza va hujjatlar shu diskka yoziladi.
- Render doimiy diskini faqat pullik Web Service'ga ulash mumkin. Shuning uchun Blueprint'dagi `plan: 0.5c-512mb` — pullik eng kichik compute rejasi. Render narxni deploydan oldin Dashboard'da ko‘rsatadi.
- Doimiy disk bitta servis nusxasiga bog‘lanadi; ushbu JSON-baza MVP uchun bir nusxada ishlashi kerak. Katta yuklama va ko‘p serverga kengayishdan oldin PostgreSQL'ga migratsiya qilish lozim.

## 1. ZIPni chiqarish

1. `KursTopAI_Render_Paket.zip` faylini yuklab oling.
2. Windows'da ZIP ustiga o‘ng tugma → **Extract All / Извлечь все**.
3. `KursTopAI_React_Render` papkasini oching.
4. `render.yaml` aynan shu papkaning ichida, `package.json` bilan bir qatorda turishini tekshiring.

## 2. GitHub'ga yuborish

Render Blueprint kodni GitHub/GitLab repozitoriyasidan oladi. ZIP faylning o‘zini Render'ga bevosita joylab bo‘lmaydi.

### Git orqali (tavsiya etiladi)

1. GitHub'da yangi **Private** repository yarating (masalan, `kurstopai`).
2. Kompyuteringizda `KursTopAI_React_Render` papkasini VS Code'da oching.
3. VS Code → **Terminal → New Terminal** ni tanlang.
4. Quyidagi buyruqlarni birma-bir bajaring. Oxirgi buyruqdagi `USERNAME` va `REPO` o‘rniga GitHub ma'lumotlaringizni yozing:

```bash
git init
git add .
git commit -m "KursTopAI Render deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Agar `git` buyrug‘i topilmasa, Git for Windows o‘rnatish kerak. `.env`, `data/`, `node_modules/` va maxfiy hujjatlar `.gitignore` orqali repozitoriyga kiritilmaydi.

## 3. Render'da Blueprint deploy qilish

1. [Render Dashboard](https://dashboard.render.com/) ga kiring.
2. **New + → Blueprint** ni tanlang.
3. GitHub akkauntingizni ulang va `kurstopai` repository uchun **Connect** ni bosing.
4. Blueprint nomini tekshiring, branch `main` bo‘lsin, Blueprint path `render.yaml` bo‘lib qolsin.
5. Render `KURSTOPAI_ADMIN_PASSWORD` uchun maxfiy qiymat so‘raydi. Kamida 12 belgili, taxmin qilib bo‘lmaydigan yangi parol kiriting. Bu parolni hech kimga yubormang.
6. Rejalar ro‘yxatida pullik `0.5c-512mb` web service va 1 GB doimiy disk ko‘rsatilishini tekshiring. Narxni ko‘rib, ma'qullaganingizdan keyingina deploy qiling.
7. **Deploy Blueprint / Apply** tugmasini bosing.

Render Blueprint `KURSTOPAI_SESSION_SECRET` qiymatini o‘zi tasodifiy yaratadi. Uni qo‘lda yozish shart emas.

## 4. Deploy yakunlangach

Render web service sahifasining yuqori qismida `https://....onrender.com` ko‘rinishidagi manzil beradi. Shu manzil — KursTopAI saytingiz.

Tekshiruv uchun URL oxiriga `/api/health` qo‘shing. Masalan:

```text
https://SIZNING-SAYTINGIZ.onrender.com/api/health
```

Javobda `"ok": true` chiqishi kerak.

Administrator kirishi:

- Email: `admin@kurstopai.uz`
- Parol: Blueprint yaratishda `KURSTOPAI_ADMIN_PASSWORD` uchun kiritgan parolingiz.

## 5. Keyinchalik kodni yangilash

Kompyuteringizda o‘zgarish kiritganingizdan keyin:

```bash
git add .
git commit -m "KursTopAI update"
git push
```

`autoDeployTrigger: commit` sabab Render yangi commitni avtomatik deploy qiladi.

## 6. Muammolarni tekshirish

- **Build failed:** Render Dashboard → servis → **Events / Logs** bo‘limidagi birinchi qizil xato satrini tekshiring. `npm install` va `npm run build` bajarilishi kerak.
- **Health check failed:** servis `0.0.0.0` da Render bergan `PORT` ni tinglaydi; `render.yaml` PORT=10000 qilib belgilaydi. `/api/health` ishlashi kerak.
- **Sayt ochiladi, lekin baza saqlanmaydi:** Render servisining **Disks** bo‘limida `/var/data` mount qilinganini tekshiring. Pullik reja kerak.
- **Admin login ishlamaydi:** deploy vaqtida `KURSTOPAI_ADMIN_PASSWORD` ga kiritilgan paroldan foydalaning. Eski baza bo‘lsa, admin email avval mavjud bo‘lishi mumkin; parolni tiklashni servis Shell'da ehtiyotkorlik bilan bajaring yoki Render Environment'da parolni yangilab, ma'lumotlar ko‘chirilmasdan turib bazani o‘chirib yubormang.
- **Deploy bo‘ldi, lekin UI xato:** Render Logs'dagi xabarni nusxalab saqlang; admin paroli, session secret yoki shaxsiy hujjatlarni yubormang.

## 7. Hozircha production cheklovlari

Bu — internetga chiqarish uchun sozlangan MVP. Payme/Click haqiqiy merchant API, SMS, generativ AI, ichki video hosting va PostgreSQL migratsiyasi hali alohida bajarilishi kerak. Hozirgi 3% komissiya faqat konsept/ma'lumot sifatida; karta orqali real pul qabul qilinmaydi. Haqiqiy o‘quvchilar hujjatlarini yig‘ishni xavfsizlik auditi, maxfiylik siyosati va tegishli rozilik jarayonlari tayyor bo‘lmaguncha boshlamang.
