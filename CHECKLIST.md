# สถานะการตรวจรับ

ปรับปรุงวันที่ 29 ตุลาคม 2026 เอกสารนี้แยกโค้ดที่มี ผลที่ทดสอบจริง และงานที่ยังต้องทำ ไม่ถือว่ามีไฟล์ M/คู่มือแล้วเท่ากับ Publish Dashboard สำเร็จ

## ทำเสร็จและตรวจแล้ว

- [x] ตรวจโฟลเดอร์เดิม ไม่มีโค้ดเดิมหรือ AGENTS.md ที่ต้องต่อยอด
- [x] ดาวน์โหลด Dataset จริงจาก public endpoint ของ Kaggle ที่ระบุ ไม่ใช้ข้อมูลจำลองแทน
- [x] ตรวจ CSV119390แถว32คอลัมน์ วันที่2015-07-01–2017-08-31; เก็บ SHA-256 ใน docs/dataset-audit.json
- [x] Import โปรแกรมสร้าง raw_data.xlsx พร้อม tblRawBookings, HBD-ID, data_source และ created_at
- [x] Import ซ้ำปลอดภัย รักษา WEB-ID และข้อมูลเว็บ ตรวจด้วย integration fixture ที่แยกจาก production
- [x] APIครบ /health /options /bookings /bookings/:id และ POST พร้อม validation/filter/pagination
- [x] GET/filter/summary บน Dataset จริงตรงกับการ audit CSVอิสระ
- [x] Invalid POST ไม่เพิ่มแถว; valid POSTอ่านกลับจากไฟล์หลังสร้าง repository ใหม่ได้
- [x] Concurrent POST2รายการไม่ทับกัน และบันทึกผ่าน temporary/atomic rename
- [x] ทดสอบ native Windows FileShare.None lock และ owner file ของ Excel โดยไฟล์เดิมไม่เสีย
- [x] Frontend/Backend typecheck และ production build ผ่าน
- [x] Web3หน้า แยก source, แสดงข้อมูลจริง, ไม่มี Tableauจำลองหรือ Auto Update ที่ไม่ได้ทำงาน
- [x] เว็บบันทึกหนึ่งรายการสาธิตจริงเป็น data_source=web พร้อมWEB-ID; ค่าเริ่มต้น KPIยังoriginal
- [x] สคริปต์ setup/refresh Excel แบบ native COM และไฟล์ M queries, model checks, Forecast/GoalSeek
- [x] คู่มือ Tableau calculated fields/LOD, grain, Dashboard Actions, Story4หน้า และ manual publish flow
- [x] README, Data Dictionary, references และโครงพรีเซนต์ภาษาไทย

## ผลทดสอบ Excel และหน้าจอ

ดู `excel/verification.json` หลัง native setup/refresh สำเร็จ และ `USER_MANUAL.md` สำหรับภาพหน้าจอจริง

- [x] Native Power Query Refresh ผ่าน Windows PowerShell5.1/Excel Desktop COM; analysis.xlsx บันทึกสำเร็จ มี13QueriesและFact119391แถว
- [x] ModelChecks8รายการเป็น0ทั้งหมด ตรวจจากไฟล์xlsxที่บันทึกแล้ว: ไม่มีPKซ้ำหรือFKหลุด
- [x] Forecast holdoutใช้เฉพาะอดีต; Actual/Predicted/Error/MAE/MAPEคำนวณโดยExcelจริง และตรงการตรวจOLSอิสระ
- [x] Goal Seekสำเร็จ: ราคาสมมติ100/เป้าหมาย100000 ได้1000คืนหลังปัด รายรับ100000ภายในtolerance
- [x] รอบสร้าง/Refreshสุดท้ายรวมรายการสาธิตเว็บ1รายการแล้ว โดยmetrics originalตรงกับCSVaudit
- [x] ตรวจหน้าจอ desktop/mobile 390px: ฟอร์ม, validation, menu, table scrolling, filters, detail, empty state, pagination; ไม่มี console error/warning
- [x] restart Backend process จริงแล้วอ่าน WEB-ID เดิมได้ (`docs/live-verification.json`); summary originalตรงCSVaudit
- [x] ภาพจริง10ภาพพร้อมคำอธิบายใต้ภาพใน USER_MANUAL.md
- [x] ExportภาพPDFจากnativeExcelทุก14ชีตและตรวจรูปแบบจริง; แก้formatจำนวน/เปอร์เซ็นต์แล้ว ไม่มีformulaerrorหรือเลขสำคัญถูกตัดในมุมมองที่ตรวจ

หลักฐาน Excel อยู่ใน `excel/verification.json` และการตรวจอิสระของไฟล์ที่บันทึกจริงใน `docs/analysis-verification.json` ผล MAE/MAPE: City183.2372/8.0485%, Resort97.6566/9.1123% ใช้train21เดือน/holdout3เดือน ปัดจำนวนเพื่อวางแผนขั้นต่ำ0ตามสูตร Workbookจริงมี14ชีตและ12ExcelTables โดยForecastมี2ตาราง ส่วนInstructions/Config/WhatIfไม่ใช่Query Table ไม่ได้แต่งค่าคำนวณในExcelJS

รอบที่ทดสอบคือ setup ที่เรียก native QueryTable.Refresh จริงทุกตาราง คำสั่ง refreshแยกใช้ลำดับเดียวกันแต่ยังไม่ได้รันซ้ำเต็มรอบบนข้อมูลที่ไม่เปลี่ยน การตรวจรูปแบบผ่านPDFจากnativeExcelเป็นread-onlyและไม่แก้Queries/Connections

## Tableau และสิ่งที่ต้องใช้บัญชีผู้ใช้

- [ ] สร้างและเปิดตรวจ Tableau Workbookจริงในโปรแกรมบนเครื่อง
- [ ] DashboardมีKPI/trend/box/scatter/LOD/actionsและStory4หน้า
- [ ] เทียบ metricExcelกับTableauภายใต้filterเดียวกัน
- [ ] ผู้ใช้PublishไปTableauPublicด้วยบัญชีของตน
- [ ] ตั้งVITE_TABLEAU_VIZ_URLเป็นURLจริงแล้วทดสอบEmbed/โหลดผิดพลาดบนเว็บ

ค่า URL เริ่มต้นว่างตามข้อกำหนด ตรวจโปรแกรมผ่านหน้าจอจริงแล้วพบ **Tableau Desktop Free Edition 2026.2** ซึ่งไม่ใช่ Public Edition และเผยแพร่ไป Tableau Public ไม่ได้ จึงส่ง `tableau/BUILD_GUIDE.md`, `CALCULATED_FIELDS.md`, ตารางนำเข้า และ `LOCAL_STATUS.md` ตาม fallback ในข้อกำหนด ยังไม่มี Dashboard/Story หรือ URL ที่ Publish จริง และยังไม่เทียบ metric Excel/Tableau ไม่สร้างไฟล์ .twb/.twbx ว่างมาทดแทน ต้องใช้ Desktop Public Edition แล้วทำขั้นตอนเหล่านี้ต่อ

## ขอบเขตที่ต้องระบุในการตีความ

- รายงานDatasetใช้original; webเป็นรายการสาธิตแยกได้
- No-ShowรวมในCancellationเพราะต้นฉบับis_canceled=1ทุกแถวของกลุ่มนี้
- ADRเฉลี่ยต่อbookingไม่ถ่วงคืน รวม0และpositiveoutliers ตัดติดลบออกเฉพาะmetricที่ต้องใช้ค่า
- Revenueเป็นประมาณการCheck-Out ไม่ใช่กำไร/รายได้ตรวจสอบบัญชี
- Forecastเป็นbaselineของข้อมูลประวัติศาสตร์ ไม่ใช่คำพยากรณ์ปัจจุบัน ไม่มีข้อมูลความจุจึงไม่คำนวณoccupancy
