import { useEffect, useState } from 'react';
import type { Summary } from '../types';
import { api } from '../services/api';
import Icon from './Icon';
import { date, number } from './States';

export default function SummaryCards({ refreshKey = 0 }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api
      .summary('original')
      .then((value) => {
        if (active) {
          setSummary(value);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const completedRate =
    summary && summary.totalBookings > 0 ? summary.completedStays / summary.totalBookings : null;
  const cards = [
    {
      label: 'รายการจองทั้งหมด',
      caption: 'Total bookings',
      tone: 'blue',
      icon: 'list',
      value: summary ? number(summary.totalBookings) : '—',
      unit: 'รายการ',
      note: 'ข้อมูลต้นฉบับ Hotel Booking Demand',
      footnote: summary
        ? `${number(summary.totalNights)} คืนที่จองทั้งหมด`
        : 'กำลังอ่านข้อมูลต้นฉบับ',
    },
    {
      label: 'เข้าพักสำเร็จ',
      caption: 'Completed stays',
      tone: 'teal',
      icon: 'check',
      value: summary ? number(summary.completedStays) : '—',
      unit: 'รายการ',
      note: 'รายการที่มีสถานะ Check-Out',
      rate: completedRate,
      progressLabel: 'สัดส่วนจากรายการทั้งหมด',
    },
    {
      label: 'อัตราการยกเลิก',
      caption: 'Cancellation rate',
      tone: 'coral',
      icon: 'cancel',
      value: summary?.cancellationRate != null ? number(summary.cancellationRate * 100, 2) : '—',
      unit: '%',
      note: summary
        ? `${number(summary.canceledBookings)} รายการที่ยกเลิก`
        : 'is_canceled = 1 / ทั้งหมด',
      rate: summary?.cancellationRate ?? null,
      progressLabel: 'สัดส่วนจากรายการทั้งหมด',
    },
    {
      label: 'ADR เฉลี่ยต่อรายการ',
      caption: 'Average daily rate',
      tone: 'amber',
      icon: 'chart',
      value: summary ? number(summary.averageAdr, 2) : '—',
      unit: 'ต่อวัน',
      note: 'ราคาเฉลี่ยต่อวันของแต่ละรายการ',
      footnote: 'หน่วยราคาตาม Dataset ต้นฉบับ',
    },
  ];

  return (
    <section aria-label="สรุปข้อมูลต้นฉบับ" className="summary-section">
      <div className="summary-caption">
        <span className="eyebrow">
          ภาพรวมข้อมูล <span>DATASET OVERVIEW</span>
        </span>
        <span>
          ข้อมูลต้นฉบับเท่านั้น{' '}
          {summary && (
            <>
              · {date(summary.dateFrom)} – {date(summary.dateTo)}
            </>
          )}
        </span>
      </div>
      <div className="summary-grid">
        {cards.map((card) => (
          <article className={`metric metric-${card.tone}`} key={card.label}>
            <div className="metric-label">
              <span className="metric-icon">
                <Icon name={card.icon} size={21} />
              </span>
              <div className="metric-heading">
                <h2>{card.label}</h2>
                <span>{card.caption}</span>
              </div>
            </div>
            <div className="metric-value">
              <strong>{card.value}</strong>
              <span className="metric-unit">{card.unit}</span>
            </div>
            <p className="metric-note">{card.note}</p>
            {'rate' in card ? (
              <div className="metric-progress">
                <div className="metric-progress-label">
                  <span>{card.progressLabel}</span>
                  <span>{card.rate != null ? `${number(card.rate * 100, 1)}%` : '—'}</span>
                </div>
                <div className="metric-track" aria-hidden="true">
                  <span
                    style={{ width: `${Math.max(0, Math.min(100, (card.rate ?? 0) * 100))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="metric-footnote">
                <Icon name="info" size={14} />
                <span>{card.footnote}</span>
              </div>
            )}
          </article>
        ))}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          ยังอ่านตัวเลขสรุปไม่ได้: {error}
        </p>
      )}
    </section>
  );
}
