export interface BookingInput {
  hotel: string;
  arrival_date: string;
  reserved_room_type: string;
  country: string | null;
  customer_type: string;
  adults: number;
  children: number | null;
  babies: number;
  stays_in_week_nights: number;
  stays_in_weekend_nights: number;
  adr: number;
  lead_time: number;
  reservation_status: string;
  distribution_channel: string;
  market_segment: string;
}

export interface Booking extends BookingInput {
  booking_id: string;
  data_source: 'original' | 'web';
  created_at: string | null;
  total_nights: number | null;
  is_canceled: number | null;
  [field: string]: string | number | null;
}

export interface Options {
  hotels: string[];
  roomsByHotel: Record<string, string[]>;
  countries: string[];
  customerTypes: string[];
  distributionChannels: string[];
  marketSegments: string[];
  statuses: string[];
}

export interface Summary {
  totalBookings: number;
  completedStays: number;
  canceledBookings: number;
  cancellationRate: number | null;
  averageAdr: number | null;
  estimatedLodgingRevenue: number;
  totalNights: number;
  dateFrom: string | null;
  dateTo: string | null;
  dataSource: string;
}
