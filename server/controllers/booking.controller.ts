import type { Request, Response } from 'express';
import { BookingService } from '../services/booking.service.js';
export function bookingController(service: BookingService) {
  return {
    list: async (req: Request, res: Response) => { res.json(await service.list(req.query)); },
    detail: async (req: Request, res: Response) => { res.json({ booking: await service.detail(String(req.params.id)) }); },
    create: async (req: Request, res: Response) => { res.status(201).json({ booking: await service.create(req.body) }); },
    options: async (_req: Request, res: Response) => { res.json(await service.options()); },
    summary: async (req: Request, res: Response) => { res.json(await service.summary(req.query)); },
  };
}
