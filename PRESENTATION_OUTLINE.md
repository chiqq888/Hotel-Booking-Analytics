# โครงพรีเซนต์ 15 นาที

| เวลา | เนื้อหา | สิ่งที่แสดง |
|---|---|---|
| 0:00–1:00 | ปัญหาและขอบเขต | วิเคราะห์การจอง/ยกเลิก/เข้าพัก ไม่ใช่ระบบจองจริง |
| 1:00–2:30 | Dataset และคำถามธุรกิจ | Kaggle+บทความ, 119390แถว, 2โรงแรม, ช่วง2015–2017; ไม่มี customer ID |
| 2:30–4:00 | Pipeline | CSV→raw_data.xlsx←Web/API→Power Query→analysis.xlsx→Tableau Public→เว็บไซต์ |
| 4:00–5:30 | คุณภาพและโมเดล | missing children4แถว, ADRติดลบ1, ADR0เก็บไว้; booking PK/room composite key; ห้ามลบ duplicates โดยเดา |
| 5:30–7:00 | ผลจริง baseline | Completed75166, canceled44224รวมNo-Show1207, cancellation37.04%; ขอบเขตoriginal |
| 7:00–9:00 | Advanced Analytics | Excel holdout3เดือนก่อนอนาคต MAE/MAPEจากverificationจริง และ GoalSeekราคา×คืน; อธิบายเดือนขอบ/ไม่ใช่กำไร |
| 9:00–11:00 | Tableau Story4หน้า | overview, trend/forecast, cancellation, price distribution/limitations; ใช้ Workbook จริงเมื่อสร้างและตรวจแล้ว |
| 11:00–14:00 | Demo flow | เพิ่มรายการเว็บ→กรองweb→reload→refresh Excel→Refresh Extract/Publish→reload Dashboardฉบับที่เผยแพร่แล้ว |
| 14:00–15:00 | ข้อจำกัดและคำถาม | ข้อมูลเก่า, correlationไม่พิสูจน์เหตุ, linear baselineไม่อธิบายseasonality, ไม่มีความจุ/ต้นทุน, Tableau Publicต้องPublishเอง |

## ลำดับ Demo

เตรียมรอบ Refresh ล่วงหน้าก่อนพรีเซนต์: บนเครื่องที่ทดสอบ Fact119391แถวใช้ประมาณ204วินาที และMonthlySummaryประมาณ104วินาทีเฉพาะสองขั้นตอนนี้ จึงไม่ควรอ้างว่าทั้งPipelineจะเสร็จในช่วงDemo3นาที ให้ใช้รายการwebที่บันทึกและRefreshสำเร็จแล้วในการชี้ผลExcel และสาธิตการบันทึกใหม่พร้อมสถานะรอRefreshตามจริง เวลาจริงต่างกันตามเครื่อง

1. เปิดรายการจอง แสดง source original และจำนวนจริง เปิดรายละเอียด1รายการให้เห็นรหัสห้องเป็นรหัส
2. เพิ่มรายการสาธิตที่ใช้ข้อมูลจากฟอร์ม เลือก Check-Out กดบันทึก รอจนสำเร็จจริง
3. กลับรายการ เลือกจากเว็บไซต์ ค้นหา WEB-ID ที่ได้รับ reloadและยืนยันว่าคงอยู่
4. ปิด raw_data.xlsx หากเปิด รัน `npm.cmd run excel:refresh` แสดงเวลาการRefreshและผลModelChecks/Forecast/GoalSeek
5. หาก Tableauพร้อมให้Refresh ExtractและPublishทับเดิม จากนั้นโหลดDashboardใหม่ หากยังไม่มีWorkbook/URLให้แสดงสถานะจริงและคู่มือ ไม่อ้างว่าจบขั้นตอนนี้

## Insight ที่อ้างได้

การยกเลิกในscope original คือ37.04%ตามis_canceled ไม่ใช่หลักฐานสาเหตุ ต้องคำนวณกลุ่มตลาด/lead_timeภายใต้filterก่อนกล่าวว่ากลุ่มใดสูงที่สุด คำแนะนำเบื้องต้นคือทบทวนกลุ่มที่มีการยกเลิกสูงและขนาดตัวอย่างเพียงพอ ไม่สรุปว่าการเปลี่ยนราคาจะทำให้ยอดเพิ่ม

ใช้ตารางที่คำนวณจริงใน `docs/ANALYSIS_FINDINGS.md` สำหรับเปรียบเทียบโรงแรม กลุ่มการจอง ตลาด ช่องทาง lead time และ quartiles ของ ADR ทุกตารางใช้ original ไม่รวมรายการเว็บ

อ่านผลพยากรณ์จริงจาก `excel/verification.json` และ `tableau/import/tblForecast.csv` หลังรันExcel ไม่อ่านค่าที่แต่งขึ้นจากสไลด์ เตรียมชี้แจงว่าการพยากรณ์3เดือนถัดจากข้อมูลเก่าเป็นการทดลองตามช่วงประวัติศาสตร์
