import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { rawFile } from '../config.js';
import { AppError } from '../errors.js';
import type { RawBooking } from '../schema.js';
import { readRawWorkbook, writeRawWorkbook } from './xlsx-table.js';

const queues = new Map<string, Promise<unknown>>();
export class ExcelRepository {
  private records: RawBooking[] | null = null;
  private stamp = '';
  private loading: Promise<RawBooking[]> | null = null;
  constructor(public filename = rawFile) {}
  async read(): Promise<RawBooking[]> {
    let stat;
    try { stat = await fs.stat(this.filename); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AppError(503, 'ยังไม่มีข้อมูล กรุณาวาง hotel_bookings.csv แล้วรัน npm run import:data');
      throw error;
    }
    const stamp = `${stat.mtimeMs}:${stat.size}`;
    if (this.records && stamp === this.stamp) return this.records;
    if (this.loading) return this.loading;
    this.loading = readRawWorkbook(this.filename).then(records => { this.records = records; this.stamp = stamp; return records; }).finally(() => { this.loading = null; });
    return this.loading;
  }
  async mutate(update: (current: RawBooking[]) => Promise<RawBooking[]> | RawBooking[]): Promise<void> {
    const key = path.resolve(this.filename);
    const previous = queues.get(key) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const lockPath = `${this.filename}.lock`;
      let lock;
      for (let attempt = 0; attempt < 120; attempt++) {
        try { lock = await fs.open(lockPath, 'wx'); break; } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          if (attempt === 119) throw new AppError(409, 'มีงานเขียนหรือ import ข้อมูลกำลังทำงาน กรุณารอแล้วลองใหม่ หากโปรแกรมหยุดผิดปกติ ให้ตรวจว่าไม่มี Backend/import ทำงานก่อนลบไฟล์ .lock');
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      const temporary = path.join(path.dirname(this.filename), `.raw-${randomUUID()}.xlsx`);
      try {
        const excelOwner = path.join(path.dirname(this.filename), `~$${path.basename(this.filename)}`);
        try { await fs.access(excelOwner); throw new AppError(423, 'Excel กำลังเปิดไฟล์ข้อมูล กรุณาปิด raw_data.xlsx แล้วบันทึกใหม่'); } catch (error) { if (error instanceof AppError) throw error; if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        let current: RawBooking[] = [];
        try { current = await this.read(); } catch (error) { if (!(error instanceof AppError && error.status === 503)) throw error; }
        const records = await update(current);
        const ids = new Set(records.map(record => record.booking_id));
        if (ids.size !== records.length) throw new AppError(500, 'พบรหัสรายการซ้ำ จึงยังไม่บันทึกไฟล์');
        await writeRawWorkbook(temporary, records);
        const handle = await fs.open(temporary, 'r+');
        try { await handle.sync(); } finally { await handle.close(); }
        await fs.rename(temporary, this.filename);
        const stat = await fs.stat(this.filename);
        this.records = records; this.stamp = `${stat.mtimeMs}:${stat.size}`;
      } catch (error) {
        if (['EACCES', 'EPERM', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new AppError(423, 'ไม่สามารถบันทึกไฟล์ Excel ได้ กรุณาปิด raw_data.xlsx และตรวจสิทธิ์เขียนโฟลเดอร์ แล้วลองใหม่ ข้อมูลเดิมยังอยู่');
        throw error;
      } finally {
        await fs.rm(temporary, { force: true }).catch(() => {});
        await lock?.close();
        await fs.rm(lockPath, { force: true });
      }
    });
    queues.set(key, operation);
    try { await operation; } finally { if (queues.get(key) === operation) queues.delete(key); }
  }
}
