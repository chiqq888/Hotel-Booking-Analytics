export const ORIGINAL_COLUMNS = [
  'hotel',
  'is_canceled',
  'lead_time',
  'arrival_date_year',
  'arrival_date_month',
  'arrival_date_week_number',
  'arrival_date_day_of_month',
  'stays_in_weekend_nights',
  'stays_in_week_nights',
  'adults',
  'children',
  'babies',
  'meal',
  'country',
  'market_segment',
  'distribution_channel',
  'is_repeated_guest',
  'previous_cancellations',
  'previous_bookings_not_canceled',
  'reserved_room_type',
  'assigned_room_type',
  'booking_changes',
  'deposit_type',
  'agent',
  'company',
  'days_in_waiting_list',
  'customer_type',
  'adr',
  'required_car_parking_spaces',
  'total_of_special_requests',
  'reservation_status',
  'reservation_status_date',
] as const;
export const RAW_COLUMNS = [...ORIGINAL_COLUMNS, 'booking_id', 'data_source', 'created_at'];
export const NUMERIC_COLUMNS = new Set([
  'is_canceled',
  'lead_time',
  'arrival_date_year',
  'arrival_date_week_number',
  'arrival_date_day_of_month',
  'stays_in_weekend_nights',
  'stays_in_week_nights',
  'adults',
  'children',
  'babies',
  'is_repeated_guest',
  'previous_cancellations',
  'previous_bookings_not_canceled',
  'booking_changes',
  'days_in_waiting_list',
  'adr',
  'required_car_parking_spaces',
  'total_of_special_requests',
]);
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export type RawBooking = Record<string, string | number | null>;

export function arrivalDate(row: RawBooking): string | null {
  const month = MONTHS.indexOf(String(row.arrival_date_month));
  const year = Number(row.arrival_date_year),
    day = Number(row.arrival_date_day_of_month);
  if (month < 0 || !Number.isInteger(year) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day)
    return null;
  return date.toISOString().slice(0, 10);
}
export function totalNights(row: RawBooking): number | null {
  const a = row.stays_in_week_nights,
    b = row.stays_in_weekend_nights;
  return typeof a === 'number' && a >= 0 && typeof b === 'number' && b >= 0 ? a + b : null;
}
