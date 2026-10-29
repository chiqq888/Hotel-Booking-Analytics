import express, { type ErrorRequestHandler } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { AppError } from './errors.js';
import { BookingService } from './services/booking.service.js';
import { bookingRoutes } from './routes/booking.routes.js';

export function createApp(service = new BookingService()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', bookingRoutes(service));
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'ไม่พบ API ที่ระบุ' }); });
  const clientDir = path.resolve('dist/client');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('/{*path}', (_req, res) => { res.sendFile(path.join(clientDir, 'index.html')); });
  }
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof AppError) { res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) }); return; }
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }); return; }
    if ((error as { type?: string }).type === 'entity.too.large') { res.status(413).json({ error: 'ข้อมูลมีขนาดใหญ่เกินกำหนด' }); return; }
    console.error('API failure:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอ่านหรือบันทึกข้อมูล กรุณาตรวจสถานะไฟล์ Excel และลองใหม่' });
  };
  app.use(errorHandler);
  return app;
}
