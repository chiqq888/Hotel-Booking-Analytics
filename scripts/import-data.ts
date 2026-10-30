import fs from 'node:fs';
import { parse } from 'csv-parse';
import { pathToFileURL } from 'node:url';
import { config } from '../server/config.js';
import { ExcelRepository } from '../server/repositories/excel.repository.js';
import { NUMERIC_COLUMNS, ORIGINAL_COLUMNS, type RawBooking } from '../server/schema.js';

export async function importDataset(
  csvFile = config.datasetPath,
  repository = new ExcelRepository(),
  minRows = 10000
) {
  const records: RawBooking[] = [];
  let schemaVerified = false;
  const source = fs.createReadStream(csvFile);
  const parser = parse({
    bom: true,
    columns: (headers: string[]) => {
      if (
        headers.length !== ORIGINAL_COLUMNS.length ||
        ORIGINAL_COLUMNS.some((name, i) => headers[i] !== name)
      )
        throw new Error(
          `CSV schema ต้องมี ${ORIGINAL_COLUMNS.length} คอลัมน์ตาม Hotel Booking Demand และเรียงตามต้นฉบับ`
        );
      schemaVerified = true;
      return headers;
    },
    skip_empty_lines: true,
    relax_column_count: false,
  });
  source.on('error', (error) => parser.destroy(error));
  source.pipe(parser);
  for await (const item of parser) {
    const row: RawBooking = {};
    for (const field of ORIGINAL_COLUMNS) {
      const value = String(item[field]);
      row[field] =
        value === '' || value === 'NULL' || value === 'NA'
          ? null
          : NUMERIC_COLUMNS.has(field) && Number.isFinite(Number(value))
            ? Number(value)
            : value;
    }
    row.booking_id = `HBD-${String(records.length + 1).padStart(7, '0')}`;
    row.data_source = 'original';
    row.created_at = null;
    records.push(row);
  }
  if (!schemaVerified || records.length < minRows)
    throw new Error(
      `ต้องใช้ข้อมูลจริงอย่างน้อย ${minRows.toLocaleString()} แถว (พบ ${records.length})`
    );
  let webRows = 0;
  await repository.mutate((current) => {
    const web = current.filter((row) => row.data_source === 'web');
    webRows = web.length;
    return [...records, ...web];
  });
  return {
    originalRows: records.length,
    preservedWebRows: webRows,
    columns: ORIGINAL_COLUMNS.length,
    uniqueIds: true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importDataset()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
