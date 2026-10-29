import { randomUUID } from 'node:crypto';
import type { Booking, Options, Summary } from '../../shared/types.js';
import { validateBooking } from '../../shared/validation.js';
import { AppError } from '../errors.js';
import { ExcelRepository } from '../repositories/excel.repository.js';
import { arrivalDate, MONTHS, ORIGINAL_COLUMNS, totalNights, type RawBooking } from '../schema.js';

function view(row: RawBooking): Booking { return { ...row, arrival_date: arrivalDate(row), total_nights: totalNights(row) } as Booking; }
const strings = (records: RawBooking[], field: string) => [...new Set(records.map(row => row[field]).filter((value): value is string => typeof value === 'string' && value !== '' && value !== 'NULL'))].sort();
export class BookingService {
  constructor(public repository = new ExcelRepository()) {}
  async options(): Promise<Options> {
    const rows = (await this.repository.read()).filter(row => row.data_source === 'original');
    const hotels = strings(rows, 'hotel');
    return { hotels, roomsByHotel: Object.fromEntries(hotels.map(hotel => [hotel, strings(rows.filter(row => row.hotel === hotel), 'reserved_room_type')])), countries: strings(rows, 'country'), customerTypes: strings(rows, 'customer_type'), distributionChannels: strings(rows, 'distribution_channel'), marketSegments: strings(rows, 'market_segment'), statuses: strings(rows, 'reservation_status') };
  }
  async list(params: Record<string, unknown>) {
    const page = this.integer(params.page, 1, 1, 1_000_000, 'page');
    const pageSize = this.integer(params.pageSize, 25, 1, 100, 'pageSize');
    const rows = this.filter(await this.repository.read(), params);
    return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(view), total: rows.length, page, pageSize };
  }
  async detail(id: string) {
    const row = (await this.repository.read()).find(row => row.booking_id === id);
    if (!row) throw new AppError(404, 'ไม่พบรายการจองนี้');
    return view(row);
  }
  async create(input: unknown) {
    const { value, errors } = validateBooking(input, await this.options());
    if (!value) throw new AppError(400, 'ข้อมูลไม่ถูกต้อง กรุณาตรวจช่องที่ระบุ', errors);
    const date = new Date(`${value.arrival_date}T00:00:00Z`);
    const thursday = new Date(date); thursday.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const weekNumber = Math.ceil((((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7);
    const row: RawBooking = Object.fromEntries(ORIGINAL_COLUMNS.map(key => [key, null]));
    for (const [key, item] of Object.entries(value)) if (key !== 'arrival_date') row[key] = item;
    Object.assign(row, { booking_id: `WEB-${randomUUID()}`, data_source: 'web', created_at: new Date().toISOString(), arrival_date_year: date.getUTCFullYear(), arrival_date_month: MONTHS[date.getUTCMonth()], arrival_date_day_of_month: date.getUTCDate(), arrival_date_week_number: weekNumber, is_canceled: value.reservation_status === 'Check-Out' ? 0 : 1 });
    await this.repository.mutate(current => [...current, row]);
    return view(row);
  }
  async summary(params: Record<string, unknown>): Promise<Summary> {
    const source = typeof params.source === 'string' ? params.source : 'original';
    const rows = this.filter(await this.repository.read(), { ...params, source });
    let completed = 0, canceled = 0, adrSum = 0, adrCount = 0, revenue = 0, nights = 0;
    let from: string | null = null, to: string | null = null;
    for (const row of rows) {
      const date = arrivalDate(row); if (date && (!from || date < from)) from = date; if (date && (!to || date > to)) to = date;
      if (row.reservation_status === 'Check-Out') completed++;
      if (row.is_canceled === 1) canceled++;
      if (typeof row.adr === 'number' && row.adr >= 0) { adrSum += row.adr; adrCount++; }
      const n = totalNights(row); if (n !== null) nights += n;
      if (row.reservation_status === 'Check-Out' && n !== null && typeof row.adr === 'number' && row.adr >= 0) revenue += n * row.adr;
    }
    return { totalBookings: rows.length, completedStays: completed, canceledBookings: canceled, cancellationRate: rows.length ? canceled / rows.length : null, averageAdr: adrCount ? adrSum / adrCount : null, estimatedLodgingRevenue: revenue, totalNights: nights, dateFrom: from, dateTo: to, dataSource: source };
  }
  private integer(value: unknown, fallback: number, min: number, max: number, field: string) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new AppError(400, `ค่า ${field} ต้องเป็นจำนวนเต็มระหว่าง ${min}–${max}`);
    return Number(value);
  }
  private filter(rows: RawBooking[], params: Record<string, unknown>) {
    for (const key of ['source','hotel','status','room','from','to','q']) if (params[key] !== undefined && typeof params[key] !== 'string') throw new AppError(400, `ตัวกรอง ${key} ไม่ถูกต้อง`);
    const p = params as Record<string, string>;
    if (p.source && !['original','web','all'].includes(p.source)) throw new AppError(400, 'แหล่งข้อมูลต้องเป็น original, web หรือ all');
    for (const key of ['from','to']) if (p[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(p[key]) || !Number.isFinite(new Date(`${p[key]}T00:00:00Z`).getTime()) || new Date(`${p[key]}T00:00:00Z`).toISOString().slice(0,10) !== p[key])) throw new AppError(400, 'ช่วงวันที่ไม่ถูกต้อง');
    if (p.from && p.to && p.from > p.to) throw new AppError(400, 'วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด');
    const q = (p.q ?? '').toLowerCase().slice(0, 200);
    return rows.filter(row => {
      if (p.source && p.source !== 'all' && row.data_source !== p.source) return false;
      if (p.hotel && row.hotel !== p.hotel) return false;
      if (p.status && row.reservation_status !== p.status) return false;
      if (p.room && row.reserved_room_type !== p.room) return false;
      if (p.from || p.to) { const date = arrivalDate(row); if (!date || (p.from && date < p.from) || (p.to && date > p.to)) return false; }
      return !q || ['booking_id','hotel','country','customer_type','market_segment','reservation_status'].some(field => String(row[field] ?? '').toLowerCase().includes(q));
    });
  }
}
