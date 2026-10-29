import { useEffect, useState } from 'react';
import type { Options, Page } from './types';
import Icon from './components/Icon';
import { api } from './services/api';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import DashboardPage from './pages/DashboardPage';

const nav: { id: Page; name: string; en: string; icon: string }[] = [
  { id: 'bookings', name: 'รายการจอง', en: 'Bookings', icon: 'list' },
  { id: 'new', name: 'เพิ่มรายการจอง', en: 'New booking', icon: 'plus' },
  { id: 'dashboard', name: 'แดชบอร์ด', en: 'Dashboard', icon: 'grid' },
];
function currentPage(): Page { const value = window.location.hash.replace('#/', ''); return nav.some(item => item.id === value) ? value as Page : 'bookings'; }
export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [options, setOptions] = useState<Options>();
  const [optionsError, setOptionsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const listener = () => { setPage(currentPage()); setMobileOpen(false); window.scrollTo(0, 0); }; window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => { let active = true; setOptionsError(''); api.options().then(value => { if (active) setOptions(value); }).catch(e => { if (active) setOptionsError(e.message); }); return () => { active = false; }; }, [retry]);
  return <div className="app-shell">
    {mobileOpen && <button className="nav-backdrop" aria-label="ปิดเมนู" onClick={() => setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <a className="brand" href="#/bookings"><span className="brand-mark"><Icon name="hotel" size={25}/></span><span>Hotel Booking<small>ANALYTICS WORKSPACE</small></span></a>
      <div className="workspace-label"><span className="workspace-avatar">H</span><div>Hotel Booking Demand<small>โปรเจกต์วิเคราะห์ข้อมูล</small></div><span className="workspace-dot"/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="เมนูหลัก">{nav.map(item => <a href={`#/${item.id}`} key={item.id} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon}/><span>{item.name}</span>{page === item.id && <span className="nav-active-dot"/>}</a>)}</nav>
      <div className="sidebar-note"><div className="sidebar-note-icon"><Icon name="database" size={20}/></div><strong>ข้อมูลที่ตรวจสอบย้อนกลับได้</strong><p>บันทึกด้วย Excel วิเคราะห์ด้วย Power Query และ Tableau Public</p><div className="tool-tags"><span>Excel</span><span>Tableau</span><span>Web</span></div></div>
      <div className="sidebar-bottom"><span className={`connection-dot ${options ? 'online' : ''}`}/><div>{options ? 'เชื่อมต่อข้อมูลแล้ว' : optionsError ? 'ยังไม่เชื่อมต่อข้อมูล' : 'กำลังเชื่อมต่อ…'}<small>แหล่งข้อมูล: Excel workbook</small></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="เปิดเมนู" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><span>พื้นที่วิเคราะห์</span><Icon name="arrow" size={14}/><strong>{nav.find(item => item.id === page)?.name}</strong></div><div className="topbar-right"><span className="educational-tag">เพื่อการศึกษา</span><span className="profile-avatar">HB</span></div></header>
      <main id="main-content">
        {page === 'bookings' && <BookingsPage options={options} optionsError={optionsError} revision={revision} retryOptions={() => setRetry(value => value + 1)}/>}
        {page === 'new' && <NewBookingPage options={options} optionsError={optionsError} retryOptions={() => setRetry(value => value + 1)} onCreated={() => setRevision(value => value + 1)}/>}
        {page === 'dashboard' && <DashboardPage revision={revision}/>}
      </main>
      <footer className="main-footer"><span>HOTEL BOOKING ANALYTICS</span><span>ข้อมูลประวัติศาสตร์สำหรับการเรียนรู้และวิเคราะห์</span></footer>
    </div>
  </div>;
}
