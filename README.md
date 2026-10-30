# Hotel Booking Analytics

ระบบวิเคราะห์การจองโรงแรมเพื่อการศึกษา ใช้ **Excel + Tableau Public + Web** โดยข้อมูลจริง Hotel Booking Demand เป็นฐาน และแยกรายการสาธิตจากเว็บด้วย `data_source=web`

## เริ่มใช้งาน

ต้องมี Node.js 22.12 ขึ้นไป (ตรวจบน Node 25.2.1), npm และ Windows ที่มี Excel Desktop สำหรับขั้นตอน Power Query/Forecast/Goal Seek ไม่ต้องใช้ SQL, Docker หรือบริการเสียเงิน

### รันคำสั่งเดียว (แนะนำ)

เปิด PowerShell ในโฟลเดอร์โปรเจกต์แล้วรัน:

```powershell
.\start.cmd
```

หรือดับเบิลคลิกไฟล์ `start.cmd` ได้เลย สคริปต์จะตรวจ Node.js, ติดตั้งแพ็กเกจเมื่อยังไม่มีหรือไม่ครบ, สร้าง `.env` เมื่อยังไม่มี, เตรียมข้อมูลเมื่อยังไม่มี workbook, build และเปิดเบราว์เซอร์ให้เมื่อเว็บกับข้อมูลพร้อมแล้ว

เปิดใช้งานที่ [http://127.0.0.1:3001](http://127.0.0.1:3001) หรือพอร์ต `PORT` ใน `.env` ถ้าพอร์ตนั้นถูกใช้ สคริปต์จะเลือกพอร์ตว่างถัดไปให้อัตโนมัติ ใช้ URL ที่แสดงหลังคำว่า `Ready:` ให้เปิดหน้าต่าง Terminal นี้ค้างไว้ตลอดการใช้งาน และกด **Ctrl+C** เมื่อต้องการหยุด

รันซ้ำด้วยคำสั่งเดิมได้ สคริปต์ใช้ `.env` และ `raw_data.xlsx` เดิม โดย build ใหม่ทุกครั้งเพื่อให้โค้ดและลิงก์ Tableau ตรงกับค่าปัจจุบัน ครั้งแรกที่ไม่มีทั้ง workbook และ CSV จะดาวน์โหลด Dataset ต้นฉบับให้อัตโนมัติบน Windows จึงต้องใช้อินเทอร์เน็ต ถ้าตั้ง `DATASET_PATH` เองต้องเตรียม CSV ไว้ตามพาธนั้น

คำสั่งเดียวกันผ่าน npm คือ `npm.cmd run ready` หากไม่ต้องการเปิดเบราว์เซอร์ใช้ `.\start.cmd --no-open` การเลือกพอร์ตสำรองมีผลเฉพาะรอบที่รัน โดยไม่แก้ค่าใน `.env`

บน Windows หากกด Ctrl+C แล้วขึ้น `Terminate batch job (Y/N)?` ให้พิมพ์ `Y` แล้วกด Enter เพื่อปิดสคริปต์

สคริปต์นี้เตรียมเว็บและ API ส่วนการสร้าง/Refresh Excel วิเคราะห์ และการ Publish Tableau ใช้ขั้นตอนด้านล่าง

### รันแบบพัฒนา

ถ้าต้องการให้หน้าเว็บเปลี่ยนทันทีระหว่างแก้โค้ด ให้รันทีละคำสั่ง:

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run import:data
npm.cmd run dev
```

เปิด [เว็บไซต์บนเครื่อง](http://127.0.0.1:5173) ส่วน API อยู่ที่ `http://127.0.0.1:3001/api/health` หากไฟล์ `.env` มีอยู่แล้วให้แก้ค่าในไฟล์เดิมแทนการคัดลอกทับ

Dataset ที่ส่งมอบอยู่ใน `dataset/hotel_bookings.csv` แล้ว ไม่ต้องดาวน์โหลดซ้ำ หากย้ายเฉพาะโค้ด ให้วาง CSV จาก [Kaggle ต้นทาง](https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand) ไว้ตำแหน่งนี้ หรือรัน:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/download-dataset.ps1
```

ไฟล์ CSV ต้นฉบับไม่ถูกแก้ไข การ import ตรวจ schema 32 คอลัมน์และขั้นต่ำ 10,000 แถว คำสั่งซ้ำจะสร้างรายการ original ชุดเดิมพร้อมรักษารายการ web และใช้ `booking_id` เดิมตามลำดับแถวต้นฉบับ อย่าสลับลำดับหรือเปลี่ยน Dataset เป็นชุดอื่นภายใต้รหัสเดิม

## สร้างและ Refresh Excel

ปิด `raw_data.xlsx` และ `analysis.xlsx` ก่อนเริ่ม สคริปต์เปิด Excel instance ของตนเองแบบซ่อนและปิดเฉพาะ instance ที่สร้าง

```powershell
npm.cmd run excel:setup
npm.cmd run excel:refresh
```

ใช้ setup ครั้งแรกเพื่อสร้าง `data/analysis.xlsx` พร้อม native Queries/Connections และใช้ refresh เพื่ออัปเดตงานเดิม ปรับพาธใน Config/สคริปต์เมื่อย้ายเครื่อง ดูรายละเอียดใน `excel/README.md` หลักฐานการรันอยู่ใน `excel/verification.json`

Backend เขียนเฉพาะ `data/raw_data.xlsx` มี Excel Table ชื่อ `tblRawBookings` การบันทึกทุกครั้งเข้าคิว มี lock ระหว่าง process เขียนไฟล์ชั่วคราวและแทนที่ไฟล์จริงหลังเสร็จ หากไฟล์เปิดค้างใน Excel จะได้รับข้อความให้ปิดไฟล์ก่อนลองใหม่ ห้ามลบ `.lock` ขณะ import หรือ Backend กำลังเขียน

`analysis.xlsx` อ่าน raw ผ่าน Power Query เก็บ FactBookings, dimensions, data quality, สถิติรายเดือน, forecast และ What-if แยกกัน สคริปต์รอ Refresh Fact จบก่อน Refresh ตารางที่พึ่งพา แล้วจึงคำนวณและบันทึก ไม่ใช้ ExcelJS เขียนทับ workbook วิเคราะห์ การกด Refresh All ครั้งเดียวไม่รับประกันลำดับของ FactSnapshot ให้ใช้สคริปต์เป็นวิธีหลัก

## เชื่อม Tableau Public

1. ทำตาม `tableau/BUILD_GUIDE.md` เพื่อเชื่อมตารางจาก analysis.xlsx และสร้าง Dashboard/Story 4 หน้า
2. ตรวจตัวเลขกับ Excel ภายใต้ data_source และตัวกรองเดียวกัน
3. Publish ไปบัญชี Tableau Public ของผู้ใช้ แล้วคัดลอก URL ของ visualization
4. ตั้ง `VITE_TABLEAU_VIZ_URL=` ใน `.env` เป็น URL ที่ Publish จริง แล้ว restart Vite หรือ build ใหม่

ค่าเริ่มต้น URL ว่าง หน้า Dashboard จะระบุว่ายังไม่เชื่อมต่อและไม่มีกราฟ Tableau จำลอง การโหลดหน้าเว็บใหม่อ่านฉบับที่ Publish แล้วเท่านั้น

หน้าแดชบอร์ดมีปุ่มสลับ 2 หน้า ตั้งลิงก์หน้าแรกใน `VITE_TABLEAU_VIZ_URL` และหน้าที่สองใน `VITE_TABLEAU_VIZ_URL_2` ของ `.env` แต่ละลิงก์ใช้ Dashboard หรือ Story ที่เผยแพร่แล้วได้ หากยังไม่มีลิงก์หน้าที่สองให้เว้นว่าง หน้าแรกยังใช้งานได้ตามเดิม หลังแก้ค่าต้อง restart Vite หรือ build ใหม่

```dotenv
VITE_TABLEAU_VIZ_URL=https://public.tableau.com/views/ชื่อWorkbook/หน้าแรก
VITE_TABLEAU_VIZ_URL_2=https://public.tableau.com/views/ชื่อWorkbook/หน้าที่สอง
```

เมื่อเพิ่มรายการเว็บ ใช้ลำดับ **บันทึกบนเว็บ → refresh Excel → Refresh Extract ใน Tableau → Publish ทับเดิม → โหลด Dashboard ใหม่** Tableau Public ไม่อ่านไฟล์ Excel ในเครื่องแบบ real-time เลือกตัวกรองรวม `web` เมื่อต้องการเห็นรายการสาธิต ส่วนรายงานวิชาการใช้ `original`

## Build และทดสอบ

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd start
```

คำสั่ง start ให้ API และเว็บที่ build แล้วผ่าน [พอร์ต 3001](http://127.0.0.1:3001) ใน origin เดียว สำหรับพัฒนารัน dev แล้วเปิดพอร์ต 5173 ซึ่ง proxy API ให้

`npm test` ใช้ข้อมูล fixture ในโฟลเดอร์ชั่วคราว แยกจาก Dataset จริง ทดสอบ validation, การบันทึกพร้อมกัน/เปิด repository ใหม่, CSV BOM และ quoted newline, import ซ้ำรักษา web, native Excel Table และไฟล์ถูกล็อกบน Windows ดูผลตรวจจริงและสิ่งที่ยังต้องทำใน `CHECKLIST.md`

ผลส่งมอบผ่าน build/typecheck, API integration4ชุด, desktop/mobile UI และ native Excel13Queries/Forecast/GoalSeekแล้ว ผลตรวจแยกอยู่ใน `docs/live-verification.json`, `excel/verification.json`, `docs/analysis-verification.json` ส่วน Tableauยังใช้คู่มือทดแทนเพราะเครื่องนี้เป็นDesktopFreeEdition ไม่ใช่PublicEdition ยังไม่ได้สร้าง/PublishDashboardหรือStory

สคริปต์ auditเสริมใช้Python3พร้อมstandard library ไม่จำเป็นต่อการรันเว็บ: `python scripts/audit-dataset.py`, `python scripts/audit-forecast.py`, `python scripts/verify-analysis.py`, `python scripts/analyze-data.py` ใช้ตรวจผลซ้ำโดยไม่เขียนทับExcel ส่วน `node scripts/verify-live.mjs` ตรวจAPIที่เปิดอยู่โดยไม่เพิ่มข้อมูล

## โครงสร้างสำคัญ

| ตำแหน่ง | หน้าที่ |
|---|---|
| client/src/pages, components, services, types | เว็บ React ภาษาไทย 3 หน้า |
| shared | TypeScript types และ validation ร่วมกัน |
| server/routes → controllers → services → repositories | API และ Excel repository |
| scripts/import-data.ts | นำเข้า CSV โดยโปรแกรม |
| scripts/audit-dataset.py | ตรวจ Dataset อิสระและเขียน docs/dataset-audit.json |
| dataset/hotel_bookings.csv | ต้นฉบับที่ไม่แก้ไข |
| data/raw_data.xlsx | ข้อมูล original + web พร้อมรหัสรายการและแหล่งที่มา |
| data/analysis.xlsx | Power Query/analytics สร้างด้วย Excel จริง |
| excel/power-query | M queries สำหรับนำกลับไปสร้างซ้ำ |
| tableau | นิยาม calculated fields, วิธีสร้าง Dashboard/Story |
| docs/screenshots | ภาพหน้าจอจริงประกอบคู่มือ |
| docs/ANALYSIS_FINDINGS.md | ผลจริงแยกโรงแรม/กลุ่มการจอง/ตลาด/ช่องทาง/lead time และการกระจาย ADR จาก original |

## ความหมายและข้อจำกัด

ตรวจจริง 119,390 รายการจากโรงแรม 2 แห่ง ระหว่าง 2015-07-01 ถึง 2017-08-31 ไม่มี Customer ID ที่ใช้ระบุตัวบุคคล `HBD-...` และ `WEB-...` เป็นรหัสรายการที่ระบบสร้าง รหัสห้อง A/B/C คงความหมายตามต้นฉบับ ไม่มีชื่อห้องที่แต่งขึ้น

จำนวนคืนไม่ใช่จำนวนห้อง ไม่มีข้อมูลความจุเพื่อคำนวณ occupancy ข้อมูลเก่าใช้ศึกษารูปแบบ/ทดสอบ Forecast ไม่บอกสถานการณ์ปัจจุบัน Revenue เป็นค่าประมาณ `ADR × nights` เฉพาะ Check-Out ที่มีค่าใช้คำนวณได้ ไม่ใช่งบรายได้หรือกำไร

นิยามทั้งหมด กฎ missing/invalid/outlier, default ของช่องเว็บที่ไม่ได้กรอก และ PK/FK อยู่ใน `DATA_DICTIONARY.md` คู่มือใช้งานอยู่ใน `USER_MANUAL.md` ที่มาอยู่ใน `REFERENCES.md`

ระบบนี้ออกแบบให้รันบนเครื่องเพื่อการเรียน ไม่มีระบบสมาชิก ไม่ควรเปิด API เขียนข้อมูลนี้สู่เครือข่ายสาธารณะโดยไม่เพิ่มการควบคุมการเข้าถึงตามการใช้งานจริง
