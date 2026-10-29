import fs from 'node:fs/promises';
const base = process.env.API_URL || 'http://127.0.0.1:3001';
const request = async path => {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
  return response.json();
};
const health = await request('/api/health');
const summary = await request('/api/summary?source=original');
const web = await request('/api/bookings?source=web&page=1&pageSize=100');
const expected = JSON.parse(await fs.readFile(new URL('../docs/dataset-audit.json', import.meta.url), 'utf8'));
for (const key of ['totalBookings','completedStays','canceledBookings','cancellationRate','estimatedLodgingRevenue']) {
  if (Math.abs(summary[key] - expected[key]) > 0.000001) throw new Error(`Original metric mismatch: ${key}`);
}
if (Math.abs(summary.averageAdr - expected.averageAdrNonnegativePerBooking) > 0.000001) throw new Error('Average ADR mismatch');
const result = { checkedAtUtc: new Date().toISOString(), base, health, originalSummary: summary,
  originalMetricsMatchIndependentCsvAudit: true, webTotal: web.total,
  webIds: web.items.map(item => item.booking_id), note: 'Read from running API after root restarted the Backend process. No records written by this script.' };
await fs.writeFile(new URL('../docs/live-verification.json', import.meta.url), JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
