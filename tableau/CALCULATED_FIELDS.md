# Tableau calculated fields

ใช้ `tblFactBookings` จาก `data/analysis.xlsx` เป็นแหล่งหลัก หนึ่งแถวคือหนึ่งรายการ `booking_id` ที่ระบบสร้าง ไม่ใช่ผู้เข้าพักหนึ่งคน ตั้ง `data_source = original` เป็นค่าเริ่มต้น และใช้ฟิลเตอร์เดียวกันเมื่อเทียบ Excel ตัวเลขใน Statistics แยก source/hotel อยู่แล้ว

## Metric ที่ใช้ตรงกับ Excel

สร้างทีละ field ด้วยชื่อด้านซ้ายของหัวข้อ คอลัมน์ `adr_valid`, `nights_valid` เป็น Boolean จาก Power Query หาก Tableau อ่านเป็นข้อความ ให้แปลงชนิดข้อมูลก่อน

### Total Bookings

```tableau
COUNT([booking_id])
```

ไม่ใช้ COUNTD เพื่อซ่อนปัญหา key ซ้ำ ต้องตรวจ ModelChecks ให้ duplicate_booking_id = 0 ก่อน

### Canceled Bookings

```tableau
SUM(IF [is_canceled] = 1 THEN 1 ELSE 0 END)
```

### Cancellation Rate

```tableau
[Canceled Bookings] / [Total Bookings]
```

ใช้ `is_canceled` ต้นฉบับ รวม No-Show เท่าที่ is_canceled เป็น 1 ไม่ใช้แค่ข้อความ `Canceled` เป็นตัวนับ

### Completed Stays

```tableau
SUM(IF [reservation_status] = "Check-Out" THEN 1 ELSE 0 END)
```

### Total Nights (all selected bookings)

```tableau
SUM(IF [nights_valid] THEN [total_nights] END)
```

หมายถึงจำนวนคืนของ booking ที่อยู่ใน filter รวมรายการยกเลิกถ้ายังไม่ได้กรองสถานะ จำนวนคืนไม่ใช่จำนวนห้อง

### Average ADR per booking

```tableau
AVG(IF [adr_valid] THEN [adr] END)
```

ไม่ถ่วงน้ำหนักด้วยคืน รวม ADR = 0 และเก็บ ADR สูงที่ flag ไว้ ตัดเฉพาะ missing/invalid/negative ADR ออกจาก metric นี้ ระบุจำนวน valid ADR ใน tooltip ด้วย

### ADR valid bookings

```tableau
SUM(IF [adr_valid] THEN 1 ELSE 0 END)
```

### Estimated Lodging Revenue

```tableau
SUM([estimated_lodging_revenue])
```

Power Query คำนวณไว้เฉพาะ Check-Out ที่ ADR>=0 และคืนไม่ติดลบ/เป็นจำนวนเต็ม ไม่ใช่รายได้บัญชี และไม่ได้หักต้นทุน/ภาษี

## LOD ที่ตอบโจทย์การเปรียบเทียบกลุ่มย่อย

### Hotel ADR baseline

```tableau
{ FIXED [hotel_key] : AVG(IF [adr_valid] THEN [adr] END) }
```

ใช้เป็นเส้นอ้างอิงหรือ tooltip เปรียบเทียบค่า ADR ของ customer_type/room กับค่าเฉลี่ยโรงแรม ใช้ `MIN([Hotel ADR baseline])` ต่อหนึ่งโรงแรม เพื่อไม่ sum ค่าเฉลี่ยซ้ำทุกแถว

### ADR difference from hotel baseline

```tableau
AVG(IF [adr_valid] THEN [adr] END) - MIN([Hotel ADR baseline])
```

ตั้ง `data_source`, `arrival_date` และ filter โรงแรมเป็น **Add to Context** ให้ baseline อยู่ในขอบเขตรายงานเดียวกับ Excel ถ้าต้องการ baseline ที่คงค่าเมื่อเลือก room/customer_type ให้ filter สองตัวนี้เป็น dimension filter ปกติ และเขียนใน tooltip ว่า baseline ก่อน filter room/customer_type ถ้าต้องเทียบ baseline หลังทุก filter ให้เพิ่ม filter เหล่านั้นเข้า Context ด้วย

FIXED คำนวณก่อน dimension filter ตาม [Tableau: Filters and LOD](https://help.tableau.com/current/pro/desktop/en-us/calculations_calculatedfields_lod_filters.htm) จึงต้องตรวจ context จากมุมมองที่ใช้งานจริง

## Fields สำหรับกราฟและการตรวจข้อมูล

### Lead Time Band

```tableau
IF ISNULL([lead_time]) OR [lead_time] < 0 THEN "ตรวจสอบ/ไม่มีข้อมูล"
ELSEIF [lead_time] <= 30 THEN "0–30 วัน"
ELSEIF [lead_time] <= 90 THEN "31–90 วัน"
ELSEIF [lead_time] <= 180 THEN "91–180 วัน"
ELSE "181 วันขึ้นไป"
END
```

### ADR review flag

```tableau
IF NOT [adr_valid] THEN "ADR ใช้คำนวณไม่ได้"
ELSEIF [outlier_flags] <> "" THEN "เกินเกณฑ์ตรวจสอบ"
ELSE "อยู่ในเกณฑ์ตรวจสอบ"
END
```

เกณฑ์ใน Excel Config เริ่มที่ 1000 เป็นเกณฑ์ตรวจด้วยมนุษย์ ไม่ใช่สรุปว่าราคาผิด และไม่ตัด outlier ออกจาก default metrics

## Forecast data source แยก

ใช้ `tblForecast` กับ `tblForecastMetrics` เป็นอีก data source ไม่ join กับ FactBookings แบบ physical join เพราะ grain ต่างกันและจะคูณจำนวน booking

- `tblForecast`: หนึ่งแถวต่อ hotel + month_start + role (`train`, `holdout`, `future`)
- `actual`: จำนวน Check-Out จริงจาก original รายเดือน
- `predicted`: holdout fit จาก train เท่านั้น; future fit จากเดือนจริงเต็มทั้งหมด
- `planned_stays`: `MAX(0,ROUND(predicted,0))` ใช้เพื่อวางแผนจำนวนรายการ ไม่ใช่ข้อมูลจองจริง
- `tblForecastMetrics`: หนึ่งแถวต่อ hotel; MAE และ MAPE ของ holdout 3 เดือน
- MAPE ไม่รวมเดือนที่ actual = 0; แสดง `mape_zero_actual_excluded` และห้ามแทน MAPE ที่คำนวณไม่ได้ด้วย 0

ค่าเฉลี่ยรายโรงแรมไม่ควรนำมา AVG ต่อเพื่อหาค่าเฉลี่ยสองโรงแรม ให้คำนวณจาก FactBookings หรือถ่วง `average_adr_per_booking` ด้วย `adr_valid_count`
