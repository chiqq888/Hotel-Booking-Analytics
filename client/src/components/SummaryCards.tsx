import { useEffect, useState } from 'react';
import type { Summary } from '../types';
import { api } from '../services/api';
import Icon from './Icon';
import { date, number } from './States';

export default function SummaryCards({ refreshKey = 0 }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api.summary('original').then(value => { if (active) { setSummary(value); setError(''); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [refreshKey]);
  const cards = [
    { label: 'รายการจองทั้งหมด', value: summary ? number(summary.totalBookings) : '—', icon: 'list', note: 'จำนวนรายการใน Dataset' },
    { label: 'เข้าพักสำเร็จ', value: summary ? number(summary.completedStays) : '—', icon: 'check', note: 'สถานะ Check-Out' },
    { label: 'อัตราการยกเลิก', value: summary?.cancellationRate != null ? `${number(summary.cancellationRate * 100, 2)}%` : '—', icon: 'cancel', note: 'is_canceled = 1 / ทั้งหมด' },
    { label: 'ADR เฉลี่ยต่อรายการ', value: summary ? number(summary.averageAdr, 2) : '—', icon: 'chart', note: 'ราคาเฉลี่ยต่อวัน · หน่วยตาม Dataset' },
  ];
  return <section aria-label="สรุปข้อมูลต้นฉบับ" className="summary-section"><div className="summary-caption"><span className="eyebrow">DATASET SNAPSHOT</span><span>ข้อมูลต้นฉบับเท่านั้น {summary && <>· {date(summary.dateFrom)} – {date(summary.dateTo)}</>}</span></div><div className="summary-grid">{cards.map(card => <article className="metric" key={card.label}><div className="metric-label">{card.label}<span className="metric-icon"><Icon name={card.icon} size={18}/></span></div><strong>{card.value}</strong><small>{card.note}</small></article>)}</div>{error && <p className="inline-error" role="alert">ยังอ่านตัวเลขสรุปไม่ได้: {error}</p>}</section>;
}
