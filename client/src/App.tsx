import { useEffect, useState } from 'react';
import type { Options, Page } from './types';
import Icon from './components/Icon';
import { api } from './services/api';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import DashboardPage from './pages/DashboardPage';

const nav: { id: Page; name: string; icon: string }[] = [
  { id: 'bookings', name: 'รายการจอง', icon: 'list' },
  { id: 'dashboard', name: 'แดชบอร์ด', icon: 'grid' },
  { id: 'new', name: 'เพิ่มรายการจอง', icon: 'plus' },
];

function currentPage(): Page {
  const value = window.location.hash.replace('#/', '');
  return nav.some((item) => item.id === value) ? (value as Page) : 'bookings';
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [options, setOptions] = useState<Options>();
  const [optionsError, setOptionsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [revision, setRevision] = useState(0);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const listener = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  useEffect(() => {
    let active = true;
    setOptionsError('');
    api
      .options()
      .then((value) => {
        if (active) setOptions(value);
      })
      .catch((e) => {
        if (active) setOptionsError(e.message);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        ข้ามไปยังเนื้อหา
      </a>
      <a className="brand" href="#/bookings" aria-label="Hotel Booking Analytics หน้ารายการจอง">
        <span className="brand-mark">
          <Icon name="hotel" size={26} />
        </span>
        <span>
          Hotel Booking<small>ANALYTICS WORKSPACE</small>
        </span>
      </a>
      <header className="topbar">
        <nav className="main-nav" aria-label="เมนูหลัก">
          {nav.map((item) => (
            <a
              href={`#/${item.id}`}
              key={item.id}
              className={page === item.id ? 'active' : ''}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.name}</span>
              {page === item.id && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <div className="date-pill">
            <Icon name="calendar" size={18} />
            <span>
              {today.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Bangkok',
              })}
            </span>
          </div>
          <div className="workspace-pill">
            <span className="profile-avatar">HB</span>
            <div>
              Hotel Booking<small>พื้นที่วิเคราะห์ข้อมูล</small>
            </div>
          </div>
        </div>
      </header>
      <div className="workspace-bar">
        <div className="breadcrumb">
          <Icon name="hotel" size={15} />
          <span>เวิร์กสเปซ</span>
          <span className="breadcrumb-slash">/</span>
          <strong>{nav.find((item) => item.id === page)?.name}</strong>
        </div>
        <div className="data-connection" role="status">
          <span
            className={`connection-dot ${options ? 'online' : optionsError ? 'offline' : ''}`}
          />
          <span>
            {options
              ? 'เชื่อมต่อ Excel แล้ว'
              : optionsError
                ? 'ยังไม่เชื่อมต่อข้อมูล'
                : 'กำลังเชื่อมต่อ…'}
          </span>
          <span className="workspace-divider" />
          <span className="educational-tag">เพื่อการศึกษา</span>
        </div>
      </div>
      <main id="main-content" tabIndex={-1}>
        {page === 'bookings' && (
          <BookingsPage
            options={options}
            optionsError={optionsError}
            revision={revision}
            retryOptions={() => setRetry((value) => value + 1)}
          />
        )}
        {page === 'new' && (
          <NewBookingPage
            options={options}
            optionsError={optionsError}
            retryOptions={() => setRetry((value) => value + 1)}
            onCreated={() => setRevision((value) => value + 1)}
          />
        )}
        {page === 'dashboard' && <DashboardPage revision={revision} />}
      </main>
      <footer className="main-footer">
        <span>
          <span className="footer-brand-dot" />
          HOTEL BOOKING ANALYTICS
        </span>
        <span>
          ข้อมูลประวัติศาสตร์เพื่อการเรียนรู้ <span className="footer-separator">·</span> Excel &
          Tableau Public
        </span>
      </footer>
    </div>
  );
}
