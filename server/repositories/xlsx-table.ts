import ExcelJS from 'exceljs';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { RAW_COLUMNS, type RawBooking } from '../schema.js';

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const columnName = (n: number): string => n > 26 ? columnName(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + (n - 1) % 26) : String.fromCharCode(64 + n);

/** ExcelJS streaming preserves bounded memory. Insert a native Excel Table in the resulting OpenXML ZIP. */
export async function writeRawWorkbook(destination: string, records: RawBooking[]): Promise<void> {
  const base = `${destination}.base.xlsx`;
  try {
    const book = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: base, useStyles: true, useSharedStrings: false });
    const sheet = book.addWorksheet('RawBookings', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = RAW_COLUMNS.map(key => ({ key, width: Math.max(14, key.length + 2) }));
    const header = sheet.addRow(RAW_COLUMNS);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153C35' } };
    header.commit();
    for (const record of records) sheet.addRow(RAW_COLUMNS.map(key => record[key] ?? null)).commit();
    sheet.commit();
    await book.commit();
    await insertTable(base, destination, records.length);
  } finally { await fs.promises.rm(base, { force: true }); }
}

async function insertTable(source: string, destination: string, rows: number) {
  const archive = archiver('zip', { zlib: { level: 6 } });
  const output = fs.createWriteStream(destination);
  const completed = pipeline(archive, output);
  void completed.catch(() => {}); // Observe early stream failures until the final await below.
  const parser = fs.createReadStream(source).pipe(unzipper.Parse({ forceStream: true }));
  for await (const entry of parser) {
    if (entry.path === '[Content_Types].xml') {
      const content = (await entry.buffer()).toString('utf8').replace('</Types>', '<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>');
      archive.append(content, { name: entry.path });
    } else if (entry.path === 'xl/worksheets/sheet1.xml') {
      let tail = Buffer.alloc(0);
      const patch = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          const combined = Buffer.concat([tail, chunk]);
          const end = Math.max(0, combined.length - 512);
          this.push(combined.subarray(0, end)); tail = combined.subarray(end); callback();
        },
        flush(callback) { this.push(tail.toString('utf8').replace('</worksheet>', '<tableParts count="1"><tablePart r:id="rIdTable1"/></tableParts></worksheet>')); callback(); },
      });
      archive.append(entry.pipe(patch), { name: entry.path });
    } else archive.append(entry, { name: entry.path });
  }
  archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdTable1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>', { name: 'xl/worksheets/_rels/sheet1.xml.rels' });
  const ref = `A1:${columnName(RAW_COLUMNS.length)}${rows + 1}`;
  archive.append(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="tblRawBookings" displayName="tblRawBookings" ref="${ref}" totalsRowShown="0"><autoFilter ref="${ref}"/><tableColumns count="${RAW_COLUMNS.length}">${RAW_COLUMNS.map((name, index) => `<tableColumn id="${index + 1}" name="${xml(name)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`, { name: 'xl/tables/table1.xml' });
  await archive.finalize();
  await completed;
}

export async function readRawWorkbook(filename: string): Promise<RawBooking[]> {
  const records: RawBooking[] = [];
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filename, { sharedStrings: 'cache', hyperlinks: 'ignore', styles: 'ignore', worksheets: 'emit' });
  for await (const sheet of reader) {
    // Streaming ExcelJS can emit sheet1 before workbook.xml on small ZIPs, leaving
    // its temporary name "Sheet1". Our raw workbook has one sheet; verify its
    // schema below rather than relying on ZIP-entry timing for the display name.
    if (Number((sheet as unknown as { id: string | number }).id) !== 1) continue;
    let headers: string[] = [];
    for await (const row of sheet) {
      const values = row.values as (string | number | null)[];
      if (row.number === 1) {
        headers = values.slice(1).map(String);
        if (headers.length !== RAW_COLUMNS.length || RAW_COLUMNS.some((key, i) => headers[i] !== key)) throw new Error('Invalid raw workbook schema');
      } else {
        const record: RawBooking = {};
        headers.forEach((key, i) => { record[key] = values[i + 1] ?? null; });
        records.push(record);
      }
    }
  }
  if (!records.length) throw new Error('No RawBookings data found');
  const ids = new Set(records.map(record => record.booking_id));
  if (ids.size !== records.length || ids.has(null) || ids.has(undefined as never)) throw new Error('Duplicate or missing booking IDs');
  return records;
}
