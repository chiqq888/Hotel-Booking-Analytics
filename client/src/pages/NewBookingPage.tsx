import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { BookingInput, Options } from '../types';
import { validateBooking } from '../../../shared/validation';
import { api, ApiError } from '../services/api';
import { ErrorState, Loading } from '../components/States';
import Icon from '../components/Icon';

function Field({ label, name, error, children, hint }: { label: string; name: string; error?: string; children: ReactNode; hint?: string }) { return <div className={`field ${error ? 'has-error' : ''}`}><label htmlFor={name}>{label}</label>{children}{error ? <small className="field-error" id={`${name}-error`}>{error}</small> : hint ? <small>{hint}</small> : null}</div>; }
export default function NewBookingPage({ options, optionsError, retryOptions, onCreated }: { options?: Options; optionsError: string; retryOptions: () => void; onCreated: () => void }) {
  const [hotel, setHotel] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const activeHotel = hotel || options?.hotels[0] || '';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!options || saving) return;
    const form = event.currentTarget;
    const input: Record<string, unknown> = Object.fromEntries(new FormData(form));
    if (input.country === '') input.country = null;
    for (const key of ['adults', 'children', 'babies', 'stays_in_week_nights', 'stays_in_weekend_nights', 'adr', 'lead_time']) input[key] = input[key] === '' ? null : Number(input[key]);
    const validation = validateBooking(input, options);
    setErrors(validation.errors); setError(''); setCreatedId('');
    if (!validation.value) { document.getElementById(Object.keys(validation.errors)[0])?.focus(); return; }
    setSaving(true);
    try { const result = await api.create(validation.value as BookingInput); setCreatedId(String(result.booking.booking_id)); onCreated(); form.reset(); setHotel(''); }
    catch (e) { if (e instanceof ApiError) { setError(e.message); setErrors(e.details); } else setError('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setSaving(false); }
  }
  const select = (name: string, values: string[], required = true) => <select id={name} name={name} required={required} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}>{!required && <option value="">ไม่ระบุ</option>}{values.map(value => <option key={value}>{value}</option>)}</select>;
  const numeric = (name: string, defaultValue?: number, step = '1', required = true) => <input id={name} name={name} type="number" min="0" step={step} defaultValue={defaultValue} required={required} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} inputMode={step === '1' ? 'numeric' : 'decimal'}/>;
  return <><div className="page-heading"><div><span className="eyebrow">NEW BOOKING RECORD</span><h1>เพิ่มรายการจอง</h1><p>บันทึกรายการสำหรับสาธิตและนำไปวิเคราะห์ต่อใน Excel</p></div><a className="button outline" href="#/bookings">ดูรายการทั้งหมด <Icon name="arrow" size={16}/></a></div>
    <div className="notice soft"><Icon name="info" size={20}/><p>ฟอร์มนี้ใช้บันทึกข้อมูลเพื่อการศึกษา รายการใหม่จะระบุแหล่งที่มาเป็น <strong>web</strong> และเก็บแยกจาก Dataset ต้นฉบับ</p></div>
    {createdId && <div className="notice success" role="status"><Icon name="check"/><div><strong>บันทึกลง Excel สำเร็จแล้ว</strong><p>รหัสรายการ <code>{createdId}</code> · เปิดหน้ารายการจองและเลือก “จากเว็บไซต์” เพื่อดูข้อมูล</p><p>Dashboard จะแสดงข้อมูลใหม่หลัง Refresh Excel → Refresh Tableau → Publish บน Tableau Public</p><a className="text-button" href="#/bookings">ไปที่รายการจอง <Icon name="arrow" size={14}/></a></div></div>}
    {optionsError ? <ErrorState message={optionsError} retry={retryOptions}/> : !options ? <Loading text="กำลังโหลดตัวเลือกจาก Dataset…"/> : <div className="form-layout"><form className="panel booking-form" onSubmit={submit}><fieldset disabled={saving}><div className="form-section"><div className="section-title"><span>01</span><div><h2>ข้อมูลการเข้าพัก</h2><p>ประเภทโรงแรม วันที่ และรหัสห้องจากข้อมูลจริง</p></div></div><div className="form-grid"><Field label="ประเภทโรงแรม *" name="hotel" error={errors.hotel}><select id="hotel" name="hotel" value={activeHotel} onChange={event => setHotel(event.target.value)} required>{options.hotels.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="วันเข้าพักตามกำหนด *" name="arrival_date" error={errors.arrival_date}><input id="arrival_date" name="arrival_date" type="date" required aria-invalid={Boolean(errors.arrival_date)}/></Field><Field label="รหัสประเภทห้องที่จอง *" name="reserved_room_type" error={errors.reserved_room_type} hint="รหัสที่ปกปิดชื่อจริง ไม่มีการตีความเป็นชื่อห้อง">{select('reserved_room_type', options.roomsByHotel[activeHotel] ?? [])}</Field><Field label="กลุ่มการจอง *" name="customer_type" error={errors.customer_type}>{select('customer_type', options.customerTypes)}</Field><Field label="ประเทศผู้เข้าพัก" name="country" error={errors.country} hint="รหัสประเทศตามต้นฉบับ เช่น PRT, GBR">{select('country', options.countries, false)}</Field><Field label="ผลลัพธ์การจอง *" name="reservation_status" error={errors.reservation_status}>{select('reservation_status', options.statuses)}</Field></div></div>
      <div className="form-section"><div className="section-title"><span>02</span><div><h2>ผู้เข้าพักและจำนวนคืน</h2><p>จำนวนคืนรวมไม่ใช่จำนวนห้องที่ขาย</p></div></div><div className="form-grid three"><Field label="ผู้ใหญ่ (คน) *" name="adults" error={errors.adults}>{numeric('adults', 1)}</Field><Field label="เด็ก (คน)" name="children" error={errors.children} hint="เว้นว่างเมื่อไม่ทราบ · 0 หมายถึงไม่มีเด็ก">{numeric('children', undefined, '1', false)}</Field><Field label="ทารก (คน) *" name="babies" error={errors.babies}>{numeric('babies', 0)}</Field></div><div className="form-grid"><Field label="คืนวันธรรมดา *" name="stays_in_week_nights" error={errors.stays_in_week_nights}>{numeric('stays_in_week_nights', 1)}</Field><Field label="คืนวันหยุด *" name="stays_in_weekend_nights" error={errors.stays_in_weekend_nights}>{numeric('stays_in_weekend_nights', 0)}</Field></div></div>
      <div className="form-section"><div className="section-title"><span>03</span><div><h2>ราคาและช่องทางการจอง</h2><p>ระบุราคาเฉลี่ยต่อวันและระยะเวลาจองล่วงหน้า</p></div></div><div className="form-grid"><Field label="ADR ราคาเฉลี่ยต่อวัน *" name="adr" error={errors.adr} hint="ยอมรับค่า 0 · หน่วยตาม Dataset ไม่ใช่ยอดรายรับรวม">{numeric('adr', undefined, '0.01')}</Field><Field label="Lead time (วัน) *" name="lead_time" error={errors.lead_time}>{numeric('lead_time', 0)}</Field><Field label="ช่องทางการจอง *" name="distribution_channel" error={errors.distribution_channel}>{select('distribution_channel', options.distributionChannels)}</Field><Field label="กลุ่มตลาด *" name="market_segment" error={errors.market_segment}>{select('market_segment', options.marketSegments)}</Field></div></div>
      {error && <div className="form-errors"><ErrorState message={error}/></div>}{Object.keys(errors).length > 0 && !error && <div className="form-errors"><p className="inline-error" role="alert">กรุณาตรวจข้อมูลที่ระบุไว้ก่อนบันทึก</p></div>}
      <div className="form-actions"><span>* ข้อมูลจำเป็น</span><button type="submit" className="button primary">{saving ? <><span className="spinner small-spinner"/>กำลังบันทึกลง Excel…</> : <><Icon name="plus" size={18}/>บันทึกรายการจอง</>}</button></div></fieldset></form>
      <aside className="form-aside"><div className="panel guide-card"><span className="guide-icon"><Icon name="file" size={22}/></span><h3>บันทึกแล้วไปที่ไหน?</h3><ol><li><strong>บันทึกใน Excel</strong><p>Backend เพิ่มรายการใน raw_data.xlsx และแจ้งสำเร็จเมื่อเขียนไฟล์เรียบร้อย</p></li><li><strong>เตรียมข้อมูลวิเคราะห์</strong><p>Refresh Power Query ใน analysis.xlsx เพื่ออ่านรายการล่าสุด</p></li><li><strong>เผยแพร่ Dashboard</strong><p>Refresh ข้อมูลใน Tableau แล้ว Publish ทับฉบับเดิมบน Tableau Public</p></li></ol></div><p className="aside-note"><Icon name="info" size={16}/>หาก Excel เปิดล็อกไฟล์อยู่ ให้ปิด raw_data.xlsx แล้วลองบันทึกอีกครั้ง</p></aside></div>}
  </>;
}
