# Excel Desktop และ Power Query

ข้อกำหนด: Windows + Microsoft Excel Desktop ที่เปิดใช้งานแล้ว และ Windows PowerShell ที่ติดมากับ Windows รันจาก root ของโปรเจกต์ หลัง `npm run import`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File excel/setup-excel.ps1
```

เมื่อมี `analysis.xlsx` แล้ว ใช้:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File excel/refresh-excel.ps1
```

ปิด analysis.xlsx ก่อนรันสคริปต์ และปิด raw_data.xlsx ก่อนเพิ่มข้อมูลจากเว็บ สคริปต์เปิด Excel instance ของตนแบบซ่อน รอ Query จนเสร็จ คำนวณสูตร รัน native Goal Seek ตรวจ key/สูตร แล้วบันทึก ไม่ปิด Excel instance ที่ผู้ใช้กำลังใช้อยู่ `-Force` ใช้ rebuild analysis และจะรีเซ็ต WhatIf เป็นค่าเริ่มต้น

ใช้ refresh script เป็นวิธีหลัก เพราะ FactSnapshot อ่านตาราง Fact ที่โหลดเสร็จแล้วเพื่อลดการคำนวณ Cleansing ซ้ำ: สคริปต์ Refresh FactBookings และรอเสร็จก่อน Refresh dimensions/quality/statistics/monthly/checks ตามลำดับ จากนั้นคำนวณ Forecast/GoalSeek และ Save การกด Refresh All ครั้งเดียวไม่รับประกันลำดับนี้ หากทำเอง ให้ Refresh ตาราง FactBookings รอเสร็จ แล้ว Refresh ตาราง dependent ทีละตารางก่อนคำนวณและบันทึก ไม่อ้างว่าการกด Refresh All ครั้งเดียวเทียบเท่าสคริปต์

## โครงสร้าง

- `Source`: อ่าน `tblRawBookings` ผ่านพาธ Config!B5 (named range cfgRawPath)
- `Cleansing`: เก็บทุกแถว แปลงชนิดตาม source schema และสร้าง flags
- `FactBookings`: หนึ่ง booking_id ต่อแถว เก็บ original fields + fields คำนวณ
- Dimensions: Hotel, Hotel+Room, Country, CustomerType และ Date
- `DataQuality`: แสดงแถวที่ analytical fields หาย/invalid/outlier แยกคอลัมน์ ไม่ตีความ optional agent/company ที่ว่างเป็นข้อผิดพลาดทั้ง booking ไม่ impute children
- `Statistics`: หนึ่ง source + hotel, counts/ADR/median/sample SD/estimated revenue
- `MonthlySummary`: หนึ่ง source + hotel + month, counts พร้อมปฏิทินศูนย์ในช่วง original
- `ModelChecks`: unique booking_id และ foreign keys ตรวจได้ ต้องอธิบาย invalid date ก่อนยอมให้ตรวจผ่าน
- `Forecast`: สูตร FORECAST.LINEAR ของ Excel แยก train/holdout/future, เก็บจริงกับ predicted แยกกัน
- `WhatIf`: input B5=ราคาสมมติ, B6=รายรับเป้าหมาย, B7=คืนที่ GoalSeek เปลี่ยน, B8=B5×B7, B9=ปัดคืนขึ้น, B10=รายรับหลังปัด

## สมมติฐานและกฎข้อมูล

1. ใช้ original เป็นฐานวิชาการ; web แยกด้วย data_source ไม่มีการลบแถวที่ค่าซ้ำ
2. children missing คง null พร้อม children_missing; จำนวนคน/คืนติดลบและค่าจำนวนเต็มที่ไม่เป็นจำนวนเต็มเป็น invalid
3. ADR0 ปกติ; ADR<0 ไม่ใช้ average/revenue; ADR>1000 เป็นเกณฑ์ตรวจเริ่มต้นที่ปรับ Config!B6 ได้ ไม่ลบและยังรวมใน average/revenue ถ้า valid
4. `missing_fields` ใน Fact รวม field เดิมที่ว่างรวม optional; ยกเว้น created_at ที่เว้นว่างให้ original โดยออกแบบ `analysis_missing_fields` แยก country/children/fields หลักที่ต้องตรวจใน DataQuality และ `required_missing_fields` แยกค่าตัวเลขที่จำเป็น การที่ agent/company ว่างไม่ทำให้ทั้ง booking ใช้งานไม่ได้
5. total_nights รวม week+weekend เฉพาะจำนวนเต็มไม่ติดลบ; Revenue=ADR×total_nights เฉพาะ Check-Out ที่คำนวณได้
6. `boundary_complete` ตรวจว่าขอบช่วงแตะวันที่1/วันสิ้นเดือน แต่ไม่ยืนยันความครบของเหตุการณ์ทุกวัน Forecast จึงใช้ `model_eligible_month=true` โดยตัดเดือนแรก/สุดท้ายของ original ออกอย่างระมัดระวังเสมอ นอกเหนือจากการตรวจขอบช่วง สำหรับชุดมาตรฐานใช้ Aug2015–Jul2017 รวม24เดือน; holdout May–Jul2017 ไม่ใส่ Aug2017 ลงโมเดล และเริ่ม future Sep–Nov2017 หลังปลาย dataset
7. เติมเดือนที่ไม่มี booking เป็น completed_stays0 แทนการข้ามเดือน; holdout3เดือนท้าย fit เฉพาะ train ก่อนหน้า; future3เดือนเริ่มหลังปลาย dataset และ fit ใหม่ด้วยเดือนจริงเต็มทั้งหมด
8. MAPE ตัด actual0 ออกเฉพาะค่าเฉลี่ยเปอร์เซ็นต์และแสดงจำนวนที่ตัด; MAE ใช้ทุก holdout; planned_stays=MAX(0,ROUND(predicted,0))
9. WhatIf ราคา100/เป้าหมาย100000 เป็น input สมมติที่เปลี่ยนได้ ไม่ใช่ผลสถิติ; ไม่รวมต้นทุน ภาษี capacity หรือ elasticity

## หลักฐานและไฟล์ส่ง Tableau

`excel/verification.json` สร้างหลัง native refresh/calculation สำเร็จเท่านั้น มีจำนวน queries/rows, Statistics, Forecast metrics และ GoalSeek ค่า `checked_at_utc` ระบุรอบล่าสุด สคริปต์ export ตารางสรุป/forecast เป็น UTF8 CSV ไป `tableau/import/` ส่วน Fact รายละเอียดอยู่ใน analysis.xlsx

ไม่มี Excel หรือ COM ไม่ทำงาน: เก็บ M/สคริปต์ไว้ครบ แต่ห้ามถือว่ารัน Power Query/Forecast/GoalSeek ผ่านเพียงเพราะมีสูตร ต้องรันบน Windows Excel แล้วดู verification.json ของรอบนั้น ExcelJS backend ไม่แตะ analysis.xlsx

API ที่ใช้: [Queries.Add](https://learn.microsoft.com/en-us/office/vba/api/excel.queries.add), [CalculateUntilAsyncQueriesDone](https://learn.microsoft.com/en-us/office/vba/api/excel.application.calculateuntilasyncqueriesdone), [GoalSeek](https://learn.microsoft.com/en-us/office/vba/api/excel.range.goalseek)
