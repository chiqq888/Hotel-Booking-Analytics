import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import request from 'supertest';
import unzipper from 'unzipper';
import { createApp } from '../app.js';
import { BookingService } from '../services/booking.service.js';
import { ExcelRepository } from '../repositories/excel.repository.js';
import { ORIGINAL_COLUMNS, type RawBooking } from '../schema.js';
import { importDataset } from '../../scripts/import-data.js';

// Tiny fixtures exercise storage semantics only. They are never copied into production data/.
function fixture(id = 'HBD-0000001'): RawBooking {
  return { ...Object.fromEntries(ORIGINAL_COLUMNS.map(field => [field, null])), booking_id: id, data_source: 'original', created_at: null, hotel: 'City Hotel', arrival_date_year: 2017, arrival_date_month: 'August', arrival_date_week_number: 31, arrival_date_day_of_month: 1, stays_in_week_nights: 2, stays_in_weekend_nights: 0, adults: 1, children: null, babies: 0, lead_time: 30, adr: 100, country: 'PRT', customer_type: 'Transient', reserved_room_type: 'A', market_segment: 'Direct', distribution_channel: 'Direct', reservation_status: 'Check-Out', is_canceled: 0 };
}
const validInput = { hotel: 'City Hotel', arrival_date: '2017-08-02', reserved_room_type: 'A', country: 'PRT', customer_type: 'Transient', adults: 2, children: null, babies: 0, stays_in_week_nights: 2, stays_in_weekend_nights: 1, adr: 95, lead_time: 10, reservation_status: 'Check-Out', distribution_channel: 'Direct', market_segment: 'Direct' };

async function setup(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hotel-analytics-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'raw_data.xlsx');
  const repository = new ExcelRepository(filename);
  await repository.mutate(() => [fixture()]);
  const service = new BookingService(repository);
  return { directory, filename, repository, service, app: createApp(service) };
}

test('native Excel Table, API validation, concurrent durable writes, filters and restart', async t => {
  const { filename, repository, app } = await setup(t);
  const zip = await unzipper.Open.file(filename);
  const table = await zip.files.find(file => file.path === 'xl/tables/table1.xml')!.buffer();
  assert.match(table.toString(), /name="tblRawBookings"/);
  assert.match(table.toString(), /ref="A1:AI2"/);

  const health = await request(app).get('/api/health'); assert.equal(health.status, 200);
  const invalid = await request(app).post('/api/bookings').send({ ...validInput, arrival_date: '2017-02-30', adults: -1 });
  assert.equal(invalid.status, 400); assert.ok(invalid.body.details.arrival_date); assert.ok(invalid.body.details.adults);
  assert.equal((await repository.read()).length, 1);
  assert.equal((await request(app).get('/api/bookings?pageSize=999')).status, 400);
  assert.equal((await request(app).get('/api/bookings?from=2017-02-30')).status, 400);

  const responses = await Promise.all([
    request(app).post('/api/bookings').send(validInput),
    request(app).post('/api/bookings').send({ ...validInput, reservation_status: 'No-Show', children: 0 }),
  ]);
  responses.forEach(response => assert.equal(response.status, 201, JSON.stringify(response.body)));
  const ids = responses.map(response => response.body.booking.booking_id);
  assert.equal(new Set(ids).size, 2); ids.forEach(id => assert.match(id, /^WEB-/));
  assert.equal(responses[1].body.booking.is_canceled, 1);
  const restarted = new ExcelRepository(filename);
  assert.equal((await restarted.read()).length, 3);
  const restartedApp = createApp(new BookingService(restarted));
  const page = await request(restartedApp).get('/api/bookings?source=web&pageSize=1&page=2&hotel=City%20Hotel');
  assert.equal(page.body.total, 2); assert.equal(page.body.items.length, 1); assert.equal(page.body.page, 2);
  const detail = await request(restartedApp).get(`/api/bookings/${ids[0]}`);
  assert.equal(detail.body.booking.children, null); assert.equal(detail.body.booking.total_nights, 3);
  const summary = await request(restartedApp).get('/api/summary');
  assert.equal(summary.body.totalBookings, 1); assert.equal(summary.body.dataSource, 'original'); assert.equal(summary.body.estimatedLodgingRevenue, 200);
  const all = await request(restartedApp).get('/api/summary?source=all');
  assert.equal(all.body.totalBookings, 3); assert.equal(all.body.canceledBookings, 1);
});

test('CSV BOM/quoted newline parsing, repeated import and web preservation', async t => {
  const { directory, repository, service } = await setup(t);
  await service.create(validInput);
  const csvFile = path.join(directory, 'fixture.csv');
  const first = fixture(), second = fixture('HBD-0000002'); second.meal = 'Quoted, field\nsecond line';
  const escape = (value: unknown) => value === null || value === undefined ? '' : `"${String(value).replace(/"/g, '""')}"`;
  await fs.writeFile(csvFile, '\uFEFF' + ORIGINAL_COLUMNS.join(',') + '\r\n' + [first, second].map(row => ORIGINAL_COLUMNS.map(key => escape(row[key])).join(',')).join('\r\n'));
  const before = createHash('sha256').update(await fs.readFile(csvFile)).digest('hex');
  await importDataset(csvFile, repository, 2);
  await importDataset(csvFile, repository, 2);
  const rows = await new ExcelRepository(repository.filename).read();
  assert.equal(rows.length, 3); assert.equal(rows.filter(row => row.data_source === 'web').length, 1);
  assert.equal(rows[0].booking_id, 'HBD-0000001'); assert.equal(rows[1].booking_id, 'HBD-0000002');
  assert.equal(rows[1].meal, 'Quoted, field\nsecond line');
  assert.equal(createHash('sha256').update(await fs.readFile(csvFile)).digest('hex'), before);
  await fs.writeFile(csvFile, 'wrong,header\n1,2');
  await assert.rejects(importDataset(csvFile, repository, 2), /schema/);
  assert.equal((await repository.read()).length, 3);
});

test('Excel owner file blocks writes without damaging existing workbook', async t => {
  const { directory, filename, service } = await setup(t);
  const before = await fs.readFile(filename);
  const owner = path.join(directory, '~$raw_data.xlsx');
  await fs.writeFile(owner, 'Excel lock fixture');
  await assert.rejects(service.create(validInput), (error: unknown) => (error as { status: number }).status === 423);
  assert.deepEqual(await fs.readFile(filename), before);
  await fs.rm(owner);
  await service.create(validInput);
  assert.equal((await new ExcelRepository(filename).read()).length, 2);
});

test('Windows exclusive file lock preserves previous XLSX and reports actionable error', { skip: process.platform !== 'win32' }, async t => {
  const { filename, service } = await setup(t);
  await service.options();
  const before = await fs.readFile(filename);
  const script = "$ErrorActionPreference='Stop'; $locked=[System.IO.File]::Open($args[0],[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None); [Console]::WriteLine('LOCKED'); [Console]::ReadLine() | Out-Null; $locked.Dispose()";
  // Pass the file path through stdin-free environment to avoid command interpolation.
  const child = spawn('powershell.exe', ['-NoProfile', '-Command', script.replace('$args[0]', '$env:HOTEL_TEST_LOCK_PATH')], { windowsHide: true, env: { ...process.env, HOTEL_TEST_LOCK_PATH: filename } });
  const ready = new Promise<void>((resolve, reject) => { child.stdout.on('data', data => { if (String(data).includes('LOCKED')) resolve(); }); child.once('error', reject); child.once('exit', code => { if (code !== 0) reject(new Error(`Lock helper exit ${code}`)); }); });
  try {
    await ready;
    await assert.rejects(service.create(validInput), (error: unknown) => (error as { status: number }).status === 423);
  } finally { child.stdin.end('\n'); await new Promise(resolve => child.once('exit', resolve)); }
  assert.deepEqual(await fs.readFile(filename), before);
});
