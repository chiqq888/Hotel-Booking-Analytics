export type { Booking, BookingInput, Options, Summary } from '../../../shared/types';
export interface BookingPage {
  items: import('../../../shared/types').Booking[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Filters {
  q: string;
  source: string;
  hotel: string;
  status: string;
  room: string;
  from: string;
  to: string;
}
export type Page = 'bookings' | 'new' | 'dashboard';
