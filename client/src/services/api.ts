import type { Booking, BookingInput, BookingPage, Options, Summary } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public details: Record<string, string> = {}
  ) {
    super(message);
  }
}
async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจว่า Backend กำลังทำงานแล้วลองอีกครั้ง');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(body?.error || 'ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง', body?.details);
  return body as T;
}
export const api = {
  options: () => request<Options>('/options'),
  health: () => request<Record<string, unknown>>('/health'),
  bookings: (params: Record<string, string | number>, signal?: AbortSignal) =>
    request<BookingPage>(
      `/bookings?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`,
      undefined,
      signal
    ),
  booking: (id: string) => request<{ booking: Booking }>(`/bookings/${encodeURIComponent(id)}`),
  create: (booking: BookingInput) =>
    request<{ booking: Booking }>('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    }),
  summary: (source = 'original') =>
    request<Summary>(`/summary?source=${encodeURIComponent(source)}`),
};
