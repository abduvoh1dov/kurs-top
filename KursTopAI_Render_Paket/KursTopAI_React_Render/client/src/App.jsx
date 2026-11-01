import React, { useCallback, useEffect, useMemo, useState } from 'react';

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : {};
  if (!response.ok) throw new Error(data.error || 'So‘rov bajarilmadi.');
  return data;
};

const money = (value) => `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} so‘m`;
const date = (value) => value ? new Date(value).toLocaleDateString('uz-UZ') : '—';
const roleLabels = { student: 'O‘quvchi', parent: 'Ota-ona', center: 'O‘quv markazi', teacher: 'Mustaqil o‘qituvchi', tutor: 'Repetitor', admin: 'Administrator' };
const regions = ['Andijon viloyati','Buxoro viloyati','Farg‘ona viloyati','Jizzax viloyati','Xorazm viloyati','Namangan viloyati','Navoiy viloyati','Qashqadaryo viloyati','Qoraqalpog‘iston Respublikasi','Samarqand viloyati','Sirdaryo viloyati','Surxondaryo viloyati','Toshkent viloyati','Toshkent shahri'];
const subjects = ['Matematika','Ingliz tili','Dasturlash','Fizika','Kimyo','Biologiya','Ona tili','Tarix','Rus tili','Koreys tili','Dizayn','Robototexnika','Boshqa'];

function App() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [tab, setTab] = useState('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ q: '', region: '', district: '', subject: '', format: 'all' });
  const [aiText, setAiText] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '', phone: '', role: 'student', organizationName: '', documentNumber: '', description: '', documentFile: null });
  const [newCourse, setNewCourse] = useState({ title: '', subject: 'Dasturlash', region: 'Toshkent shahri', district: '', format: 'offline', price: '', address: '', teacher: '', description: '', schedule: '', onlineUrl: '', materialsText: '' });
  const [linkCode, setLinkCode] = useState('');
  const [messageBox, setMessageBox] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);

  const showToast = useCallback((text) => { setToast(text); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => setToast(''), 4200); }, []);

  const loadCourses = useCallback(async (currentFilters = filters) => {
    try {
      const qs = new URLSearchParams(Object.entries(currentFilters).filter(([k,v]) => v && !(k === 'format' && v === 'all'))).toString();
      const data = await api(`/courses${qs ? `?${qs}` : ''}`);
      setCourses(data.courses || []);
    } catch (e) { showToast(e.message); }
  }, [filters, showToast]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try { const data = await api('/dashboard'); setDashboard(data.dashboard); }
    catch (e) { showToast(e.message); }
  }, [user, showToast]);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    try { const data = await api('/messages'); setMessages(data.messages || []); } catch { /* optional panel */ }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const [me, planData] = await Promise.all([api('/me'), api('/plans')]);
        setUser(me.user); setPlans(planData.plans || []);
        const data = await api('/courses'); setCourses(data.courses || []);
      } catch (e) { showToast(e.message); }
    })();
  }, []);
  useEffect(() => { if (user && tab === 'dashboard') loadDashboard(); }, [user, tab, loadDashboard]);
  useEffect(() => { if (user && tab === 'messages') loadMessages(); }, [user, tab, loadMessages]);
  useEffect(() => { const handler=(event)=>{ if(event.detail?.plans) setPlans(event.detail.plans.filter(p=>p.active)); }; window.addEventListener('admin-refresh',handler); return ()=>window.removeEventListener('admin-refresh',handler); }, []);

  const openCourse = async (course) => { try { const detail = await api(`/courses/${course.id}`); setSelectedCourse({ ...detail.course, reviewsList: detail.reviews || [] }); } catch { setSelectedCourse(course); } };
  const doSearch = async (e, overrideFilters) => { e?.preventDefault(); setTab('catalog'); await loadCourses(overrideFilters || filters); };
  const updateFilter = (key, value) => setFilters((old) => ({ ...old, [key]: value }));
  const openAuth = (mode = 'login', role = 'student') => { setAuthMode(mode); setAuthForm((f) => ({ ...f, role })); setAuthOpen(true); };
  const handleFile = (file) => setAuthForm((f) => ({ ...f, documentFile: file }));

  const submitAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (authMode === 'login') {
        const data = await api('/auth/login', { method: 'POST', body: { email: authForm.email, password: authForm.password } });
        setUser(data.user); setAuthOpen(false); setTab('dashboard'); setDashboard(null); showToast('Tizimga muvaffaqiyatli kirdingiz.');
      } else {
        const provider = ['center','teacher','tutor'].includes(authForm.role);
        let document = null;
        if (provider && authForm.documentFile) {
          document = { name: authForm.documentFile.name, data: await fileToBase64(authForm.documentFile) };
        }
        const payload = { ...authForm, document };
        delete payload.documentFile;
        const data = await api('/auth/register', { method: 'POST', body: payload });
        if (data.user) {
          setUser(data.user); setTab('dashboard'); setDashboard(null);
        }
        setAuthOpen(false); showToast(data.message || 'Ro‘yxatdan o‘tildi.');
      }
    } catch (e2) { showToast(e2.message); }
    finally { setLoading(false); }
  };

  const logout = async () => { try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* no-op */ } setUser(null); setDashboard(null); setTab('home'); showToast('Tizimdan chiqdingiz.'); };
  const refreshAll = async () => { await Promise.all([loadDashboard(), loadCourses()]); };

  const enroll = async (course, paymentMethod) => {
    if (!user) { setSelectedCourse(null); openAuth('login'); return; }
    if (user.role !== 'student') return showToast('Kursga yozilish uchun o‘quvchi akkaunti kerak.');
    try {
      const data = await api(`/courses/${course.id}/enroll`, { method: 'POST', body: { paymentMethod } });
      showToast(data.message); setSelectedCourse(null); if (tab === 'dashboard') loadDashboard();
    } catch (e) { showToast(e.message); }
  };
  const toggleFavorite = async (course) => {
    if (!user) return openAuth('login');
    if (user.role !== 'student') return showToast('Sevimlilar faqat o‘quvchi akkauntida mavjud.');
    try { const data = await api(`/courses/${course.id}/favorite`, { method: 'POST', body: {} }); showToast(data.favorited ? 'Sevimlilarga qo‘shildi.' : 'Sevimlilardan olib tashlandi.'); await loadDashboard(); }
    catch (e) { showToast(e.message); }
  };
  const toggleCompare = (course) => setCompareIds((old) => old.includes(course.id) ? old.filter((id) => id !== course.id) : old.length >= 4 ? (showToast('Bir vaqtda ko‘pi bilan 4 ta kursni solishtirasiz.'), old) : [...old, course.id]);

  const submitAI = async (e) => {
    e.preventDefault(); setLoading(true);
    try { setAiResult(await api('/ai/recommend', { method: 'POST', body: { text: aiText } })); }
    catch (e2) { showToast(e2.message); }
    finally { setLoading(false); }
  };

  const submitLink = async (e) => {
    e.preventDefault();
    try { const data = await api('/parent/link', { method: 'POST', body: { code: linkCode } }); setLinkCode(''); showToast(data.message); await loadDashboard(); }
    catch (e) { showToast(e.message); }
  };

  const refreshParentCode = async () => {
    try {
      const result = await api('/student/parent-code/refresh', { method:'POST', body:{} });
      setUser((old) => old ? { ...old, childCode: result.childCode } : old);
      showToast(result.message);
      await loadDashboard();
    } catch (e) { showToast(e.message); }
  };

  const submitNewCourse = async (e) => {
    e.preventDefault(); setLoading(true);
    try { const materials = String(newCourse.materialsText || '').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [title,url]=line.split('|');return {title:(title||'Material').trim(),url:(url||'').trim(),type:/pdf/i.test(url||'')?'pdf':'link'};}).filter(m=>m.url); const data = await api('/provider/courses', { method: 'POST', body: { ...newCourse, materials } }); showToast(data.message); setNewCourse({ title:'', subject:'Dasturlash', region:'Toshkent shahri', district:'', format:'offline', price:'', address:'', teacher:'', description:'', schedule:'', onlineUrl:'', materialsText:'' }); loadDashboard(); }
    catch (e2) { showToast(e2.message); }
    finally { setLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault(); if (!messageBox || !messageText.trim()) return;
    try { const data = await api('/messages', { method:'POST', body:{ toUserId: messageBox.providerId, courseId:messageBox.id, body:messageText } }); showToast(data.message); setMessageText(''); setMessageBox(null); loadMessages(); }
    catch (e2) { showToast(e2.message); }
  };

  const compareCourses = useMemo(() => compareIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean), [compareIds, courses]);
  const favoriteIds = useMemo(() => new Set((dashboard?.favorites || []).map((c) => c.id)), [dashboard]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={() => setTab('home')}><span className="brand-mark">K</span><span>KursTop<span className="brand-ai">AI</span><small>Ta’limni topish oson</small></span></a>
        <nav className="nav-links">
          <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>Bosh sahifa</button>
          <button className={tab==='catalog'?'active':''} onClick={()=>{setTab('catalog');loadCourses();}}>Kurslar</button>
          <button className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}>AI ustoz</button>
          <button className={tab==='plans'?'active':''} onClick={()=>setTab('plans')}>Tariflar</button>
        </nav>
        <div className="top-actions">
          {user ? <><button className="icon-button" title="Xabarlar" onClick={()=>setTab('messages')}>✉ <span className="hide-small">Xabarlar</span></button><button className="primary small" onClick={()=>setTab('dashboard')}>Kabinet</button><div className="user-chip"><span className="avatar">{user.fullName?.slice(0,1)?.toUpperCase()}</span><span className="hide-small">{user.fullName?.split(' ')[0]}</span></div><button className="ghost small" onClick={logout}>Chiqish</button></> : <><button className="ghost small" onClick={()=>openAuth('login')}>Kirish</button><button className="primary small" onClick={()=>openAuth('register')}>Ro‘yxatdan o‘tish</button></>}
        </div>
      </header>

      {tab === 'home' && <Home filters={filters} updateFilter={updateFilter} doSearch={doSearch} openAuth={openAuth} setTab={setTab} courses={courses} setSelectedCourse={openCourse} plans={plans} />}
      {tab === 'catalog' && <Catalog filters={filters} updateFilter={updateFilter} doSearch={doSearch} courses={courses} user={user} favoriteIds={favoriteIds} compareIds={compareIds} toggleCompare={toggleCompare} toggleFavorite={toggleFavorite} setSelectedCourse={openCourse} />}
      {tab === 'ai' && <AISection aiText={aiText} setAiText={setAiText} submitAI={submitAI} aiResult={aiResult} loading={loading} setSelectedCourse={openCourse} />}
      {tab === 'plans' && <Plans plans={plans} openAuth={openAuth} />}
      {tab === 'dashboard' && <Dashboard user={user} dashboard={dashboard} loadDashboard={loadDashboard} openAuth={openAuth} setTab={setTab} submitLink={submitLink} linkCode={linkCode} setLinkCode={setLinkCode} plans={plans} newCourse={newCourse} setNewCourse={setNewCourse} submitNewCourse={submitNewCourse} loading={loading} showToast={showToast} refreshParentCode={refreshParentCode} />}
      {tab === 'messages' && <Messages user={user} messages={messages} loadMessages={loadMessages} />}

      {compareIds.length > 0 && <button className="compare-float" onClick={()=>setCompareOpen(true)}>⇄ Solishtirish <span>{compareIds.length}</span></button>}
      {compareOpen && <Modal title="Kurslarni solishtirish" onClose={()=>setCompareOpen(false)} wide><div className="compare-grid">{compareCourses.map(c=><div className="compare-item" key={c.id}><h3>{c.title}</h3><p>{c.subject}</p><b>{money(c.price)}</b><p>{c.region} · {c.district}</p><p>{c.format==='online'?'Online':c.format==='offline'?'Offline':'Online va offline'}</p><p>⭐ {c.rating || 'Yangi'} ({c.reviews || 0})</p><button className="ghost small" onClick={()=>toggleCompare(c)}>Olib tashlash</button></div>)}</div>{compareCourses.length===0&&<Empty text="Solishtirish uchun kurs tanlang."/>}</Modal>}
      {selectedCourse && <CourseModal course={selectedCourse} user={user} isFavorite={favoriteIds.has(selectedCourse.id)} onClose={()=>setSelectedCourse(null)} onEnroll={enroll} onFavorite={toggleFavorite} onMessage={(c)=>{setSelectedCourse(null);setMessageBox(c);setTab('messages');}} showToast={showToast} />}
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onFile={handleFile} onSubmit={submitAuth} onClose={()=>setAuthOpen(false)} loading={loading} />}
      {messageBox && <Modal title="Hamkorga xabar yuborish" onClose={()=>setMessageBox(null)}><form className="stack-form" onSubmit={sendMessage}><p className="muted">{messageBox.providerName || 'Kurs hamkori'} bilan bog‘lanish</p><textarea required rows="5" value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder="Savolingiz yoki xabaringiz..."/><button className="primary" type="submit">Xabar yuborish</button></form></Modal>}
      {toast && <div className="toast">{toast}</div>}
      <footer className="footer"><div className="footer-brand"><span className="brand-mark">K</span><div><b>KursTopAI</b><p>O‘zbekiston bo‘ylab ta’lim imkoniyatlari bir joyda.</p></div></div><div className="footer-links"><a href="#top" onClick={()=>setTab('catalog')}>Kurslar</a><a href="#top" onClick={()=>setTab('plans')}>Tariflar</a><a href="#top" onClick={()=>setTab('ai')}>AI ustoz</a><button onClick={()=>openAuth('register','center')}>Hamkor bo‘lish</button></div><small>© {new Date().getFullYear()} KursTopAI. Namuna kurslar haqiqiy taklif emas.</small></footer>
    </div>
  );
}

function fileToBase64(file) { return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}); }

function Home({filters,updateFilter,doSearch,openAuth,setTab,courses,setSelectedCourse,plans}) {
  return <main>
    <section className="hero wrap" id="top"><div className="hero-copy"><div className="eyebrow"><span className="pulse-dot"/> O‘ZBEKISTON BO‘YLAB TA’LIM</div><h1>O‘zingizga mos <em>kursni</em> toping.</h1><p className="hero-lead">Minglab ta’lim imkoniyatlari, ishonchli o‘qituvchilar va qulay qidiruv — barchasi bitta platformada.</p><div className="hero-points"><span>✓ Online va offline</span><span>✓ Markaz va repetitorlar</span><span>✓ Ota-ona nazorati</span></div></div><div className="hero-visual"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-card hero-card-main"><div className="hero-card-icon">✦</div><b>Bilim sari yo‘l</b><span>To‘g‘ri kursni toping</span><div className="hero-mini-bars"><i/><i/><i/><i/><i/></div></div><div className="float-tag tag-one">🎓  Ta’lim markazlari</div><div className="float-tag tag-two">⚡  AI tavsiyalar</div><div className="float-tag tag-three">📍  Sizga yaqin kurslar</div></div></section>
    <section className="search-panel wrap"><div className="search-heading"><div><span className="eyebrow">KATALOG</span><h2>Kursni qayerdan qidiramiz?</h2></div><span className="muted small-text">Bir necha soniyada mos variantlarni toping</span></div><form className="search-grid" onSubmit={doSearch}><label className="field"><span>Viloyat</span><select value={filters.region} onChange={e=>updateFilter('region',e.target.value)}><option value="">Barcha hududlar</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label className="field"><span>Tuman / shahar</span><input value={filters.district} onChange={e=>updateFilter('district',e.target.value)} placeholder="Masalan, Qo‘qon"/></label><label className="field"><span>Fan yoki yo‘nalish</span><select value={filters.subject} onChange={e=>updateFilter('subject',e.target.value)}><option value="">Barcha fanlar</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label className="field"><span>Ta’lim shakli</span><select value={filters.format} onChange={e=>updateFilter('format',e.target.value)}><option value="all">Barchasi</option><option value="online">Online</option><option value="offline">Offline</option></select></label><label className="field search-key"><span>Kurs nomi yoki kalit so‘z</span><input value={filters.q} onChange={e=>updateFilter('q',e.target.value)} placeholder="Masalan, Python, IELTS..."/></label><button className="primary search-submit" type="submit">⌕ Kurslarni topish</button></form></section>
    <section className="section wrap"><div className="section-head"><div><span className="eyebrow">YO‘NALISHLAR</span><h2>Qaysi sohada rivojlanmoqchisiz?</h2></div><button className="text-button" onClick={()=>setTab('catalog')}>Barcha kurslar <b>↗</b></button></div><div className="subject-grid">{[['⌘','Dasturlash','code'],['文','Tillar','language'],['∑','Matematika','math'],['✎','Dizayn','design'],['⚗','Tabiiy fanlar','science'],['⚙','Texnologiya','tech']].map(([icon,label])=><button className="subject-tile" key={label} onClick={()=>{setTab('catalog');}}><span>{icon}</span><b>{label}</b><small>Kurslarni ko‘rish ↗</small></button>)}</div></section>
    <section className="section soft-section"><div className="wrap"><div className="section-head"><div><span className="eyebrow">TAVSIYA ETILGAN</span><h2>Ommabop kurslar</h2><p className="muted">Ko‘rish uchun namunaviy e’lonlar. Haqiqiy takliflarni hamkorlar joylaydi.</p></div><button className="text-button" onClick={()=>setTab('catalog')}>Katalogga o‘tish ↗</button></div><div className="course-grid">{courses.slice(0,3).map(c=><CourseCard key={c.id} course={c} onOpen={setSelectedCourse}/>)}</div></div></section>
    <section className="section wrap"><div className="split-cta"><div><span className="eyebrow">KURSTOPAI AI</span><h2>Qaysi kurs sizga mosligini bilmayapsizmi?</h2><p>AI yordamchi qiziqishingiz va maqsadingizga mos mavjud kurslarni katalogdan topishga yordam beradi.</p><button className="primary" onClick={()=>setTab('ai')}>AI ustoz bilan maslahatlashish ↗</button></div><div className="ai-orb"><div className="ai-orb-core">✦</div><span className="ai-chip chip-a">Ta’lim yo‘nalishi</span><span className="ai-chip chip-b">Kurs tavsiyasi</span><span className="ai-chip chip-c">Maqsad</span></div></div></section>
    <section className="section wrap"><div className="section-head"><div><span className="eyebrow">HAMKORLAR UCHUN</span><h2>Ta’lim xizmatlaringizni kengaytiring</h2><p className="muted">Markaz, mustaqil ustoz yoki repetitor sifatida o‘z kurslaringizni joylang.</p></div><button className="primary" onClick={()=>openAuth('register','center')}>Hamkor bo‘lish ↗</button></div><div className="benefit-row"><div><b>01</b><h3>Ro‘yxatdan o‘ting</h3><p>Ma’lumot va hujjatlarni yuboring.</p></div><div><b>02</b><h3>Tasdiqdan o‘ting</h3><p>Administrator hujjatlaringizni ko‘rib chiqadi.</p></div><div><b>03</b><h3>Obuna tanlang</h3><p>Tarif faollashgach kurs joylang.</p></div></div></section>
  </main>;
}

function Catalog({filters,updateFilter,doSearch,courses,user,favoriteIds,compareIds,toggleCompare,toggleFavorite,setSelectedCourse}) {
  return <main className="wrap page-content"><div className="page-title"><div><span className="eyebrow">KURSLAR KATALOGI</span><h1>O‘zingizga mos ta’limni toping</h1><p className="muted">Hudud, fan va format bo‘yicha saralang.</p></div><span className="result-count">{courses.length} ta kurs</span></div><div className="catalog-layout"><aside className="filter-card"><h3>Filtrlar</h3><form onSubmit={doSearch} className="stack-form"><label className="field"><span>Qidiruv</span><input value={filters.q} onChange={e=>updateFilter('q',e.target.value)} placeholder="Kurs yoki ustoz"/></label><label className="field"><span>Viloyat</span><select value={filters.region} onChange={e=>updateFilter('region',e.target.value)}><option value="">Barcha hududlar</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label className="field"><span>Tuman / shahar</span><input value={filters.district} onChange={e=>updateFilter('district',e.target.value)} placeholder="Tuman nomi"/></label><label className="field"><span>Fan</span><select value={filters.subject} onChange={e=>updateFilter('subject',e.target.value)}><option value="">Barcha fanlar</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label className="field"><span>Format</span><select value={filters.format} onChange={e=>updateFilter('format',e.target.value)}><option value="all">Barchasi</option><option value="online">Online</option><option value="offline">Offline</option></select></label><button className="primary">Natijalarni ko‘rish</button><button type="button" className="ghost" onClick={()=>{const reset={q:'',region:'',district:'',subject:'',format:'all'};Object.entries(reset).forEach(([k,v])=>updateFilter(k,v));doSearch(null,reset);}}>Filtrlarni tozalash</button></form></aside><section className="catalog-results"><div className="results-toolbar"><span>{courses.length} ta mos kurs topildi</span><span className="muted small-text">Solishtirish uchun 4 tagacha kurs tanlang</span></div>{courses.length?<div className="course-grid">{courses.map(c=><CourseCard key={c.id} course={c} onOpen={setSelectedCourse} user={user} favorite={favoriteIds.has(c.id)} compare={compareIds.includes(c.id)} onFavorite={toggleFavorite} onCompare={toggleCompare}/>)}</div>:<Empty text="Bu filtrlarga mos kurs topilmadi. Boshqa hudud yoki fanni tanlab ko‘ring."/>}</section></div></main>;
}

function CourseCard({course,onOpen,user,favorite=false,compare=false,onFavorite,onCompare}) {
  return <article className="course-card"><div className="course-art"><span className="course-subject">{course.subject}</span><div className="art-symbol">{course.subject==='Dasturlash'?'⌘':course.subject==='Ingliz tili'?'文':course.subject==='Matematika'?'∑':'✦'}</div><span className="format-pill">{course.format==='online'?'ONLINE':course.format==='offline'?'OFFLINE':'ONLINE + OFFLINE'}</span></div><div className="course-body"><div className="course-meta"><span>📍 {course.region}</span><span>⭐ {course.rating || 'Yangi'} <i>({course.reviews || 0})</i></span></div><h3>{course.title}</h3><p className="teacher-line">{course.teacher || 'O‘qituvchi ko‘rsatilmagan'} · {course.providerName}</p><div className="course-bottom"><b>{Number(course.price)===0?'Bepul':<>{money(course.price)}<small>/ oy</small></>}</b><button className="round-arrow" onClick={()=>onOpen(course)}>↗</button></div><div className="card-actions"><button onClick={()=>onOpen(course)}>Batafsil</button>{onFavorite&&<button className={favorite?'marked':''} onClick={()=>onFavorite(course)} title="Sevimli">♡</button>}{onCompare&&<button className={compare?'marked':''} onClick={()=>onCompare(course)} title="Solishtirish">⇄</button>}</div>{course.isSample&&<small className="sample-note">Namuna e’lon</small>}</div></article>;
}

function CourseModal({course,user,isFavorite,onClose,onEnroll,onFavorite,onMessage,showToast}) {
  const [payment,setPayment]=useState('direct'); const [rating,setRating]=useState(5); const [comment,setComment]=useState('');
  const sendReview=async()=>{try{const r=await api(`/courses/${course.id}/reviews`,{method:'POST',body:{rating,comment}});showToast(r.message);setComment('');}catch(e){showToast(e.message);}};
  const mapUrl=course.address?`https://www.openstreetmap.org/search?query=${encodeURIComponent(course.address+' '+course.region)}`:null;
  return <Modal title="Kurs haqida batafsil" onClose={onClose} wide><div className="detail-layout"><div className="detail-main"><div className="detail-art"><span>{course.subject}</span><b>✦</b><small>{course.format==='online'?'ONLINE TA’LIM':course.format==='offline'?'OFFLINE TA’LIM':'ARALASH TA’LIM'}</small></div><div className="detail-title-row"><div><h2>{course.title}</h2><p className="muted">{course.providerName} · {course.teacher}</p></div><strong>{Number(course.price)===0?'Bepul':money(course.price)}</strong></div><p>{course.description}</p><div className="detail-facts"><div><small>Hudud</small><b>{course.region} · {course.district || 'Ko‘rsatilmagan'}</b></div><div><small>Dars jadvali</small><b>{course.schedule || 'Kelishiladi'}</b></div><div><small>Reyting</small><b>⭐ {course.rating || 'Yangi'} ({course.reviews || 0} ta baho)</b></div><div><small>Manzil</small><b>{course.address || 'Online'}</b></div><div><small>Aloqa</small><b>{course.contactPhone || course.contactEmail || 'Hamkor bilan platforma orqali bog‘laning'}</b></div></div>{course.contactPhone&&<a className="text-link" href={`tel:${course.contactPhone}`}>☎ Telefon qilish</a>}{course.contactEmail&&<p><a className="text-link" href={`mailto:${course.contactEmail}`}>✉ Email yuborish</a></p>}{mapUrl&&<a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Xaritada ko‘rish ↗</a>}{course.onlineUrl&&<p className="muted">Online havola: <a className="text-link" href={course.onlineUrl} target="_blank" rel="noreferrer">Dars platformasi ↗</a></p>}{course.materials?.length>0&&<div className="materials"><h3>Dars materiallari</h3>{course.materials.map((m,i)=><a key={i} href={m.url} target="_blank" rel="noreferrer">{m.title || 'Material'} ↗</a>)}</div>}{course.reviewsList?.length>0&&<div className="materials"><h3>O‘quvchilar fikrlari</h3>{course.reviewsList.map(r=><div className="review-entry" key={r.id}><b>⭐ {r.rating}/5 · {r.user?.fullName||'O‘quvchi'}</b><p>{r.comment||'Izoh qoldirilmagan.'}</p></div>)}</div>}</div><aside className="detail-side"><div className="price-box"><small>Kurs narxi</small><b>{Number(course.price)===0?'Bepul':money(course.price)}</b><span>{course.isSample?'Bu namuna e’lon, haqiqiy hamkor emas. Yozilish hozircha yopiq.':Number(course.price)===0?'Bepul kurs. Hamkor qabul qilgach dars materiallari ochiladi.':'To‘lovni kurs markaziga bevosita amalga oshirasiz.'}</span><button className="primary" disabled={course.isSample||!course.providerId} onClick={()=>onEnroll(course,payment)}>{course.isSample||!course.providerId?'Namuna e’lon':Number(course.price)===0?'Bepul kursga yozilish':'Kursga yozilish'}</button><button className="ghost" onClick={()=>onFavorite(course)}>{isFavorite?'♥ Sevimlilardan olish':'♡ Sevimlilarga qo‘shish'}</button>{course.providerId&&<button className="ghost" onClick={()=>onMessage(course)}>Hamkorga xabar</button>}</div>{Number(course.price)>0&&<div className="payment-choice"><b>To‘lov usuli</b><label><input type="radio" checked={payment==='direct'} onChange={()=>setPayment('direct')}/> Markazga bevosita</label><label className="disabled-choice"><input type="radio" checked={false} disabled/> Platforma orqali — hozircha ishlamaydi</label><small>Payme/Click integratsiyasi ulanmaguncha pul platforma orqali olinmaydi. Hozir markazga bevosita to‘lov yo‘li ishlaydi; platforma komissiyasi 0%.</small></div>}</aside></div>{user?.role==='student'&&<div className="review-box"><h3>Kurs bo‘yicha fikr</h3>{course.canReview?<div className="review-form"><select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} yulduz</option>)}</select><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Qisqa fikringiz..."/><button className="primary small" onClick={sendReview}>Baholash</button></div>:<p className="muted small-text">Baho qoldirish uchun hamkor sizni kursga qabul qilishi va to‘lovni tasdiqlashi kerak.</p>}</div>}</Modal>;
}

function AISection({aiText,setAiText,submitAI,aiResult,loading,setSelectedCourse}) {
  return <main className="wrap page-content"><div className="ai-page-hero"><div><span className="eyebrow">KURSTOPAI AI USTOZ</span><h1>Ta’lim yo‘lingizni birga tanlaymiz.</h1><p>Qiziqishingiz, maqsadingiz va bilimingiz haqida yozing. Yordamchi katalogdagi mavjud kurslarni topishga urinadi.</p></div><div className="ai-orb large"><div className="ai-orb-core">✦</div></div></div><form className="ai-prompt" onSubmit={submitAI}><label>Qaysi yo‘nalish sizni qiziqtiradi?</label><textarea rows="4" value={aiText} onChange={e=>setAiText(e.target.value)} placeholder="Masalan: Men Python dasturlashni noldan o‘rganmoqchiman. Farg‘onada online kurs qidiryapman..."/><div className="prompt-footer"><span className="muted small-text">Faqat platformadagi mavjud kurslar tavsiya qilinadi.</span><button className="primary" disabled={loading||!aiText.trim()}>{loading?'Izlanmoqda...':'Menga kurs tavsiya qil ✦'}</button></div></form>{aiResult&&<div className="ai-response"><div className="ai-response-head"><span className="ai-avatar">✦</span><div><b>KursTopAI yordamchisi</b><small>{aiResult.disclaimer}</small></div></div><p>{aiResult.answer}</p>{aiResult.courses?.length>0&&<div className="course-grid">{aiResult.courses.map(c=><CourseCard key={c.id} course={c} onOpen={setSelectedCourse}/>)}</div>}</div>}</main>;
}

function Plans({plans,openAuth}) { return <main className="wrap page-content"><div className="page-title centered"><div><span className="eyebrow">HAMKORLAR UCHUN TARIFLAR</span><h1>Faoliyatingizga mos tarifni tanlang</h1><p className="muted">O‘quvchilar va ota-onalar uchun platformadan foydalanish bepul.</p></div></div><div className="plan-grid">{plans.map((p,i)=><div className={`plan-card ${i===1?'featured':''}`} key={p.id}><span className="plan-label">{p.name}</span><h2>{money(p.priceMonthly)}<small>/ oy</small></h2><p className="muted">Yillik: {money(p.priceYearly)}</p><div className="plan-limit">{p.courseLimit} tagacha kurs</div><ul>{p.features?.map(f=><li key={f}>✓ {f}</li>)}</ul><button className={i===1?'primary':'ghost'} onClick={()=>openAuth('register','center')}>Hamkor sifatida boshlash</button></div>)}</div><p className="muted center-note">Tarif narxlari va limitlari administrator tomonidan o‘zgartirilishi mumkin. Obuna admin tasdig‘idan keyin faollashadi.</p></main>; }

function Dashboard({user,dashboard,loadDashboard,openAuth,setTab,submitLink,linkCode,setLinkCode,plans,newCourse,setNewCourse,submitNewCourse,loading,showToast,refreshParentCode}) {
  if (!user) return <main className="wrap page-content"><Empty text="Kabinetni ko‘rish uchun tizimga kiring."/><button className="primary" onClick={()=>openAuth('login')}>Kirish</button></main>;
  if (!dashboard) return <main className="wrap page-content"><div className="loading-card">Kabinet ma’lumotlari yuklanmoqda...</div></main>;
  return <main className="wrap page-content"><div className="dashboard-heading"><div><span className="eyebrow">SHAXSIY KABINET</span><h1>Assalomu alaykum, {user.fullName?.split(' ')[0]}!</h1><p className="muted">{roleLabels[user.role]} · {user.email}</p></div><button className="ghost" onClick={loadDashboard}>↻ Yangilash</button></div>
    {user.role==='admin'&&<AdminDashboard data={dashboard} showToast={showToast}/>}
    {user.role==='parent'&&<ParentDashboard data={dashboard} submitLink={submitLink} linkCode={linkCode} setLinkCode={setLinkCode}/>}
    {user.role==='student'&&<StudentDashboard user={user} data={dashboard} setTab={setTab} showToast={showToast} refreshParentCode={refreshParentCode}/>}
    {['center','teacher','tutor'].includes(user.role)&&<ProviderDashboard user={user} data={dashboard} plans={plans} newCourse={newCourse} setNewCourse={setNewCourse} submitNewCourse={submitNewCourse} loading={loading} showToast={showToast} loadDashboard={loadDashboard}/>}
  </main>;
}

function AdminDashboard({data,showToast}) {
  const [planEdits,setPlanEdits]=useState({});
  const [viewData,setViewData]=useState(data);
  const [paymentInstructions,setPaymentInstructions]=useState(data.paymentInstructions||'');
  useEffect(()=>{setViewData(data);setPaymentInstructions(data.paymentInstructions||'');},[data]);
  useEffect(()=>{const handler=(event)=>setViewData(event.detail);window.addEventListener('admin-refresh',handler);return()=>window.removeEventListener('admin-refresh',handler);},[]);
  const approve=async(path,status,extra={})=>{try{const r=await api(path,{method:'POST',body:{status,...extra}});showToast(r.message);const d=await api('/dashboard');window.dispatchEvent(new CustomEvent('admin-refresh',{detail:d.dashboard}));}catch(e){showToast(e.message);}};
  const updatePlan=async(p)=>{try{const v=planEdits[p.id]||p;const r=await api(`/admin/plans/${p.id}`,{method:'PATCH',body:v});showToast(r.message);const d=await api('/dashboard');window.dispatchEvent(new CustomEvent('admin-refresh',{detail:d.dashboard}));}catch(e){showToast(e.message);}};
  const savePaymentInstructions=async()=>{try{const r=await api('/admin/settings/payment-instructions',{method:'PATCH',body:{instructions:paymentInstructions}});showToast(r.message);const d=await api('/dashboard');window.dispatchEvent(new CustomEvent('admin-refresh',{detail:d.dashboard}));}catch(e){showToast(e.message);}};
  return <div className="dashboard-stack"><div className="stats-grid">{[['Foydalanuvchilar',viewData.stats.users],['Tasdiq kutayotgan hamkor',viewData.stats.providersPending],['Tekshiruvdagi kurs',viewData.stats.coursesPending],['Obuna/to‘lov tekshiruvi',viewData.stats.subscriptionsPending],['Yozilishlar',viewData.stats.enrollments]].map(([l,v])=><div className="stat-card" key={l}><small>{l}</small><b>{v}</b></div>)}</div>
    <section className="dashboard-card"><div className="section-head compact"><div><h2>Hamkor hujjatlari</h2><p className="muted">Markaz, mustaqil o‘qituvchi va repetitor arizalari</p></div></div>{viewData.pendingProviders?.length?viewData.pendingProviders.map(u=><div className="admin-row" key={u.id}><div><b>{u.organizationName||u.fullName}</b><p>{roleLabels[u.role]} · {u.fullName} · {u.email}</p><small>Hujjat raqami: {u.documentNumber} · {u.documentName}</small>{u.documentFile&&<p><a className="text-link" href={`/api/admin/documents/${encodeURIComponent(u.documentFile)}`} target="_blank" rel="noreferrer">Hujjatni ko‘rish ↗</a></p>}</div><div className="row-actions"><button className="primary small" onClick={()=>approve(`/admin/providers/${u.id}/review`,'approved')}>Tasdiqlash</button><button className="danger small" onClick={()=>approve(`/admin/providers/${u.id}/review`,'rejected')}>Rad etish</button></div></div>):<Empty text="Tasdiq kutayotgan hamkor yo‘q."/>}</section>
    <section className="dashboard-card"><h2>Kurs moderatsiyasi</h2>{viewData.pendingCourses?.length?viewData.pendingCourses.map(c=><div className="admin-row" key={c.id}><div><b>{c.title}</b><p>{c.providerName} · {c.subject} · {money(c.price)}</p><small>{c.region}, {c.district} · {c.format}</small></div><div className="row-actions"><button className="primary small" onClick={()=>approve(`/admin/courses/${c.id}/review`,'approved')}>Tasdiqlash</button><button className="danger small" onClick={()=>approve(`/admin/courses/${c.id}/review`,'rejected')}>Rad etish</button></div></div>):<Empty text="Tekshiruvdagi yangi kurs yo‘q."/>}</section>
    <section className="dashboard-card"><h2>Tarif va to‘lov tekshiruvi</h2>{viewData.pendingSubscriptions?.length?viewData.pendingSubscriptions.map(s=><div className="admin-row" key={s.id}><div><b>{s.user?.organizationName||s.user?.fullName}</b><p>{s.plan?.name} · {s.period==='yearly'?'Yillik':'Oylik'} · {money(s.amount)}</p><small>{s.user?.email} · {date(s.createdAt)}</small><p><b>To‘lov ma’lumoti:</b> {s.paymentStatus==='submitted'?(s.paymentReference||'Raqam kiritilmagan'):'Hamkor hali to‘lov raqamini yubormagan'}</p>{s.paymentNote&&<small>Izoh: {s.paymentNote}</small>}</div><div className="row-actions">{s.paymentStatus==='submitted'?<button className="primary small" onClick={()=>approve(`/admin/subscriptions/${s.id}/review`,'active')}>Tekshirib faollashtirish</button>:<button className="ghost small" disabled>To‘lov ma’lumoti kutilmoqda</button>}<button className="danger small" onClick={()=>approve(`/admin/subscriptions/${s.id}/review`,'rejected',{note:'To‘lov tasdiqlanmadi yoki so‘rov rad etildi.'})}>Rad etish</button></div></div>):<Empty text="To‘lov ma’lumoti yuborilgan tarif so‘rovlari yo‘q."/>}</section>
    <section className="dashboard-card"><h2>O‘quvchilar to‘lovlari</h2>{viewData.payments?.length?<div className="table-wrap"><table><thead><tr><th>O‘quvchi</th><th>Kurs</th><th>Hamkor</th><th>Summa</th><th>Komissiya</th><th>Hamkorga</th><th>Holat</th></tr></thead><tbody>{viewData.payments.map(p=><tr key={p.id}><td>{p.student?.fullName||'—'}</td><td>{p.course?.title||'—'}</td><td>{p.provider?.organizationName||p.provider?.fullName||'—'}</td><td>{money(p.grossAmount)}</td><td>{money(p.commissionAmount)}</td><td>{money(p.netAmount)}</td><td><Status status={p.status}/></td></tr>)}</tbody></table></div>:<Empty text="Hozircha to‘lov yozuvlari yo‘q."/>}<p className="form-note">Platforma orqali Payme/Click to‘lovi ulanmagan. Bevosita to‘lov yozuvlari markaz tomonidan haqiqiy pul kelib tushgach tasdiqlanadi.</p></section>
    <section className="dashboard-card"><h2>Tarif to‘lovi bo‘yicha ko‘rsatmalar</h2><p className="muted">Hamkorlar tarif so‘raganda shu matnni ko‘radi. Bank rekvizitlari yoki rasmiy to‘lov tartibini shu yerga yozing.</p><label className="field"><span>To‘lov ko‘rsatmasi</span><textarea rows="4" maxLength="2000" value={paymentInstructions} onChange={e=>setPaymentInstructions(e.target.value)} placeholder="Bank nomi, hisob raqami, to‘lov maqsadi va bog‘lanish ma’lumoti..."/></label><button className="primary small" onClick={savePaymentInstructions}>Ko‘rsatmani saqlash</button></section>
    <section className="dashboard-card"><h2>Tariflarni boshqarish</h2><div className="admin-plan-grid">{viewData.plans?.map(p=><div className="admin-plan" key={p.id}><b>{p.name}</b><label>Oylik narx<input type="number" min="1" step="1" value={planEdits[p.id]?.priceMonthly??p.priceMonthly} onChange={e=>setPlanEdits(o=>({...o,[p.id]:{...p,...o[p.id],priceMonthly:Number(e.target.value)}}))}/></label><label>Yillik narx<input type="number" min="1" step="1" value={planEdits[p.id]?.priceYearly??p.priceYearly} onChange={e=>setPlanEdits(o=>({...o,[p.id]:{...p,...o[p.id],priceYearly:Number(e.target.value)}}))}/></label><label>Kurs limiti<input type="number" min="1" step="1" value={planEdits[p.id]?.courseLimit??p.courseLimit} onChange={e=>setPlanEdits(o=>({...o,[p.id]:{...p,...o[p.id],courseLimit:Number(e.target.value)}}))}/></label><label className="plan-active-toggle"><input type="checkbox" checked={planEdits[p.id]?.active??p.active} onChange={e=>setPlanEdits(o=>({...o,[p.id]:{...p,...o[p.id],active:e.target.checked}}))}/> Yangi obuna uchun faol</label><button className="ghost small" onClick={()=>updatePlan(p)}>Saqlash</button></div>)}</div></section>
    <section className="dashboard-card"><h2>So‘nggi foydalanuvchilar</h2><div className="table-wrap"><table><thead><tr><th>Ism</th><th>Email</th><th>Rol</th><th>Holat</th></tr></thead><tbody>{viewData.users?.slice().reverse().slice(0,20).map(u=><tr key={u.id}><td>{u.fullName}</td><td>{u.email}</td><td>{roleLabels[u.role]}</td><td><Status status={u.status}/></td></tr>)}</tbody></table></div></section>
  </div>;
}

function ParentDashboard({data,submitLink,linkCode,setLinkCode}) { return <div className="dashboard-stack"><section className="dashboard-card link-card"><div><h2>Farzandingizni bog‘lash</h2><p className="muted">Farzandingiz o‘quvchi kabinetidagi KT-XXXXXXXXXX kodini kiriting.</p></div><form onSubmit={submitLink}><input value={linkCode} onChange={e=>setLinkCode(e.target.value)} placeholder="KT-XXXXXXXXXX" required/><button className="primary">Bog‘lash</button></form></section>{data.children?.length?data.children.map(child=><section className="dashboard-card" key={child.user.id}><div className="section-head compact"><div><h2>{child.user.fullName}</h2><p className="muted">{child.user.email}</p></div><span className="badge success">Bog‘langan</span></div><h3>Kurslari</h3>{child.enrollments.length?child.enrollments.map(e=><div className="list-row" key={e.id}><div><b>{e.course?.title||'Kurs'}</b><p>{e.course?.schedule} · {e.course?.teacher}</p></div><Status status={e.status}/></div>):<Empty text="Hozircha kursga yozilmagan."/>}<h3>Davomat va izohlar</h3>{child.attendance.length?child.attendance.map(a=><div className="list-row" key={a.id}><div><b>{a.course?.title||'Kurs'} · {date(a.date)}</b><p>{a.comment||'Izoh yo‘q'}</p></div><Status status={a.status}/></div>):<p className="muted">Davomat ma’lumotlari hozircha yo‘q.</p>}<h3>To‘lov holati</h3>{child.payments.length?child.payments.map(p=><div className="list-row" key={p.id}><div><b>{p.course?.title || 'Kurs to‘lovi'}</b><p>{money(p.grossAmount)}</p></div><Status status={p.status}/></div>):<p className="muted">To‘lov yozuvlari mavjud emas.</p>}</section>):<Empty text="Hali farzand bog‘lanmagan."/>}</div>; }

function StudentDashboard({user,data,setTab,showToast,refreshParentCode}) {
  const code = data.childCode || user.childCode || 'Kod yaratilmoqda...';
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); showToast('Ota-ona bog‘lash kodi nusxalandi.'); }
    catch { showToast(`Kodni qo‘lda nusxalang: ${code}`); }
  };
  return <div className="dashboard-stack"><section className="dashboard-card parent-code-card"><div><span className="eyebrow">OTA-ONA NAZORATI</span><h2>Farzandingiz akkauntini ota-onaga bog‘lash</h2><p className="muted">Quyidagi maxsus kodni ota-onangizga yuboring. Ota-ona o‘z akkauntidan shu kodni kiritadi.</p><div className="parent-code-value">{code}</div><div className="row-actions"><button className="primary small" onClick={copyCode} disabled={code.includes('yaratilmoqda')}>Kodni nusxalash</button><button className="ghost small" onClick={refreshParentCode}>Yangi kod yaratish</button></div><small className="form-note">Yangi kod yaratish oldingi kodni bekor qiladi. Kodni faqat ishonchli ota-onangizga bering.</small></div></section><div className="stats-grid"><div className="stat-card"><small>Kursga yozilishlar</small><b>{data.enrollments?.length||0}</b></div><div className="stat-card"><small>Sevimli kurslar</small><b>{data.favorites?.length||0}</b></div></div><section className="dashboard-card"><div className="section-head compact"><h2>Mening kurslarim</h2><button className="text-button" onClick={()=>setTab('catalog')}>Kurs topish ↗</button></div>{data.enrollments?.length?data.enrollments.map(e=><div className="list-row" key={e.id}><div><b>{e.course?.title||'Kurs'}</b><p>{e.course?.schedule} · {e.course?.teacher}</p><small>To‘lov: {e.paymentMethod==='free'?'Bepul kurs':e.paymentMethod==='platform'?'Platforma orqali':'Markazga bevosita'} · {e.paymentStatus==='not_paid'?'Kutilmoqda':e.paymentStatus==='paid'?'To‘langan':'Tekshiruvda'}</small>{e.status==='accepted'&&e.course?.materials?.length>0&&<div className="student-material-links">{e.course.materials.map((m,i)=><a href={m.url} target="_blank" rel="noreferrer" key={i}>{m.title||'Material'} ↗</a>)}</div>}</div><Status status={e.status}/></div>):<Empty text="Siz hali kursga yozilmagansiz."/>}</section><section className="dashboard-card"><h2>Sevimli kurslarim</h2>{data.favorites?.length?data.favorites.map(c=><div className="list-row" key={c.id}><div><b>{c.title}</b><p>{c.providerName}</p></div><b>{money(c.price)}</b></div>):<p className="muted">Sevimli kurslar yo‘q.</p>}</section><section className="dashboard-card"><h2>Bildirishnomalar</h2><Notifications items={data.notifications}/></section></div>;
}

function ProviderDashboard({user,data,plans,newCourse,setNewCourse,submitNewCourse,loading,showToast,loadDashboard}) {
  const [selectedPlan,setSelectedPlan]=useState(plans[0]?.id || 'start'); const [period,setPeriod]=useState('monthly'); const [attendanceState,setAttendanceState]=useState({}); const [paymentReference,setPaymentReference]=useState(''); const [paymentNote,setPaymentNote]=useState('');
  useEffect(()=>{ if (plans.length && !plans.some((p)=>p.id===selectedPlan)) setSelectedPlan(plans[0].id); },[plans,selectedPlan]);
  const requestPlan=async()=>{try{const d=await api('/provider/subscriptions',{method:'POST',body:{planId:selectedPlan,period}});showToast(d.message);await loadDashboard();}catch(e){showToast(e.message);}};
  const submitSubscriptionPayment=async(e)=>{e.preventDefault();try{const d=await api(`/provider/subscriptions/${data.subscription.id}/payment`,{method:'POST',body:{reference:paymentReference,note:paymentNote}});showToast(d.message);setPaymentReference('');setPaymentNote('');await loadDashboard();}catch(e){showToast(e.message);}};
  const cancelSubscription=async()=>{try{const d=await api(`/provider/subscriptions/${data.subscription.id}/cancel`,{method:'POST',body:{}});showToast(d.message);await loadDashboard();}catch(e){showToast(e.message);}};
  const reviewEnrollment=async(id,status)=>{try{const d=await api(`/provider/enrollments/${id}/status`,{method:'POST',body:{status}});showToast(d.message);await loadDashboard();}catch(e){showToast(e.message);}};
  const markAttendance=async(enrollmentId)=>{const v=attendanceState[enrollmentId]||{status:'present',comment:''};try{const d=await api(`/provider/enrollments/${enrollmentId}/attendance`,{method:'POST',body:v});showToast(d.message);setAttendanceState(o=>({...o,[enrollmentId]:{...v,done:true}}));await loadDashboard();}catch(e){showToast(e.message);}};
  const confirmPayment=async(enrollmentId)=>{if(!window.confirm('Pul haqiqatan ham markaz hisobiga kelib tushganini tasdiqlaysizmi?')) return;try{const d=await api(`/provider/enrollments/${enrollmentId}/payment`,{method:'POST',body:{status:'paid'}});showToast(d.message);await loadDashboard();}catch(e){showToast(e.message);}};
  const active = data.activePlan;
  const pending = data.subscription && ['awaiting_payment','pending'].includes(data.subscription.status);
  const currentPlan = active ? (plans.find(p=>p.id===active.planId) || { name:active.planName, courseLimit:active.courseLimit }) : null;
  const usedCourses = data.courses?.filter(c=>c.status!=='rejected').length || 0;
  return <div className="dashboard-stack"><section className="dashboard-card provider-status"><div><span className="eyebrow">HAMKOR HOLATI</span><h2>{user.organizationName||user.fullName}</h2><p className="muted">{roleLabels[user.role]} · {user.email}</p></div><Status status={user.status}/><div className="status-detail">{user.status==='pending'?'Hujjatlaringiz administrator tekshiruvida.':user.status==='rejected'?'Ariza rad etilgan. Tuzatish uchun administrator bilan bog‘laning.':active?`Faol obuna: ${currentPlan?.name||active.planId} · ${date(active.endsAt)} gacha · ${usedCourses}/${currentPlan?.courseLimit||'—'} ta kurs ishlatilgan`:'Hujjatlar tasdiqlandi. Kurs joylash uchun tarif tanlang.'}</div>{user.status==='rejected'&&user.adminNote&&<p className="form-note">Administrator izohi: {user.adminNote}</p>}</section>
    {user.status==='approved'&&!active&&!pending&&<section className="dashboard-card"><h2>Tarif tanlash</h2><p className="muted">Tarif so‘rovi yuborilgach, administrator ko‘rsatmalariga muvofiq to‘lov ma’lumotini kiritasiz. To‘lov tekshirilmaguncha tarif faollashmaydi.</p><div className="subscription-controls"><select value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {money(period==='yearly'?p.priceYearly:p.priceMonthly)} · {p.courseLimit} ta kurs</option>)}</select><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="monthly">Oylik</option><option value="yearly">Yillik</option></select><button className="primary" onClick={requestPlan} disabled={!plans.length}>Tarif so‘rash</button></div></section>}
    {data.subscription?.status==='awaiting_payment'&&<section className="dashboard-card"><h2>Tarif uchun to‘lov ma’lumoti</h2><p className="muted">{plans.find(p=>p.id===data.subscription.planId)?.name||data.subscription.planId} · {money(data.subscription.amount)} · {data.subscription.period==='yearly'?'Yillik':'Oylik'}</p><div className="payment-instructions">{data.paymentInstructions || 'To‘lov ma’lumotini administrator bilan aniqlashtiring.'}</div><form className="stack-form" onSubmit={submitSubscriptionPayment}><label className="field"><span>Bank chekidagi tranzaksiya raqami</span><input required minLength="4" maxLength="120" value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Masalan: 123456789"/></label><label className="field"><span>Izoh (ixtiyoriy)</span><input maxLength="500" value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="To‘lov sanasi yoki qo‘shimcha ma’lumot"/></label><button className="primary">To‘lov ma’lumotini yuborish</button><button type="button" className="ghost small" onClick={cancelSubscription}>Tarif so‘rovini bekor qilish</button></form><p className="form-note">Tranzaksiya raqami yuborilishi pul avtomatik yechilganini anglatmaydi. Administrator bank tushumini alohida tekshiradi.</p></section>}
    {data.subscription?.status==='pending'&&<section className="dashboard-card"><h2>Tarif to‘lovi tekshirilmoqda</h2><p>Yuborilgan tranzaksiya raqami: <b>{data.subscription.paymentReference||'—'}</b></p><Status status={data.subscription.paymentStatus||'pending'}/><p className="muted">Administrator to‘lovni tekshirgach tarif faollashadi. Hozircha yangi kurs joylash ochilmaydi.</p></section>}
    <section className="dashboard-card"><h2>Yangi kurs joylash</h2>{!active?<p className="muted">Kurs qo‘shish tarif to‘lovi administrator tomonidan tasdiqlanib, obuna faollashgandan keyin ochiladi.</p>:<form className="course-create-form" onSubmit={submitNewCourse}><label className="field"><span>Kurs nomi</span><input required maxLength="160" value={newCourse.title} onChange={e=>setNewCourse(o=>({...o,title:e.target.value}))}/></label><label className="field"><span>Fan</span><select value={newCourse.subject} onChange={e=>setNewCourse(o=>({...o,subject:e.target.value}))}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label className="field"><span>Viloyat</span><select value={newCourse.region} onChange={e=>setNewCourse(o=>({...o,region:e.target.value}))}>{regions.map(s=><option key={s}>{s}</option>)}</select></label><label className="field"><span>Tuman / shahar</span><input required value={newCourse.district} onChange={e=>setNewCourse(o=>({...o,district:e.target.value}))}/></label><label className="field"><span>Format</span><select value={newCourse.format} onChange={e=>setNewCourse(o=>({...o,format:e.target.value}))}><option value="offline">Offline</option><option value="online">Online</option><option value="both">Online va offline</option></select></label><label className="field"><span>Narx (so‘m/oy)</span><input required type="number" min="0" max="1000000000" step="1" value={newCourse.price} onChange={e=>setNewCourse(o=>({...o,price:e.target.value}))}/></label><label className="field"><span>O‘qituvchi</span><input value={newCourse.teacher} onChange={e=>setNewCourse(o=>({...o,teacher:e.target.value}))}/></label><label className="field"><span>Dars jadvali</span><input value={newCourse.schedule} onChange={e=>setNewCourse(o=>({...o,schedule:e.target.value}))}/></label>{['offline','both'].includes(newCourse.format)&&<label className="field full"><span>Manzil (majburiy)</span><input required value={newCourse.address} onChange={e=>setNewCourse(o=>({...o,address:e.target.value}))}/></label>}{['online','both'].includes(newCourse.format)&&<label className="field full"><span>Online dars havolasi (majburiy)</span><input required type="url" placeholder="https://meet.google.com/..." value={newCourse.onlineUrl} onChange={e=>setNewCourse(o=>({...o,onlineUrl:e.target.value}))}/></label>}<label className="field full"><span>Kurs tavsifi</span><textarea rows="3" value={newCourse.description} onChange={e=>setNewCourse(o=>({...o,description:e.target.value}))}/></label><label className="field full"><span>PDF, test yoki vazifa havolalari (har qatorda: nomi | https://...)</span><textarea rows="3" value={newCourse.materialsText} onChange={e=>setNewCourse(o=>({...o,materialsText:e.target.value}))} placeholder="1-dars PDF | https://...\nUy vazifasi | https://..."/></label><p className="form-note">Tarif limiti: {usedCourses}/{currentPlan?.courseLimit||'—'} ta kurs. Yangi e’lon admin tekshiruvidan keyin katalogda chiqadi.</p><button className="primary" disabled={loading||usedCourses>=(currentPlan?.courseLimit||0)}>Tekshiruvga yuborish</button></form>}</section>
    <section className="dashboard-card"><h2>Mening kurslarim</h2>{data.courses?.length?data.courses.map(c=><div className="list-row" key={c.id}><div><b>{c.title}</b><p>{c.subject} · {money(c.price)}</p></div><Status status={c.status}/></div>):<Empty text="Hali kurs joylanmagan."/>}</section>
    <section className="dashboard-card"><h2>O‘quvchilar va davomat</h2>{data.enrollments?.length?data.enrollments.map(e=><div className="enrollment-card" key={e.id}><div className="enrollment-head"><div><b>{e.student?.fullName}</b><p>{e.course?.title}</p><small>To‘lov: {e.paymentMethod==='free'?'Bepul kurs':'markazga bevosita'} · {e.paymentStatus==='paid'?'To‘langan':'Kutilmoqda'}</small></div><Status status={e.status}/></div>{e.status==='accepted'&&e.paymentStatus!=='paid'&&<div className="payment-confirm"><span className="muted small-text">Faqat pul haqiqatan kelib tushgach tasdiqlang.</span><button className="ghost small" onClick={()=>confirmPayment(e.id)}>To‘lovni qabul qildim</button></div>}{e.status==='requested'&&<div className="row-actions"><button className="primary small" onClick={()=>reviewEnrollment(e.id,'accepted')}>Qabul qilish</button><button className="danger small" onClick={()=>reviewEnrollment(e.id,'rejected')}>Rad etish</button></div>}{e.status==='accepted'&&<div className="attendance-form"><select value={attendanceState[e.id]?.status||'present'} onChange={ev=>setAttendanceState(o=>({...o,[e.id]:{...o[e.id],status:ev.target.value}}))}><option value="present">Qatnashdi</option><option value="absent">Qatnashmadi</option><option value="late">Kechikdi</option></select><input value={attendanceState[e.id]?.comment||''} onChange={ev=>setAttendanceState(o=>({...o,[e.id]:{...o[e.id],comment:ev.target.value}}))} placeholder="Ota-onaga izoh..."/><button className="ghost small" onClick={()=>markAttendance(e.id)}>Davomatni saqlash</button></div>}</div>):<Empty text="Yangi yozilishlar hali mavjud emas."/>}</section>
    <section className="dashboard-card"><h2>Obuna tarixi</h2>{data.subscription?<div className="list-row"><div><b>{plans.find(p=>p.id===data.subscription.planId)?.name||data.subscription.planId}</b><p>{money(data.subscription.amount)} · {date(data.subscription.createdAt)}</p></div><Status status={data.subscription.status}/></div>:<p className="muted">Obuna so‘rovi hali yuborilmagan.</p>}</section>
  </div>;
}

function Messages({user,messages,loadMessages}) { return <main className="wrap page-content"><div className="page-title"><div><span className="eyebrow">ALOQA</span><h1>Xabarlar</h1><p className="muted">Kurs bo‘yicha yozilish xabarlari va hamkorlar bilan muloqot.</p></div><button className="ghost" onClick={loadMessages}>↻ Yangilash</button></div>{!user?<Empty text="Xabarlarni ko‘rish uchun tizimga kiring."/>:messages.length?<div className="messages-list">{messages.slice().reverse().map(m=><div className={`message-item ${m.fromUserId===user.id?'sent':''}`} key={m.id}><div><b>{m.fromUserId===user.id?'Siz':m.from?.fullName||'Platforma'}</b><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleString('uz-UZ')}</small></div></div>)}</div>:<Empty text="Hozircha xabarlar mavjud emas."/>}</main>; }

function Notifications({items=[]}) { return items.length?<div className="notifications">{items.map(n=><div className="notification" key={n.id}><span className="notification-dot"/><div><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString('uz-UZ')}</small></div></div>)}</div>:<p className="muted">Bildirishnomalar mavjud emas.</p>; }
function Status({status}) { const labels={approved:'Tasdiqlangan',pending:'Kutilmoqda',awaiting_payment:'To‘lov ma’lumoti kutilmoqda',submitted:'To‘lov ma’lumoti yuborildi',verified:'To‘lov tekshirildi',expired:'Muddati tugagan',cancelled:'Bekor qilingan',rejected:'Rad etilgan',active:'Faol',accepted:'Qabul qilingan',requested:'So‘rov yuborilgan',present:'Qatnashdi',absent:'Qatnashmadi',late:'Kechikdi',free:'Bepul',integration_required:'Integratsiya kerak',awaiting_confirmation:'Tasdiq kutilmoqda',paid:'To‘langan',not_paid:'To‘lanmagan'}; const color=['approved','active','accepted','present','paid','verified'].includes(status)?'success':['rejected','absent','expired'].includes(status)?'danger':['pending','awaiting_payment','submitted','requested','late','integration_required','awaiting_confirmation','not_paid'].includes(status)?'warning':'neutral'; return <span className={`status ${color}`}>{labels[status]||status||'—'}</span>; }
function Empty({text}) { return <div className="empty-state"><span>⌕</span><p>{text}</p></div>; }
function Modal({title,onClose,children,wide=false}) { return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={`modal ${wide?'modal-wide':''}`}><div className="modal-head"><h2>{title}</h2><button className="close-button" onClick={onClose}>×</button></div>{children}</div></div>; }
function AuthModal({mode,setMode,form,setForm,onFile,onSubmit,onClose,loading}) {
  const provider=['center','teacher','tutor'].includes(form.role);
  return <Modal title={mode==='login'?'Hisobga kirish':'Ro‘yxatdan o‘tish'} onClose={onClose}><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Kirish</button><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Ro‘yxatdan o‘tish</button></div><form className="stack-form" onSubmit={onSubmit}>{mode==='register'&&<><label className="field"><span>F.I.Sh.</span><input required value={form.fullName} onChange={e=>setForm(o=>({...o,fullName:e.target.value}))} placeholder="To‘liq ism familiya"/></label><label className="field"><span>Akkaunt turi</span><select value={form.role} onChange={e=>setForm(o=>({...o,role:e.target.value}))}><option value="student">O‘quvchi</option><option value="parent">Ota-ona</option><option value="center">O‘quv markazi</option><option value="teacher">Mustaqil o‘qituvchi</option><option value="tutor">Repetitor</option></select></label>{provider&&<><label className="field"><span>Markaz / faoliyat nomi</span><input required value={form.organizationName} onChange={e=>setForm(o=>({...o,organizationName:e.target.value}))}/></label><label className="field"><span>Hujjat raqami</span><input required value={form.documentNumber} onChange={e=>setForm(o=>({...o,documentNumber:e.target.value}))}/></label><label className="field"><span>Tasdiqlovchi hujjat (PDF, JPG, PNG, 5 MB gacha)</span><input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>onFile(e.target.files?.[0]||null)}/></label><label className="field"><span>Faoliyat tavsifi</span><textarea rows="2" value={form.description} onChange={e=>setForm(o=>({...o,description:e.target.value}))}/></label></>}</> }<label className="field"><span>Email</span><input required type="email" value={form.email} onChange={e=>setForm(o=>({...o,email:e.target.value}))} placeholder="name@example.com"/></label>{mode==='register'&&<label className="field"><span>Telefon {provider?'(majburiy)':''}</span><input required={provider} value={form.phone} onChange={e=>setForm(o=>({...o,phone:e.target.value}))} placeholder="+998 90 123 45 67"/></label>}<label className="field"><span>Parol</span><input required type="password" minLength="8" value={form.password} onChange={e=>setForm(o=>({...o,password:e.target.value}))} placeholder="Kamida 8 belgi"/></label><button className="primary full-button" disabled={loading}>{loading?'Bajarilmoqda...':mode==='login'?'Kirish':'Akkaunt yaratish'}</button>{mode==='register'&&provider&&<p className="form-note">Hamkor akkaunti administrator hujjatlarni tekshirguncha kutish holatida bo‘ladi. Hujjatlar maxfiy papkada saqlanadi.</p>}</form></Modal>;
}

export default App;
