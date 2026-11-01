/* KursTopAI API server — Node.js built-ins only (no runtime npm dependencies). */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

// Minimal .env reader so the project does not need dotenv as a runtime dependency.
const ENV_FILE = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.KURSTOPAI_DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.KURSTOPAI_UPLOAD_DIR || path.join(DATA_DIR, 'uploads', 'private');
const DB_FILE = path.join(DATA_DIR, 'kurstopai.json');
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_SECRET = process.env.KURSTOPAI_SESSION_SECRET || 'local-development-secret-change-before-production-2026';
const ADMIN_EMAIL = String(process.env.KURSTOPAI_ADMIN_EMAIL || 'admin@kurstopai.uz').toLowerCase();
const ADMIN_PASSWORD = process.env.KURSTOPAI_ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_PASSWORD_CONFIGURED = Boolean(process.env.KURSTOPAI_ADMIN_PASSWORD && !['KuchliYangiParolniBuYergaYozing','ChangeMe123!'].includes(process.env.KURSTOPAI_ADMIN_PASSWORD) && process.env.KURSTOPAI_ADMIN_PASSWORD.length >= 12);
const IS_PROD = process.env.NODE_ENV === 'production';
const SUBSCRIPTION_PAYMENT_INSTRUCTIONS = String(process.env.KURSTOPAI_SUBSCRIPTION_PAYMENT_INSTRUCTIONS || 'To‘lov rekvizitlari administrator tomonidan beriladi. Rekvizitlarni olmaguningizcha pul o‘tkazmang.').trim();
const MAX_BODY = 8 * 1024 * 1024;

const nowISO = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const normalizeEmail = (v) => clean(v, 190).toLowerCase();
const safeWebUrl = (v) => { const value=clean(v,500); if(!value) return ''; try { const u=new URL(value); return u.protocol === 'https:' ? u.toString() : ''; } catch { return ''; } };
const safeUser = (u) => {
  if (!u) return null;
  const { passwordHash, passwordSalt, childCode, ...rest } = u;
  return rest;
};
const makeChildCode = () => `KT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const safeAuthUser = (u) => ({ ...safeUser(u), ...(u?.role === 'student' ? { childCode: u.childCode } : {}) });
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  hash: crypto.scryptSync(String(password), salt, 64).toString('hex'),
});
const verifyPassword = (password, user) => {
  try {
    const actual = crypto.scryptSync(String(password), user.passwordSalt, 64);
    const expected = Buffer.from(user.passwordHash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
};
const tokenSign = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
};
const tokenVerify = (token) => {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest();
  let actual;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
};
const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((v) => {
  const i = v.indexOf('=');
  return i < 0 ? [v.trim(), ''] : [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())];
}));
const cookieHeader = (token) => `kurstopai_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 3600}${IS_PROD ? '; Secure' : ''}`;

const seedCourses = [
  { id: 'sample-001', title: 'Python dasturlash: noldan amaliyotgacha', subject: 'Dasturlash', region: 'Toshkent shahri', district: 'Yunusobod', format: 'offline', price: 650000, currency: 'UZS', address: 'Yunusobod tumani, namuna manzil', teacher: 'Namuna o‘qituvchi', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.8, reviews: 12, description: 'Python asoslari, algoritmlar va kichik loyihalar. Bu katalogdagi namuna e’lon.', schedule: 'Dushanba, chorshanba, juma — 16:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: '', materials: [] },
  { id: 'sample-002', title: 'Ingliz tili — Beginner dan IELTS sari', subject: 'Ingliz tili', region: 'Farg‘ona viloyati', district: 'Farg‘ona shahri', format: 'offline', price: 450000, currency: 'UZS', address: 'Farg‘ona shahri, markaziy hudud', teacher: 'Namuna ustoz', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.9, reviews: 18, description: 'Grammatika, so‘zlashuv va imtihonga tayyorgarlik. Bu namuna kurs.', schedule: 'Seshanba, payshanba, shanba — 10:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: '', materials: [] },
  { id: 'sample-003', title: 'Matematika: maktab va imtihon tayyorgarligi', subject: 'Matematika', region: 'Namangan viloyati', district: 'Namangan shahri', format: 'online', price: 300000, currency: 'UZS', address: '', teacher: 'Namuna repetitor', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.7, reviews: 9, description: 'Masalalar yechish, mavzularni mustahkamlash va sinovlar.', schedule: 'Dushanba–juma — 19:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: 'https://meet.google.com/', materials: [] },
  { id: 'sample-004', title: 'Grafik dizayn va Figma', subject: 'Dizayn', region: 'Toshkent shahri', district: 'Chilonzor', format: 'online', price: 520000, currency: 'UZS', address: '', teacher: 'Namuna mentor', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.8, reviews: 7, description: 'UI dizayn, Figma va portfolio tayyorlash.', schedule: 'Shanba, yakshanba — 15:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: 'https://zoom.us/', materials: [] },
  { id: 'sample-005', title: 'Fizika: mexanika va elektr', subject: 'Fizika', region: 'Andijon viloyati', district: 'Andijon shahri', format: 'offline', price: 380000, currency: 'UZS', address: 'Andijon shahri, namuna manzil', teacher: 'Namuna o‘qituvchi', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.6, reviews: 5, description: 'Fizika fanidan nazariya va masalalar.', schedule: 'Dushanba, chorshanba — 14:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: '', materials: [] },
  { id: 'sample-006', title: 'Frontend: HTML, CSS va React', subject: 'Dasturlash', region: 'Samarqand viloyati', district: 'Samarqand shahri', format: 'online', price: 700000, currency: 'UZS', address: '', teacher: 'Namuna mentor', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 5, reviews: 11, description: 'Zamonaviy web interfeyslarni yaratish bo‘yicha namuna kurs.', schedule: 'Seshanba, payshanba — 20:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: 'https://meet.google.com/', materials: [] },
  { id: 'sample-007', title: 'Robototexnika va Arduino', subject: 'Robototexnika', region: 'Buxoro viloyati', district: 'Buxoro shahri', format: 'offline', price: 560000, currency: 'UZS', address: 'Buxoro shahri, namuna manzil', teacher: 'Namuna instruktor', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.8, reviews: 6, description: 'Elektronika, sensorlar va Arduino bilan ishlash.', schedule: 'Shanba — 11:00', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: '', materials: [] },
  { id: 'sample-008', title: 'Koreys tili — boshlang‘ich bosqich', subject: 'Koreys tili', region: 'Toshkent shahri', district: 'Mirzo Ulug‘bek', format: 'online', price: 410000, currency: 'UZS', address: '', teacher: 'Namuna ustoz', providerName: 'KursTopAI namunaviy markazi', providerId: null, rating: 4.7, reviews: 8, description: 'Hangul, kundalik iboralar va boshlang‘ich grammatika.', schedule: 'Dushanba, chorshanba, juma — 18:30', status: 'approved', isSample: true, createdAt: nowISO(), onlineUrl: 'https://telegram.org/', materials: [] },
];
const seedPlans = [
  { id: 'start', name: 'START', priceMonthly: 99000, priceYearly: 990000, courseLimit: 3, features: ['3 tagacha kurs', 'Asosiy statistika', 'Standart katalog ko‘rinishi'], active: true },
  { id: 'business', name: 'BUSINESS', priceMonthly: 249000, priceYearly: 2490000, courseLimit: 15, features: ['15 tagacha kurs', 'Kengaytirilgan statistika', 'Reklama imkoniyatlari'], active: true },
  { id: 'premium', name: 'PREMIUM', priceMonthly: 499000, priceYearly: 4990000, courseLimit: 100, features: ['100 tagacha kurs', 'Ustuvor ko‘rinish', 'To‘liq statistika va reklama'], active: true },
];
let db;
const loginFailures = new Map();
const parentLinkFailures = new Map();
function makeUniqueChildCode(exceptUserId = null) {
  const used = new Set((db?.users || []).filter((u) => u.role === 'student' && u.id !== exceptUserId).map((u) => u.childCode));
  let code = makeChildCode();
  while (used.has(code)) code = makeChildCode();
  return code;
}
function loginRateLimitKey(req, email) { return `${req.socket.remoteAddress || 'local'}|${email}`; }
async function initDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(await fsp.readFile(DB_FILE, 'utf8')); } catch { throw new Error(`Baza fayli o‘qilmadi: ${DB_FILE}`); }
  } else {
    db = { users: [], courses: seedCourses, enrollments: [], subscriptions: [], plans: seedPlans, favorites: [], reviews: [], attendance: [], messages: [], notifications: [], payments: [], settings: { platformCommission: 3 }, createdAt: nowISO() };
  }
  for (const key of ['users','courses','enrollments','subscriptions','plans','favorites','reviews','attendance','messages','notifications','payments']) if (!Array.isArray(db[key])) db[key] = [];
  if (!db.settings) db.settings = { platformCommission: 3 };
  if (typeof db.settings.subscriptionPaymentInstructions !== 'string' || !db.settings.subscriptionPaymentInstructions.trim()) db.settings.subscriptionPaymentInstructions = SUBSCRIPTION_PAYMENT_INSTRUCTIONS;
  for (const p of seedPlans) if (!db.plans.some((x) => x.id === p.id)) db.plans.push(p);
  if (!db.courses.length) db.courses = seedCourses;
  // Migrate legacy student accounts that were created before parent-link codes existed.
  const usedCodes = new Set();
  for (const student of db.users.filter((u) => u.role === 'student')) {
    let code = clean(student.childCode, 24).toUpperCase();
    if (!/^KT-[A-Z0-9]{8,12}$/.test(code) || usedCodes.has(code)) code = makeChildCode();
    while (usedCodes.has(code)) code = makeChildCode();
    student.childCode = code;
    student.childCodeCreatedAt ||= nowISO();
    usedCodes.add(code);
  }
  let admin = db.users.find((u) => u.role === 'admin' && u.email === ADMIN_EMAIL) || db.users.find((u) => u.role === 'admin');
  if (!admin) {
    const cred = hashPassword(ADMIN_PASSWORD);
    admin = { id: id(), fullName: 'KursTopAI administratori', email: ADMIN_EMAIL, phone: '', role: 'admin', status: 'approved', passwordSalt: cred.salt, passwordHash: cred.hash, createdAt: nowISO() };
    db.users.push(admin);
  } else if (admin.email !== ADMIN_EMAIL && !db.users.some((u) => u.id !== admin.id && u.email === ADMIN_EMAIL)) {
    // Keep old installations reachable when the configured admin email is unchanged/default.
    admin.email = ADMIN_EMAIL;
  }
  await saveDb();
}
let saveQueue = Promise.resolve();
function saveDb() {
  const snapshot = JSON.stringify(db, null, 2);
  saveQueue = saveQueue.then(async () => {
    const tmp = `${DB_FILE}.tmp`;
    await fsp.writeFile(tmp, snapshot, 'utf8');
    await fsp.rename(tmp, DB_FILE);
  });
  return saveQueue;
}
function notify(userId, title, body, type = 'info') {
  if (!userId) return;
  db.notifications.unshift({ id: id(), userId, title, body, type, read: false, createdAt: nowISO() });
  db.notifications = db.notifications.slice(0, 5000);
}
function activeSubscriptionFor(userId) {
  return db.subscriptions
    .filter((s) => s.userId === userId && s.status === 'active' && s.endsAt && new Date(s.endsAt).getTime() > Date.now())
    .sort((a, b) => String(b.startsAt || b.createdAt || '').localeCompare(String(a.startsAt || a.createdAt || '')))[0] || null;
}
function providerHasActivePlan(user) {
  return Boolean(user && user.status === 'approved' && activeSubscriptionFor(user.id));
}
function publicCourse(c) {
  if (c.isSample) return c.status === 'approved';
  const owner = db.users.find((u) => u.id === c.providerId);
  return c.status === 'approved' && providerHasActivePlan(owner);
}
function getUserFromReq(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const payload = tokenVerify(cookies.kurstopai_session);
  return payload ? db.users.find((u) => u.id === payload.uid) || null : null;
}
function requireUser(req, res) {
  const user = getUserFromReq(req);
  if (!user) { sendJson(res, 401, { error: 'Davom etish uchun tizimga kiring.' }); return null; }
  return user;
}
function requireRole(user, roles, res) {
  if (!roles.includes(user.role)) { sendJson(res, 403, { error: 'Bu amal uchun ruxsatingiz yo‘q.' }); return false; }
  return true;
}
function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; let size = 0;
    req.on('data', (chunk) => { size += chunk.length; if (size > MAX_BODY) { reject(Object.assign(new Error('So‘rov hajmi juda katta.'), { status: 413 })); req.destroy(); return; } data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(Object.assign(new Error('JSON ma’lumoti noto‘g‘ri.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function setSession(res, user) {
  const token = tokenSign({ uid: user.id, exp: Date.now() + 7 * 24 * 3600 * 1000 });
  res.setHeader('Set-Cookie', cookieHeader(token));
}
function clearSession(res) { res.setHeader('Set-Cookie', `kurstopai_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${IS_PROD ? '; Secure' : ''}`); }
function addMonths(date, months) {
  const d = new Date(date); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
function accountDashboard(user) {
  const notifications = db.notifications.filter((n) => n.userId === user.id).slice(0, 30);
  if (user.role === 'admin') {
    return {
      stats: { users: db.users.length, providersPending: db.users.filter((u) => ['center','teacher','tutor'].includes(u.role) && u.status === 'pending').length, coursesPending: db.courses.filter((c) => c.status === 'pending').length, subscriptionsPending: db.subscriptions.filter((s) => s.status === 'pending').length, enrollments: db.enrollments.length },
      pendingProviders: db.users.filter((u) => ['center','teacher','tutor'].includes(u.role) && u.status === 'pending').map(safeUser),
      pendingCourses: db.courses.filter((c) => c.status === 'pending'),
      pendingSubscriptions: db.subscriptions.filter((s) => s.status === 'pending').map((s) => ({ ...s, user: safeUser(db.users.find((u) => u.id === s.userId)), plan: db.plans.find((p) => p.id === s.planId) })),
      payments: db.payments.slice(0, 100).map((p) => { const enrollment = db.enrollments.find((e) => e.id === p.enrollmentId); return { ...p, student: safeUser(db.users.find((u) => u.id === p.studentId)), provider: safeUser(db.users.find((u) => u.id === p.providerId)), course: db.courses.find((c) => c.id === enrollment?.courseId) || null }; }),
      plans: db.plans, paymentInstructions: db.settings.subscriptionPaymentInstructions, users: db.users.map(safeUser).slice(-100), notifications,
    };
  }
  if (['center','teacher','tutor'].includes(user.role)) {
    const courses = db.courses.filter((c) => c.providerId === user.id);
    const courseIds = courses.map((c) => c.id);
    const enrollments = db.enrollments.filter((e) => courseIds.includes(e.courseId)).map((e) => ({ ...e, student: safeUser(db.users.find((u) => u.id === e.studentId)), course: courses.find((c) => c.id === e.courseId) }));
    const latestRawSubscription = db.subscriptions.filter((s) => s.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    const latestSubscription = latestRawSubscription && latestRawSubscription.status === 'active' && latestRawSubscription.endsAt && new Date(latestRawSubscription.endsAt).getTime() <= Date.now() ? { ...latestRawSubscription, status:'expired' } : latestRawSubscription;
    const activeSubscription = activeSubscriptionFor(user.id);
    const activePlanRecord = activeSubscription ? db.plans.find((p) => p.id === activeSubscription.planId) : null;
    const activePlan = activeSubscription ? { ...activeSubscription, planName: activePlanRecord?.name || activeSubscription.planId, courseLimit: activePlanRecord?.courseLimit ?? 0 } : null;
    return { courses, enrollments, subscription: latestSubscription, activePlan, plans: db.plans.filter((p) => p.active), paymentInstructions: db.settings.subscriptionPaymentInstructions, notifications, reviews: db.reviews.filter((r) => courseIds.includes(r.courseId)) };
  }
  if (user.role === 'parent') {
    const children = db.users.filter((u) => (user.childIds || []).includes(u.id)).map((child) => {
      const childEnrollments = db.enrollments.filter((e) => e.studentId === child.id).map((e) => { const c = db.courses.find((x) => x.id === e.courseId); return { ...e, course: c ? { ...c, materials: e.status === 'accepted' && e.paymentStatus === 'paid' ? (c.materials || []) : [], onlineUrl: e.status === 'accepted' && e.paymentStatus === 'paid' ? (c.onlineUrl || '') : '' } : null }; });
      const enrollmentIds = childEnrollments.map((e) => e.id);
      const childPayments = db.payments.filter((p) => p.studentId === child.id).map((payment) => { const enrollment = db.enrollments.find((e) => e.id === payment.enrollmentId); return { ...payment, course: db.courses.find((c) => c.id === enrollment?.courseId) || null }; });
      return { user: safeUser(child), enrollments: childEnrollments, attendance: db.attendance.filter((a) => enrollmentIds.includes(a.enrollmentId)).map((a) => ({ ...a, course: db.courses.find((c) => c.id === a.courseId) })), payments: childPayments };
    });
    return { children, notifications };
  }
  const enrollments = db.enrollments.filter((e) => e.studentId === user.id).map((e) => { const c = db.courses.find((x) => x.id === e.courseId); return { ...e, course: c ? { ...c, materials: e.status === 'accepted' && e.paymentStatus === 'paid' ? (c.materials || []) : [], onlineUrl: e.status === 'accepted' && e.paymentStatus === 'paid' ? (c.onlineUrl || '') : '' } : null }; });
  return { enrollments, favorites: db.favorites.filter((f) => f.userId === user.id).map((f) => db.courses.find((c) => c.id === f.courseId)).filter(Boolean).map((c) => ({ ...c, materials: [], onlineUrl: '' })), notifications, childCode: user.childCode };
}

async function handleApi(req, res, url) {
  const method = req.method;
  const p = url.pathname;
  if (method === 'GET' && p === '/api/health') return sendJson(res, 200, { ok: true, name: 'KursTopAI API', time: nowISO() });
  if (method === 'GET' && p === '/api/plans') return sendJson(res, 200, { plans: db.plans.filter((x) => x.active) });
  if (method === 'GET' && p === '/api/courses') {
    const q = clean(url.searchParams.get('q'), 120).toLowerCase();
    const region = clean(url.searchParams.get('region'), 100);
    const district = clean(url.searchParams.get('district'), 100).toLowerCase();
    const subject = clean(url.searchParams.get('subject'), 100);
    const format = clean(url.searchParams.get('format'), 20);
    const courses = db.courses.filter((c) => publicCourse(c)
      && (!q || [c.title,c.subject,c.teacher,c.providerName,c.description].join(' ').toLowerCase().includes(q))
      && (!region || c.region === region)
      && (!district || String(c.district || '').toLowerCase().includes(district))
      && (!subject || c.subject === subject)
      && (!format || format === 'all' || c.format === format || (c.format === 'both' && ['online','offline'].includes(format))))
      .sort((a,b) => Number(b.isSample) - Number(a.isSample) || b.createdAt.localeCompare(a.createdAt));
    return sendJson(res, 200, { courses: courses.map((c) => { const owner=db.users.find((u)=>u.id===c.providerId); return { ...c, materials: [], onlineUrl: '', contactPhone: owner?.phone || '', contactEmail: owner?.email || '' }; }) });
  }
  if (method === 'GET' && p.startsWith('/api/courses/')) {
    const course = db.courses.find((c) => c.id === p.split('/')[3]);
    const viewer = getUserFromReq(req);
    const ownsCourse = viewer && course && course.providerId === viewer.id;
    const enrolled = viewer && course && viewer.role === 'student' && db.enrollments.some((e) => e.studentId === viewer.id && e.courseId === course.id && e.status === 'accepted' && e.paymentStatus === 'paid');
    if (!course || (!publicCourse(course) && !ownsCourse)) return sendJson(res, 404, { error: 'Kurs topilmadi.' });
    const reviews = db.reviews.filter((r) => r.courseId === course.id).map((r) => ({ ...r, user: safeUser(db.users.find((u) => u.id === r.userId)) }));
    const canAccessContent = Boolean(ownsCourse || enrolled);
    const owner = db.users.find((u) => u.id === course.providerId);
    const detail = { ...course, materials: canAccessContent ? (course.materials || []) : [], onlineUrl: canAccessContent ? (course.onlineUrl || '') : '', canReview: Boolean(enrolled), contactPhone: owner?.phone || '', contactEmail: owner?.email || '' };
    return sendJson(res, 200, { course: detail, reviews });
  }
  if (method === 'POST' && p === '/api/auth/register') {
    const b = await readBody(req);
    const fullName = clean(b.fullName, 120); const email = normalizeEmail(b.email); const password = String(b.password || ''); const role = clean(b.role, 20);
    if (!fullName || !email || password.length < 8) return sendJson(res, 400, { error: 'Ism, email va kamida 8 belgili parol kiriting.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'Email manzilni tekshiring.' });
    if (!['student','parent','center','teacher','tutor'].includes(role)) return sendJson(res, 400, { error: 'Akkaunt turi noto‘g‘ri.' });
    if (db.users.some((u) => u.email === email)) return sendJson(res, 409, { error: 'Bu email oldin ro‘yxatdan o‘tgan.' });
    const provider = ['center','teacher','tutor'].includes(role);
    if (provider && (!clean(b.phone,30) || !clean(b.organizationName,160) || !clean(b.documentNumber, 100) || !b.document || !b.document.data)) return sendJson(res, 400, { error: 'Hamkor bo‘lish uchun faoliyat nomi, telefon, hujjat raqami va hujjat faylini kiriting.' });
    const cred = hashPassword(password);
    const userId = id();
    let documentFile = null;
    if (provider) {
      const doc = b.document;
      const ext = path.extname(clean(doc.name, 120)).toLowerCase();
      if (!['.pdf','.png','.jpg','.jpeg'].includes(ext)) return sendJson(res, 400, { error: 'Hujjat PDF, PNG yoki JPG bo‘lishi kerak.' });
      const base64 = String(doc.data).replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      if (!buf.length || buf.length > 5 * 1024 * 1024) return sendJson(res, 400, { error: 'Hujjat hajmi 5 MB dan oshmasligi kerak.' });
      const validFile = ext === '.pdf' ? buf.subarray(0,5).toString('ascii') === '%PDF-' : ext === '.png' ? buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      if (!validFile) return sendJson(res,400,{error:'Yuklangan faylning ichki formati kengaytmasiga mos emas. PDF/JPG/PNG hujjatni qayta tanlang.'});
      documentFile = `${userId}${ext}`;
      await fsp.writeFile(path.join(UPLOAD_DIR, documentFile), buf, { mode: 0o600 });
    }
    const user = { id: userId, fullName, email, phone: clean(b.phone, 30), role, status: provider ? 'pending' : 'approved', passwordSalt: cred.salt, passwordHash: cred.hash, createdAt: nowISO(), ...(provider ? { organizationName: clean(b.organizationName, 160), documentNumber: clean(b.documentNumber, 100), documentFile, documentName: clean(b.document.name, 120), description: clean(b.description, 1000) } : {}), ...(role === 'student' ? { childCode: makeUniqueChildCode(), childCodeCreatedAt: nowISO(), parentIds: [] } : {}), ...(role === 'parent' ? { childIds: [] } : {}) };
    db.users.push(user);
    await saveDb();
    if (provider) {
      const admins = db.users.filter((u) => u.role === 'admin'); admins.forEach((a) => notify(a.id, 'Yangi hamkor arizasi', `${fullName} hujjatlarini tekshirish uchun yubordi.`, 'review'));
      setSession(res, user);
      return sendJson(res, 201, { message: 'Ariza yuborildi. Administrator tasdiqlagach, tarif so‘rash va kurs joylash imkoniyati ochiladi.', user: safeAuthUser(user) });
    }
    setSession(res, user);
    return sendJson(res, 201, { user: safeAuthUser(user), message: 'Ro‘yxatdan o‘tish muvaffaqiyatli.' });
  }
  if (method === 'POST' && p === '/api/auth/login') {
    const b = await readBody(req); const email = normalizeEmail(b.email); const key = loginRateLimitKey(req,email); const attempt = loginFailures.get(key);
    if (attempt && attempt.until > Date.now() && attempt.count >= 10) return sendJson(res,429,{error:'Ko‘p marta noto‘g‘ri urinish bo‘ldi. 15 daqiqadan keyin qayta urinib ko‘ring.'});
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(b.password || '', user)) {
      const current = attempt && attempt.until > Date.now() ? attempt : {count:0,until:Date.now()+15*60*1000};
      current.count += 1; loginFailures.set(key,current);
      return sendJson(res, 401, { error: 'Email yoki parol noto‘g‘ri.' });
    }
    loginFailures.delete(key);
    setSession(res, user);
    return sendJson(res, 200, { user: safeAuthUser(user), message: 'Xush kelibsiz!' });
  }
  if (method === 'POST' && p === '/api/auth/logout') { clearSession(res); return sendJson(res, 200, { ok: true }); }
  if (method === 'GET' && p === '/api/me') { const user = getUserFromReq(req); return sendJson(res, 200, { user: safeAuthUser(user) }); }
  if (method === 'GET' && p === '/api/dashboard') { const user = requireUser(req,res); if (!user) return; return sendJson(res, 200, { dashboard: accountDashboard(user) }); }
  if (method === 'POST' && p === '/api/student/parent-code/refresh') {
    const user = requireUser(req,res); if (!user || !requireRole(user,['student'],res)) return;
    const code = makeUniqueChildCode(user.id);
    user.childCode = code; user.childCodeCreatedAt = nowISO(); await saveDb();
    return sendJson(res,200,{ message:'Ota-ona bog‘lash kodi yangilandi.', childCode:code });
  }
  if (method === 'POST' && p === '/api/parent/link') {
    const user = requireUser(req,res); if (!user || !requireRole(user,['parent'],res)) return;
    const linkKey = `${user.id}|${req.socket.remoteAddress || 'local'}`;
    const linkAttempt = parentLinkFailures.get(linkKey);
    if (linkAttempt && linkAttempt.until > Date.now() && linkAttempt.count >= 10) return sendJson(res,429,{ error:'Ota-ona kodi ko‘p marta xato kiritildi. 15 daqiqadan keyin qayta urinib ko‘ring.' });
    const b = await readBody(req); const code = clean(b.code, 24).replace(/\s+/g, '').toUpperCase(); const child = db.users.find((u) => u.role === 'student' && u.childCode === code);
    if (!child) {
      const current = linkAttempt && linkAttempt.until > Date.now() ? linkAttempt : { count:0, until:Date.now()+15*60*1000 };
      current.count += 1; parentLinkFailures.set(linkKey,current);
      return sendJson(res,404,{ error:'Bu kod bo‘yicha o‘quvchi topilmadi.' });
    }
    parentLinkFailures.delete(linkKey);
    user.childIds = user.childIds || [];
    if (user.childIds.includes(child.id)) return sendJson(res,409,{ error:'Bu o‘quvchi avval bog‘langan.' });
    user.childIds.push(child.id); child.parentIds = child.parentIds || []; if (!child.parentIds.includes(user.id)) child.parentIds.push(user.id); notify(child.id,'Ota-ona akkaunti bog‘landi',`${user.fullName} sizning akkauntingizga ota-ona sifatida bog‘landi.`,'success'); await saveDb();
    return sendJson(res,200,{ message:'Farzand muvaffaqiyatli bog‘landi.' });
  }
  if (method === 'POST' && p === '/api/provider/subscriptions') {
    const user = requireUser(req,res); if (!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    if (user.status !== 'approved') return sendJson(res,403,{ error:'Avval hujjatlaringiz administrator tomonidan tasdiqlanishi kerak.' });
    if (activeSubscriptionFor(user.id)) return sendJson(res,409,{ error:'Sizda faol tarif mavjud. Yangi tarif so‘rash uchun avval amaldagi tarif muddati tugashini kuting.' });
    const outstanding = db.subscriptions.find((s) => s.userId === user.id && ['pending','awaiting_payment'].includes(s.status));
    if (outstanding) return sendJson(res,409,{ error:'Sizda yakunlanmagan tarif so‘rovi bor. Avval shu so‘rov bo‘yicha to‘lov ma’lumotini yuboring yoki administrator javobini kuting.' });
    const b = await readBody(req); const plan = db.plans.find((x) => x.id === b.planId && x.active);
    if (!plan) return sendJson(res,404,{ error:'Tarif topilmadi yoki vaqtincha faol emas.' });
    if (!['monthly','yearly'].includes(b.period)) return sendJson(res,400,{ error:'Obuna davri monthly yoki yearly bo‘lishi kerak.' });
    const period = b.period;
    const amount = Number(period === 'yearly' ? plan.priceYearly : plan.priceMonthly);
    if (!Number.isSafeInteger(amount) || amount <= 0) return sendJson(res,400,{ error:'Tarif narxi noto‘g‘ri sozlangan. Administratorga xabar bering.' });
    const sub = { id:id(), userId:user.id, planId:plan.id, period, amount, status:'awaiting_payment', paymentStatus:'not_submitted', createdAt:nowISO(), endsAt:null };
    db.subscriptions.push(sub); await saveDb();
    return sendJson(res,201,{ message:'Tarif so‘rovi yaratildi. To‘lovni tasdiqlash ma’lumotini yuboring; administrator tekshirgach tarif faollashadi.', subscription:sub, paymentInstructions:db.settings.subscriptionPaymentInstructions });
  }
  if (method === 'POST' && p.startsWith('/api/provider/subscriptions/') && p.endsWith('/cancel')) {
    const user = requireUser(req,res); if (!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    const sub = db.subscriptions.find((s) => s.id === p.split('/')[4] && s.userId === user.id);
    if (!sub) return sendJson(res,404,{error:'Tarif so‘rovi topilmadi.'});
    if (sub.status !== 'awaiting_payment') return sendJson(res,409,{error:'To‘lov ma’lumoti yuborilgan yoki tarif ko‘rib chiqilmoqda; bekor qilish uchun administratorga murojaat qiling.'});
    sub.status='cancelled'; sub.cancelledAt=nowISO(); await saveDb();
    return sendJson(res,200,{message:'Tarif so‘rovi bekor qilindi.'});
  }
  if (method === 'POST' && p.startsWith('/api/provider/subscriptions/') && p.endsWith('/payment')) {
    const user = requireUser(req,res); if (!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    const subId = p.split('/')[4]; const sub = db.subscriptions.find((s) => s.id === subId && s.userId === user.id);
    if (!sub) return sendJson(res,404,{ error:'Tarif so‘rovi topilmadi.' });
    if (sub.status !== 'awaiting_payment') return sendJson(res,409,{ error:'Bu tarif so‘rovi uchun to‘lov ma’lumoti yuborib bo‘lmaydi.' });
    const b = await readBody(req); const reference = clean(b.reference,120); const note = clean(b.note,500);
    if (reference.length < 4) return sendJson(res,400,{ error:'Bank chekidagi tranzaksiya raqami yoki to‘lov izohini kamida 4 belgi bilan kiriting.' });
    sub.paymentReference = reference; sub.paymentNote = note; sub.paymentStatus = 'submitted'; sub.paymentSubmittedAt = nowISO(); sub.status = 'pending';
    db.users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id,'Tarif to‘lovi tekshiruvi',`${user.fullName} ${reference} raqamli to‘lov ma’lumotini yubordi.`,'review'));
    await saveDb(); return sendJson(res,200,{ message:'To‘lov ma’lumoti yuborildi. Administrator tekshiruvini kuting.' });
  }
  if (method === 'POST' && p === '/api/provider/courses') {
    const user = requireUser(req,res); if (!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    if (user.status !== 'approved') return sendJson(res,403,{ error:'Hujjatlaringiz tasdiqlanmagan.' });
    const active = activeSubscriptionFor(user.id);
    if (!active) return sendJson(res,403,{ error:'Kurs joylash uchun faol obuna kerak.' });
    const plan = db.plans.find((x) => x.id === active.planId); const used = db.courses.filter((c) => c.providerId === user.id && c.status !== 'rejected').length;
    if (plan && used >= plan.courseLimit) return sendJson(res,403,{ error:`Tarifingiz ${plan.courseLimit} ta kurs bilan cheklangan.` });
    const b = await readBody(req);
    const rawPrice = b.price; const price = Number(rawPrice); const format = clean(b.format,20); const address = clean(b.address,300); const onlineUrl = safeWebUrl(b.onlineUrl);
    if (rawPrice === undefined || rawPrice === null || String(rawPrice).trim() === '' || !clean(b.title,160) || !clean(b.subject,80) || !clean(b.region,100) || !clean(b.district,100) || !['online','offline','both'].includes(format) || !Number.isSafeInteger(price) || price < 0 || price > 1000000000) return sendJson(res,400,{ error:'Kurs nomi, fan, viloyat, tuman/shahar, format va narxni to‘g‘ri kiriting.' });
    if (['offline','both'].includes(format) && !address) return sendJson(res,400,{ error:'Offline dars uchun aniq manzilni kiriting.' });
    if (['online','both'].includes(format) && !onlineUrl) return sendJson(res,400,{ error:'Online dars uchun https:// bilan boshlanadigan Zoom, Google Meet yoki Telegram havolasini kiriting.' });
    const materials = Array.isArray(b.materials) ? b.materials.slice(0,20).map((m)=>({title:clean(m.title,120) || 'Dars materiali',url:safeWebUrl(m.url),type:clean(m.type,30)})).filter((m)=>m.url) : [];
    const course = { id:id(), title:clean(b.title,160), subject:clean(b.subject,80), region:clean(b.region,100), district:clean(b.district,100), format, price, currency:'UZS', address, teacher:clean(b.teacher,120) || user.fullName, providerName:user.organizationName || user.fullName, providerId:user.id, rating:0, reviews:0, description:clean(b.description,2000), schedule:clean(b.schedule,250), onlineUrl, materials, status:'pending', isSample:false, createdAt:nowISO() };
    db.courses.unshift(course); db.users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id,'Kurs moderatsiyasi',`${course.title} tekshiruvga yuborildi.`,'review')); await saveDb();
    return sendJson(res,201,{ message:'Kurs administrator tekshiruviga yuborildi.', course });
  }
  if (method === 'POST' && p.startsWith('/api/courses/') && p.endsWith('/enroll')) {
    const user = requireUser(req,res); if (!user || !requireRole(user,['student'],res)) return;
    const courseId = p.split('/')[3]; const course = db.courses.find((c) => c.id === courseId && publicCourse(c)); if (!course) return sendJson(res,404,{ error:'Kurs topilmadi.' });
    if (course.isSample || !course.providerId) return sendJson(res,409,{ error:'Bu namuna e’lon. Haqiqiy hamkor tasdiqlagan kursni tanlang.' });
    if (db.enrollments.some((e) => e.studentId === user.id && e.courseId === courseId && !['rejected','cancelled'].includes(e.status))) return sendJson(res,409,{ error:'Siz bu kursga avval yozilgansiz.' });
    const b = await readBody(req); if (!['direct','platform'].includes(b.paymentMethod)) return sendJson(res,400,{ error:'To‘lov usulini tanlang.' }); const requestedPaymentMethod = b.paymentMethod;
    if (requestedPaymentMethod === 'platform') return sendJson(res,503,{ error:'Payme/Click to‘lov provayderi hali ulanmagan. Hozircha markazga bevosita to‘lov usulini tanlang; platforma orqali pul yechilmaydi.' });
    const isFreeCourse = course.price === 0; const paymentMethod = isFreeCourse ? 'free' : 'direct';
    const commissionRate = 0;
    const enrollment = { id:id(), studentId:user.id, courseId, status:'requested', paymentMethod, paymentStatus:isFreeCourse?'paid':'not_paid', price:course.price, commissionRate, commissionAmount:0, createdAt:nowISO() };
    db.enrollments.unshift(enrollment);
    db.messages.unshift({ id:id(), fromUserId:user.id, toUserId:course.providerId, courseId, body:`${user.fullName} “${course.title}” kursiga yozilish so‘rovi yubordi.`, createdAt:nowISO(), system:true });
    if (course.providerId) notify(course.providerId,'Yangi yozilish so‘rovi',`${user.fullName} “${course.title}” kursiga yozilmoqchi.`,'review');
    db.payments.unshift({ id:id(), enrollmentId:enrollment.id, studentId:user.id, providerId:course.providerId, paymentMethod, grossAmount:course.price, commissionAmount:0, netAmount:course.price, status:isFreeCourse?'paid':'awaiting_confirmation', ...(isFreeCourse?{confirmedAt:nowISO(),confirmationType:'free_course'}:{}), createdAt:nowISO() });
    await saveDb();
    return sendJson(res,201,{ message:isFreeCourse?'Bepul kursga yozilish so‘rovi saqlandi. Markaz qabul qilgach materiallar ochiladi.':'Yozilish so‘rovi saqlandi. To‘lovni markaz bilan bevosita kelishing; markaz pulni olgach kabinetda tasdiqlaydi.', enrollment });
  }
  if (method === 'POST' && p.startsWith('/api/courses/') && p.endsWith('/favorite')) {
    const user = requireUser(req,res); if (!user || !requireRole(user,['student'],res)) return;
    const courseId = p.split('/')[3]; if (!db.courses.some((c)=>c.id===courseId)) return sendJson(res,404,{error:'Kurs topilmadi.'});
    const ix = db.favorites.findIndex((f)=>f.userId===user.id && f.courseId===courseId);
    if (ix >= 0) db.favorites.splice(ix,1); else db.favorites.push({id:id(),userId:user.id,courseId,createdAt:nowISO()});
    await saveDb(); return sendJson(res,200,{ favorited:ix < 0 });
  }
  if (method === 'POST' && p.startsWith('/api/courses/') && p.endsWith('/reviews')) {
    const user = requireUser(req,res); if (!user || !requireRole(user,['student'],res)) return;
    const courseId = p.split('/')[3]; const b = await readBody(req); const enrollment = db.enrollments.find((e)=>e.studentId===user.id && e.courseId===courseId && e.status==='accepted' && e.paymentStatus==='paid');
    if (!enrollment) return sendJson(res,403,{error:'Faqat kursga qabul qilingan o‘quvchi baho bera oladi.'});
    const ratingNumber = Number(b.rating); if(!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) return sendJson(res,400,{error:'Baho 1 dan 5 gacha butun son bo‘lishi kerak.'});
    const rating = ratingNumber; const comment = clean(b.comment,600);
    const old = db.reviews.find((r)=>r.courseId===courseId && r.userId===user.id);
    if (old) { old.rating=rating; old.comment=comment; old.updatedAt=nowISO(); }
    else db.reviews.push({id:id(),courseId,userId:user.id,rating,comment,createdAt:nowISO()});
    const c = db.courses.find((x)=>x.id===courseId); const list=db.reviews.filter((r)=>r.courseId===courseId); c.rating=Number((list.reduce((s,r)=>s+r.rating,0)/list.length).toFixed(1)); c.reviews=list.length;
    await saveDb(); return sendJson(res,200,{message:'Bahoyingiz saqlandi.'});
  }
  if (method === 'POST' && p.startsWith('/api/provider/enrollments/') && p.endsWith('/payment')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    const enrollment=db.enrollments.find((e)=>e.id===p.split('/')[4]); if(!enrollment) return sendJson(res,404,{error:'Yozilish topilmadi.'});
    const course=db.courses.find((c)=>c.id===enrollment.courseId); if(!course || course.providerId!==user.id) return sendJson(res,403,{error:'Ruxsat yo‘q.'});
    if(enrollment.status!=='accepted') return sendJson(res,409,{error:'To‘lovni faqat o‘quvchini kursga qabul qilgandan keyin tasdiqlash mumkin.'});
    if(enrollment.paymentMethod!=='direct') return sendJson(res,400,{error:'Platforma to‘lovini faqat to‘lov provayderi tasdiqlashi mumkin.'});
    const b=await readBody(req); const payment=db.payments.find((x)=>x.enrollmentId===enrollment.id);
    if(!payment) return sendJson(res,404,{error:'To‘lov yozuvi topilmadi.'});
    if (b.status !== 'paid') return sendJson(res,400,{error:'Faqat haqiqatan kelib tushgan bevosita to‘lovni tasdiqlash mumkin.'});
    if (payment.status === 'paid') return sendJson(res,409,{error:'Bu to‘lov avval tasdiqlangan.'});
    payment.status='paid'; payment.updatedAt=nowISO(); payment.confirmedAt=nowISO(); payment.confirmedBy=user.id; enrollment.paymentStatus='paid';
    notify(enrollment.studentId,'To‘lov holati yangilandi',`“${course.title}” kursi uchun markaz to‘lovni qabul qildi.`,'success');
    db.users.filter((u)=>u.role==='parent' && (u.childIds||[]).includes(enrollment.studentId)).forEach((par)=>notify(par.id,'Farzandingiz to‘lovi',`“${course.title}” kursi bo‘yicha markaz to‘lovni qabul qildi.`,'success'));
    await saveDb(); return sendJson(res,200,{message:'To‘lov tasdiqlandi va o‘quvchi hamda ota-onaga xabar yuborildi.'});
  }
  if (method === 'POST' && p.startsWith('/api/provider/enrollments/') && p.endsWith('/status')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    const enrollment=db.enrollments.find((e)=>e.id===p.split('/')[4]); if(!enrollment) return sendJson(res,404,{error:'Yozilish topilmadi.'});
    const course=db.courses.find((c)=>c.id===enrollment.courseId); if(!course || course.providerId!==user.id) return sendJson(res,403,{error:'Ruxsat yo‘q.'});
    const b=await readBody(req); if(!['accepted','rejected'].includes(b.status)) return sendJson(res,400,{error:'Holat noto‘g‘ri.'});
    if(enrollment.status!=='requested') return sendJson(res,409,{error:'Bu yozilish so‘rovi avval ko‘rib chiqilgan.'});
    const payment=db.payments.find((x)=>x.enrollmentId===enrollment.id);
    if(b.status==='rejected' && payment?.status==='paid') return sendJson(res,409,{error:'To‘lov qabul qilingan. Yozilishni rad etishdan oldin qaytarim masalasini administrator bilan hal qiling.'});
    enrollment.status=b.status; enrollment.updatedAt=nowISO();
    if(b.status==='rejected' && payment && payment.status!=='paid') { payment.status='cancelled'; payment.updatedAt=nowISO(); enrollment.paymentStatus='cancelled'; }
    notify(enrollment.studentId,'Kursga yozilish holati',`“${course.title}” kursi bo‘yicha so‘rovingiz ${b.status==='accepted'?'qabul qilindi':'rad etildi'}.`,b.status==='accepted'?'success':'warning');
    db.users.filter((u)=>u.role==='parent' && (u.childIds||[]).includes(enrollment.studentId)).forEach((par)=>notify(par.id,'Farzandingiz kursga yozilishi',`“${course.title}” kursi bo‘yicha so‘rov ${b.status==='accepted'?'qabul qilindi':'rad etildi'}.`,b.status==='accepted'?'success':'warning'));
    await saveDb();
    return sendJson(res,200,{message:'Yozilish holati yangilandi.'});
  }
  if (method === 'POST' && p.startsWith('/api/provider/enrollments/') && p.endsWith('/attendance')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['center','teacher','tutor'],res)) return;
    const enrollment=db.enrollments.find((e)=>e.id===p.split('/')[4]); if(!enrollment || enrollment.status!=='accepted') return sendJson(res,404,{error:'Qabul qilingan yozilish topilmadi.'});
    const course=db.courses.find((c)=>c.id===enrollment.courseId); if(!course || course.providerId!==user.id) return sendJson(res,403,{error:'Ruxsat yo‘q.'});
    const b=await readBody(req); if(!['present','absent','late'].includes(b.status)) return sendJson(res,400,{error:'Davomat holatini tanlang.'}); const status=b.status;
    const dateValue=clean(b.date,10)||new Date().toISOString().slice(0,10);
    const dateParts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    const parsedDate=dateParts ? new Date(Date.UTC(Number(dateParts[1]),Number(dateParts[2])-1,Number(dateParts[3]))) : null;
    if(!dateParts || parsedDate.getUTCFullYear()!==Number(dateParts[1]) || parsedDate.getUTCMonth()+1!==Number(dateParts[2]) || parsedDate.getUTCDate()!==Number(dateParts[3])) return sendJson(res,400,{error:'Davomat sanasi haqiqiy YYYY-MM-DD sana bo‘lishi kerak.'});
    let item=db.attendance.find((a)=>a.enrollmentId===enrollment.id && a.date===dateValue);
    if(item) { item.status=status; item.comment=clean(b.comment,500); item.updatedAt=nowISO(); }
    else { item={id:id(),enrollmentId:enrollment.id,studentId:enrollment.studentId,courseId:course.id,status,comment:clean(b.comment,500),date:dateValue,createdAt:nowISO()}; db.attendance.unshift(item); } notify(enrollment.studentId,'Davomat yangilandi',`“${course.title}” kursi: ${status==='present'?'qatnashdi':status==='absent'?'qatnashmadi':'kechikdi'}. ${item.comment}`,'info');
    const parent=db.users.filter((u)=>u.role==='parent' && (u.childIds||[]).includes(enrollment.studentId)); parent.forEach((par)=>notify(par.id,'Farzandingiz davomatida yangilik',`“${course.title}” kursi: ${status==='present'?'qatnashdi':status==='absent'?'qatnashmadi':'kechikdi'}. ${item.comment}`,'info'));
    await saveDb(); return sendJson(res,201,{message:'Davomat saqlandi.'});
  }
  if (method === 'POST' && p === '/api/messages') {
    const user=requireUser(req,res); if(!user) return; const b=await readBody(req); const toUser=db.users.find((u)=>u.id===b.toUserId);
    if(!toUser || toUser.id===user.id) return sendJson(res,404,{error:'Qabul qiluvchi topilmadi.'});
    const courseId=clean(b.courseId,80); const course=courseId ? db.courses.find((c)=>c.id===courseId) : null;
    if(!course) return sendJson(res,404,{error:'Xabar yuborish uchun kursni tanlang.'});
    const studentHasCourse=db.enrollments.some((e)=>e.courseId===course.id && e.studentId===user.id);
    const childHasCourse=user.role==='parent' && db.users.some((child)=>(user.childIds||[]).includes(child.id) && db.enrollments.some((e)=>e.courseId===course.id && e.studentId===child.id));
    const providerOwnsCourse=course.providerId===user.id;
    const providerIsRecipient=course.providerId===toUser.id;
    const allowed=(user.role==='student' && providerIsRecipient && publicCourse(course)) || (user.role==='parent' && childHasCourse && providerIsRecipient) || (['center','teacher','tutor'].includes(user.role) && providerOwnsCourse && db.enrollments.some((e)=>e.courseId===course.id && e.studentId===toUser.id));
    if(!allowed) return sendJson(res,403,{error:'Bu kurs bo‘yicha sizda xabar yuborish huquqi yo‘q.'});
    const msg={id:id(),fromUserId:user.id,toUserId:toUser.id,courseId,body:clean(b.body,2000),createdAt:nowISO(),system:false}; if(!msg.body) return sendJson(res,400,{error:'Xabar matnini kiriting.'});
    db.messages.push(msg); notify(toUser.id,'Yangi xabar',`${user.fullName} sizga xabar yubordi.`,'info'); await saveDb(); return sendJson(res,201,{message:'Xabar yuborildi.'});
  }
  if (method === 'GET' && p === '/api/messages') {
    const user=requireUser(req,res); if(!user) return;
    const messages=db.messages.filter((m)=>m.fromUserId===user.id || m.toUserId===user.id).map((m)=>({...m,from:safeUser(db.users.find((u)=>u.id===m.fromUserId)),to:safeUser(db.users.find((u)=>u.id===m.toUserId))}));
    return sendJson(res,200,{messages});
  }
  if (method === 'POST' && p === '/api/ai/recommend') {
    const b=await readBody(req); const text=clean(b.text,500).toLowerCase();
    if(!text) return sendJson(res,400,{error:'Qaysi fan yoki maqsad sizni qiziqtirishini yozing.'});
    const words=text.split(/\s+/).filter((w)=>w.length>2);
    const courses=db.courses.filter(publicCourse).map((c)=>({c,score:words.reduce((s,w)=>s+([c.title,c.subject,c.description].join(' ').toLowerCase().includes(w)?1:0),0)})).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map((x)=>x.c);
    return sendJson(res,200,{answer:courses.length?'Sizning so‘rovingizga mos mavjud kurslarni topdim. Quyidagi e’lonlar katalog bazasidan olindi.':'Hozircha aynan mos kurs topilmadi. Fan nomini yoki maqsadingizni boshqacha yozib ko‘ring.',courses,disclaimer:'Bu hozircha katalog asosidagi tavsiya demo. Generativ AI API ulanmagan.'});
  }
  if (method === 'POST' && p.startsWith('/api/admin/providers/') && p.endsWith('/review')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const target=db.users.find((u)=>u.id===p.split('/')[4] && ['center','teacher','tutor'].includes(u.role)); if(!target) return sendJson(res,404,{error:'Hamkor topilmadi.'});
    const b=await readBody(req); if(!['approved','rejected'].includes(b.status)) return sendJson(res,400,{error:'Holat noto‘g‘ri.'});
    target.status=b.status; target.adminNote=clean(b.note,500); target.reviewedAt=nowISO(); notify(target.id,'Hamkorlik arizasi',b.status==='approved'?'Hujjatlaringiz tasdiqlandi. Endi obuna so‘rovi yuborishingiz mumkin.':'Arizangiz rad etildi. '+target.adminNote,b.status==='approved'?'success':'warning'); await saveDb(); return sendJson(res,200,{message:'Hamkor arizasi yangilandi.'});
  }
  if (method === 'GET' && p.startsWith('/api/admin/documents/')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const filename=path.basename(p.split('/')[4]||''); const full=path.join(UPLOAD_DIR,filename);
    if(!filename || !fs.existsSync(full)) return sendJson(res,404,{error:'Hujjat topilmadi.'});
    res.writeHead(200,{'Content-Type':filename.endsWith('.pdf')?'application/pdf':filename.endsWith('.png')?'image/png':'image/jpeg','Content-Disposition':'inline','Cache-Control':'no-store'}); fs.createReadStream(full).pipe(res); return;
  }
  if (method === 'POST' && p.startsWith('/api/admin/courses/') && p.endsWith('/review')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const course=db.courses.find((c)=>c.id===p.split('/')[4] && !c.isSample); if(!course) return sendJson(res,404,{error:'Kurs topilmadi.'});
    const b=await readBody(req); if(!['approved','rejected'].includes(b.status)) return sendJson(res,400,{error:'Holat noto‘g‘ri.'});
    if(b.status==='approved' && !providerHasActivePlan(db.users.find((u)=>u.id===course.providerId))) return sendJson(res,409,{error:'Kurs egasining hujjati yoki obunasi faol emas. Avval hamkor holati va tarifini tekshiring.'});
    course.status=b.status; course.adminNote=clean(b.note,500); course.reviewedAt=nowISO(); notify(course.providerId,'Kurs moderatsiyasi',`“${course.title}” kursi ${b.status==='approved'?'tasdiqlandi':'rad etildi'}. ${course.adminNote}`,b.status==='approved'?'success':'warning'); await saveDb(); return sendJson(res,200,{message:'Kurs holati yangilandi.'});
  }
  if (method === 'POST' && p.startsWith('/api/admin/subscriptions/') && p.endsWith('/review')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const sub=db.subscriptions.find((s)=>s.id===p.split('/')[4]); if(!sub) return sendJson(res,404,{error:'Obuna topilmadi.'});
    const b=await readBody(req); if(!['active','rejected'].includes(b.status)) return sendJson(res,400,{error:'Holat noto‘g‘ri.'});
    if (b.status === 'active' && sub.paymentStatus !== 'submitted') return sendJson(res,409,{error:'Tarifni faollashtirishdan oldin hamkor bank tranzaksiya raqami yoki to‘lov ma’lumotini yuborishi kerak.'});
    sub.status=b.status; sub.reviewedAt=nowISO(); sub.adminNote=clean(b.note,500);
    if(b.status==='active') {
      for (const old of db.subscriptions) if (old.userId===sub.userId && old.id!==sub.id && old.status==='active') old.status='expired';
      const months=sub.period==='yearly'?12:1; sub.startsAt=nowISO(); sub.endsAt=addMonths(new Date(),months).toISOString(); sub.paymentStatus='verified'; sub.paymentVerifiedAt=nowISO();
    } else if (sub.paymentStatus === 'submitted') sub.paymentStatus='rejected';
    notify(sub.userId,'Obuna holati',b.status==='active'?`To‘lovingiz tekshirildi. Obunangiz ${new Date(sub.endsAt).toLocaleDateString('uz-UZ')} gacha faollashtirildi.`:'Obuna so‘rovingiz rad etildi. '+sub.adminNote,b.status==='active'?'success':'warning'); await saveDb(); return sendJson(res,200,{message:b.status==='active'?'To‘lov tekshirildi va obuna faollashtirildi.':'Obuna so‘rovi rad etildi.'});
  }
  if (method === 'PATCH' && p === '/api/admin/settings/payment-instructions') {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const b=await readBody(req); const instructions=clean(b.instructions,2000);
    if(instructions.length<10) return sendJson(res,400,{error:'To‘lov bo‘yicha ko‘rsatma kamida 10 belgidan iborat bo‘lishi kerak.'});
    db.settings.subscriptionPaymentInstructions=instructions; await saveDb();
    return sendJson(res,200,{message:'Tarif to‘lovi bo‘yicha ko‘rsatmalar saqlandi.'});
  }
  if (method === 'PATCH' && p.startsWith('/api/admin/plans/')) {
    const user=requireUser(req,res); if(!user || !requireRole(user,['admin'],res)) return;
    const plan=db.plans.find((x)=>x.id===p.split('/')[4]); if(!plan) return sendJson(res,404,{error:'Tarif topilmadi.'});
    const b=await readBody(req); const monthly=Number(b.priceMonthly ?? plan.priceMonthly); const yearly=Number(b.priceYearly ?? plan.priceYearly); const limit=Number(b.courseLimit ?? plan.courseLimit);
    if (![monthly,yearly,limit].every(Number.isFinite) || !Number.isInteger(monthly) || !Number.isInteger(yearly) || monthly<=0 || yearly<=0 || !Number.isInteger(limit) || limit<1 || limit>10000) return sendJson(res,400,{error:'Oylik va yillik narxlar 0 dan katta, kurs limiti esa 1–10000 oralig‘ida butun son bo‘lishi kerak.'});
    plan.priceMonthly=monthly; plan.priceYearly=yearly; plan.courseLimit=limit; plan.active=b.active===undefined?plan.active:Boolean(b.active); await saveDb(); return sendJson(res,200,{message:'Tarif yangilandi.',plan});
  }
  if (method === 'GET' && p === '/api/regions') return sendJson(res,200,{regions:['Andijon viloyati','Buxoro viloyati','Farg‘ona viloyati','Jizzax viloyati','Xorazm viloyati','Namangan viloyati','Navoiy viloyati','Qashqadaryo viloyati','Qoraqalpog‘iston Respublikasi','Samarqand viloyati','Sirdaryo viloyati','Surxondaryo viloyati','Toshkent viloyati','Toshkent shahri']});
  return sendJson(res,404,{error:'API manzili topilmadi.'});
}

async function serveStatic(req,res,url) {
  const dist=path.join(ROOT,'dist');
  const pathname=decodeURIComponent(url.pathname);
  let target=path.join(dist, pathname === '/' ? 'index.html' : pathname);
  const relative = path.relative(dist, target);
  if(relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const st=await fsp.stat(target); if(st.isDirectory()) target=path.join(target,'index.html');
    const ext=path.extname(target).toLowerCase(); const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); fs.createReadStream(target).pipe(res);
  } catch {
    try { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); fs.createReadStream(path.join(dist,'index.html')).pipe(res); }
    catch { res.writeHead(404); res.end('React build topilmadi. Avval npm run build buyrug‘ini bajaring.'); }
  }
}

const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin && ['http://localhost:5173','http://127.0.0.1:5173'].includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Access-Control-Allow-Credentials','true'); res.setHeader('Vary','Origin');
  }
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options','DENY');
  if(req.method==='OPTIONS') { res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}); return res.end(); }
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try {
    if(url.pathname.startsWith('/api/')) return await handleApi(req,res,url);
    if(IS_PROD || fs.existsSync(path.join(ROOT,'dist','index.html'))) return await serveStatic(req,res,url);
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}); res.end('KursTopAI API server is running. Run the Vite client on port 5173.');
  } catch(err) {
    console.error(err);
    if(!res.headersSent) sendJson(res,err.status||500,{error:err.status?err.message:'Serverda kutilmagan xatolik yuz berdi.'}); else res.end();
  }
});

async function main() {
  if (IS_PROD && (SESSION_SECRET === 'local-development-secret-change-before-production-2026' || SESSION_SECRET.length < 32 || SESSION_SECRET.includes('almashtiring'))) {
    throw new Error('Production rejimida KURSTOPAI_SESSION_SECRET ni kamida 32 belgili tasodifiy maxfiy kalitga almashtiring.');
  }
  if (IS_PROD && !ADMIN_PASSWORD_CONFIGURED) {
    throw new Error('Production rejimida KURSTOPAI_ADMIN_PASSWORD ni kamida 12 belgili haqiqiy kuchli parol bilan belgilang.');
  }
  if (process.argv[2] === 'reset-admin') {
    await initDb();
    const email = normalizeEmail(process.argv[3] || ADMIN_EMAIL);
    const password = String(process.argv[4] || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
      console.error('Foydalanish: node server/index.cjs reset-admin admin@kurstopai.uz YangiKuchliParol12+');
      process.exitCode = 1; return;
    }
    let admin = db.users.find((u) => u.role === 'admin');
    if (!admin) { admin = { id:id(), fullName:'KursTopAI administratori', phone:'', role:'admin', status:'approved', createdAt:nowISO() }; db.users.push(admin); }
    if (db.users.some((u) => u.id !== admin.id && u.email === email)) throw new Error('Bu email boshqa akkauntda ishlatilmoqda.');
    const cred = hashPassword(password); admin.email=email; admin.passwordSalt=cred.salt; admin.passwordHash=cred.hash; admin.status='approved';
    await saveDb(); console.log(`Administrator kirishi yangilandi: ${email}`); return;
  }
  await initDb();
  server.listen(PORT,HOST,()=>{
    console.log(`\nKursTopAI API: http://localhost:${PORT}`);
    console.log(`Admin email: ${ADMIN_EMAIL}`);
    if (IS_PROD) console.log('Production admin paroli KURSTOPAI_ADMIN_PASSWORD muhit sozlamasidan olinadi.');
    else console.log(`Yangi, toza bazada lokal admin paroli: ${ADMIN_PASSWORD}`);
    console.log('Eski admin parolini tiklash: npm run admin:reset -- admin@kurstopai.uz YangiKuchliParol12+\n');
  });
}
main().catch((err)=>{console.error('KursTopAI ishga tushmadi:',err);process.exit(1);});
