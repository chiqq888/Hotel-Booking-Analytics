import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import type { BookingService } from '../services/booking.service.js';
export function bookingRoutes(service: BookingService) {
  const router = Router(),
    controller = bookingController(service);
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', storage: 'Excel', tableauRefresh: 'manual' });
  });
  router.get('/bookings', controller.list);
  router.get('/bookings/:id', controller.detail);
  router.post('/bookings', controller.create);
  router.get('/options', controller.options);
  router.get('/summary', controller.summary);
  return router;
}
