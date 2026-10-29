import type { BookingInput, Options } from './types.js';

export function validateBooking(input: unknown, options?: Options): { value?: BookingInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { form: 'กรุณาส่งข้อมูลรายการจองเป็น object' } };
  const data = input as Record<string, unknown>;
  const strings = ['hotel', 'arrival_date', 'reserved_room_type', 'customer_type', 'reservation_status', 'distribution_channel', 'market_segment'];
  for (const field of strings) if (typeof data[field] !== 'string' || !(data[field] as string).trim()) errors[field] = 'กรุณาระบุข้อมูล';
  const date = typeof data.arrival_date === 'string' ? data.arrival_date : '';
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '2100-12-31') errors.arrival_date = 'กรุณาระบุวันที่ที่มีอยู่จริง ระหว่างปี 1900–2100';
  const integers = ['adults', 'babies', 'stays_in_week_nights', 'stays_in_weekend_nights', 'lead_time'];
  for (const field of integers) if (typeof data[field] !== 'number' || !Number.isSafeInteger(data[field]) || (data[field] as number) < 0) errors[field] = 'ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป';
  if (data.children !== null && (typeof data.children !== 'number' || !Number.isSafeInteger(data.children) || data.children < 0)) errors.children = 'ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป หรือไม่ระบุ';
  if (typeof data.adr !== 'number' || !Number.isFinite(data.adr) || data.adr < 0) errors.adr = 'ADR ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
  if (typeof data.adults === 'number' && typeof data.babies === 'number' && data.adults + data.babies + (typeof data.children === 'number' ? data.children : 0) === 0) errors.adults = 'ต้องมีผู้เข้าพักอย่างน้อย 1 คน';
  if (data.country !== null && (typeof data.country !== 'string' || data.country.length > 8)) errors.country = 'กรุณาเลือกรหัสประเทศหรือไม่ระบุ';
  if (!['Check-Out', 'Canceled', 'No-Show'].includes(String(data.reservation_status))) errors.reservation_status = 'กรุณาเลือก Check-Out, Canceled หรือ No-Show';
  if (options) {
    const categories: [string, string[]][] = [['hotel', options.hotels], ['customer_type', options.customerTypes], ['distribution_channel', options.distributionChannels], ['market_segment', options.marketSegments], ['reserved_room_type', options.roomsByHotel[String(data.hotel)] ?? []]];
    if (data.country !== null) categories.push(['country', options.countries]);
    for (const [field, values] of categories) if (!values.includes(String(data[field]))) errors[field] = 'กรุณาเลือกค่าที่มีอยู่ใน Dataset';
  }
  return Object.keys(errors).length ? { errors } : { value: Object.fromEntries([...strings, ...integers, 'children', 'adr', 'country'].map(key => [key, data[key]])) as unknown as BookingInput, errors };
}
