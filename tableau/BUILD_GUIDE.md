# สร้าง Dashboard และ Story ใน Tableau Public

## ไฟล์และขอบเขต

เริ่มจากรัน import และ `excel/setup-excel.ps1` ให้สำเร็จ มี `data/analysis.xlsx` ที่ Excel คำนวณจริงแล้ว และ `excel/verification.json` บันทึกค่าที่ตรวจได้ในเครื่อง ห้ามใช้ raw_data.xlsx โดยตรงแทนการคลีนใน Power Query

ไฟล์นี้เป็นคู่มือทำซ้ำ ไม่อ้างว่าการมีคู่มือเท่ากับ Dashboard เผยแพร่สำเร็จ ตรวจ `CHECKLIST.md` ที่ root เพื่อดูสถานะงานจริงและลิงก์ที่มีอยู่

### เลือก Edition ให้ตรงงาน

เครื่องที่ตรวจวันที่ 29 ตุลาคม 2026 มี **Tableau Desktop Free Edition 2026.2** ไม่ใช่ Desktop Public Edition: เปิดตัวเชื่อม Excel ได้ แต่ Free Edition เผยแพร่ไป Tableau Public ไม่ได้ และไม่ใช่รุ่นสำหรับแชร์ `.twb` ให้ผู้ใช้อื่น ตาม [ตารางเปรียบเทียบ Edition ทางการ](https://help.tableau.com/current/pro/desktop/en-us/desktop_comparison.htm) และ [Free Edition FAQ](https://help.salesforce.com/s/articleView?id=005316652&language=en_US&type=1) ดูหลักฐานสถานะเครื่องใน [LOCAL_STATUS.md](LOCAL_STATUS.md)

ดาวน์โหลด **Tableau Desktop Public Edition** จาก [หน้า Tableau Public ทางการ](https://www.tableau.com/products/public/download) แล้วเปิดโปรแกรมรุ่น Public เพื่อทำขั้นตอนด้านล่าง การอัปเดต Desktop Free ให้ใหม่ขึ้นอย่างเดียวไม่ได้เปลี่ยนเป็น Public Edition คู่มือนี้ไม่ได้ติดตั้งโปรแกรม เปลี่ยนสิทธิ์ หรือเผยแพร่ข้อมูลให้ผู้ใช้แล้ว

## เชื่อม Excel และตั้งความสัมพันธ์

1. เปิด Tableau Desktop Public Edition > Connect > Microsoft Excel > เลือก `data/analysis.xlsx`
2. ลาก `tblFactBookings` ลง logical canvas เป็น fact หลัก ตรวจจำนวนแถวและชนิดวันที่/ตัวเลข/Boolean
3. เพิ่ม logical relationships แบบ many-to-one ตามตารางนี้ ห้าม physical join MonthlySummary หรือ Forecast ลง fact เพราะจะทำ metric คูณซ้ำ

| Fact field        | Dimension table    | Dimension PK      | ความหมาย                          |
| ----------------- | ------------------ | ----------------- | --------------------------------- |
| hotel_key         | tblDimHotel        | hotel_key         | ประเภทโรงแรมที่ปกปิดชื่อจริง      |
| room_key          | tblDimRoom         | room_key          | hotel + `\|` + reserved_room_type |
| country_key       | tblDimCountry      | country_key       | country code/`__MISSING__`        |
| customer_type_key | tblDimCustomerType | customer_type_key | กลุ่มการจอง/`__MISSING__`         |
| arrival_date      | tblDimDate         | date_key          | วันที่เข้าพักตามกำหนด             |

Fact PK = booking_id จำนวนต้องเท่ากับจำนวนแถว ไม่มีรหัสผู้เข้าพักรายบุคคล แถวที่มีทุกค่าเหมือนกันยังเป็นคนละรายการได้ ไม่มีการลบ duplicate ทั้งแถว

4. ตรวจ ModelChecks ทั้ง 8 รายการเป็น 0 (ถ้า nonzero ให้ตรวจและอธิบายก่อนตั้ง All records match) Missing dimension labels ใช้ `__MISSING__` โดยเก็บ flag; null arrival_date ยังคงอยู่ใน Fact แต่ไม่มี date FK
5. เพิ่ม `tblMonthlySummary`, `tblStatistics`, `tblForecast`, `tblForecastMetrics` เป็น data sources แยก หรือใช้ CSV ที่ Excel export ไว้ใน `tableau/import/` สำหรับกราฟสรุป วันที่ CSV อยู่ใน ISO 8601
6. `tblMonthlySummary` grain = data_source + hotel + month_start; มีเดือนที่ไม่มี booking เป็น count0; `boundary_complete` ตรวจขอบช่วงจากวันที่แรก/สุดท้าย แต่ Forecast ใช้ `model_eligible_month` ที่ตัดเดือนแรก/สุดท้ายออกเสมออย่างระมัดระวัง ไม่ยืนยันความครบของการบันทึกทุกวันแทนเจ้าของข้อมูล ชุดมาตรฐาน fit Aug2015–Jul2017, holdout May–Jul2017, future Sep–Nov2017
7. ตั้ง data_source filter = original เป็น default ของรายงาน ผลของ web ให้เปิดผ่าน filter ชัดเจนและห้ามรวมใน forecast ของชุดประวัติศาสตร์

## สร้าง worksheets

ใช้ calculated fields จาก [CALCULATED_FIELDS.md](CALCULATED_FIELDS.md) อย่าพิมพ์ตัวเลข insight ลง KPI แบบคงที่

### 1. KPI overview

สร้าง sheets `KPI Bookings`, `KPI Completed`, `KPI Cancellation`, `KPI ADR` โดยลาก metric ลง Text และตั้ง title บอก ADR เฉลี่ยต่อ booking แสดง data_source และช่วง arrival_date ใน subtitle/tooltip

### 2. Monthly trends

Columns = continuous Month(arrival_date), Rows = Total Bookings และ/หรือ Completed Stays; color = hotel ใช้ legend และระบุจำนวน booking/จำนวน Check-Out ไม่เรียก occupancy ใช้ `Show Missing Values` หรือแหล่ง MonthlySummary ถ้าต้องการแสดงเดือนศูนย์ครบปฏิทิน

### 3. ADR box plot

Columns = hotel (หรือ hotel แล้ว reserved_room_type); Rows = ADR; Marks > Detail = booking_id, filter adr_valid=true; Analytics > Box Plot ไปวางที่ Pane ตั้ง outlier แสดงไว้ตามจริง ใช้ tooltip แสดง booking_id, hotel, room code, status, data_source, outlier_flags

อย่าตั้งรหัส A/B เป็น Standard/Deluxe และอย่าซ่อนค่า ADR สูงเพียงเพื่อให้กราฟสวย ถ้าสร้าง view ขยายช่วงราคา ให้ติดชื่อช่วงและแสดงจำนวนรายการที่อยู่นอกช่วง

### 4. Lead time × ADR scatter

Columns = AVG(lead_time), Rows = AVG(adr), Marks = Circle, Detail = booking_id, color = reservation_status หรือ hotel; filter adr_valid=true และ lead_time>=0 แต่ละจุดต้องแทน **หนึ่ง booking_id** การใส่ booking_id ที่ Detail ทำให้ AVG เป็นค่ารายการ ไม่ใช่จุดเฉลี่ยรวมโรงแรม ตั้ง opacity ต่ำเพื่อลดการซ้อนทับและใช้ selection highlight

อธิบายว่าความสัมพันธ์ไม่พิสูจน์เหตุของการยกเลิก อ่าน [Scatter Plot docs](https://help.tableau.com/current/pro/desktop/en-us/buildexamples_scatter.htm) ก่อนปรับ aggregation

### 5. Cancellation segments และ LOD

Columns = customer_type หรือ Lead Time Band; Rows = Cancellation Rate; color = hotel; tooltip = total + canceled count เสมอ เพิ่ม baseline ADR โดย hotel เทียบกลุ่มย่อย พร้อม context filters ตามคู่มือ calculated fields ไม่สรุปกลุ่มเสี่ยงจาก rate ของกลุ่มขนาดเล็กโดยไม่มี denominator

### 6. Forecast and holdout

ใช้ `tblForecast`: Columns=month_start, Rows=Measure Values ของ actual/predicted; color=Measure Names, line style แยก role หรือแยก holdout/future เป็น sheets ไม่รวม predicted เข้ากับ booking จริง ใส่ filter hotel และ role ระบุขอบ train/holdout ใน caption

ใช้ `tblForecastMetrics` เป็นตาราง MAE/MAPE จำนวน holdout 3 เดือน และจำนวน actual=0 ที่ตัดออกจาก MAPE ตัวเลขเป็นผลแบบจำลองเส้นตรงจากข้อมูลประวัติศาสตร์ ไม่ใช่คำทำนายปีปัจจุบัน

## Dashboard

1. สร้างขนาด Desktop ประมาณ 1280×1000 และ Device Layout สำหรับ Phone
2. วาง KPI แถวบน แนวโน้มและ cancellation ตรงกลาง box/scatter ส่วนล่าง พร้อม title/subtitle บอกช่วงข้อมูล/source/นิยาม ADR
3. แสดง filters: data_source, hotel, arrival_date, reserved_room_type, customer_type, reservation_status และ channel ตามพื้นที่ที่เหมาะสม Apply to relevant worksheets โดยใช้ data source เดียวกัน
4. Dashboard > Actions > Add Action > Filter: เลือกแถบ hotel/segment แล้วกรอง trend, box, scatter; clearing selection = Show all values
5. Add Action > Highlight: hover/เลือก hotel เพื่อเน้นสีระหว่างกราฟที่ใช้ hotel เดียวกัน
6. Context data_source/date/hotel ต้องสอดคล้องกับ LOD ที่เลือก ตรวจว่ากรอง room แล้ว baseline คง/เปลี่ยนตามสิ่งที่ caption อธิบาย
7. เพิ่ม footer: “เพิ่มข้อมูลผ่านเว็บแล้วต้อง Refresh Excel, Refresh Extract และ Publish ใหม่”

## Tableau Story 4 หน้า

สร้าง Story size ให้ตรง Dashboard และใช้ **4 story points**:

1. **ภาพรวมและคำถามธุรกิจ**: source, grain, ช่วงประวัติศาสตร์, KPI จริง, นิยาม cancel/ADR, ข้อจำกัดไม่มี customer ID
2. **แนวโน้มและ Forecast**: monthly Check-Out แยก hotel, train/holdout/future, MAE/MAPE จริง; บอกโมเดลเส้นตรงไม่จับฤดูกาล
3. **การยกเลิกและกลุ่มที่ควรตรวจ**: customer_type/channel/lead_time พร้อม count และ rate; ใช้คำว่า “สัมพันธ์” หรือ “ควรตรวจเพิ่ม” ไม่กล่าวว่าเหตุใดทำให้ยกเลิก
4. **ราคา ข้อเสนอ และข้อจำกัด**: box plot/scatter/outlier, LOD เทียบกลุ่มกับโรงแรม; เสนอทดลองตรวจธุรกิจต่อจากผลที่เห็น; แยก Goal Seek สมมติราคาคงที่กับ forecast; ไม่มีข้อมูลพอคำนวณกำไรหรือ occupancy

Caption ต้องอ้างค่าที่คำนวณใน view/Excel หลัง refresh ห้ามใส่ข้อสรุปว่ากลุ่มใดสูงที่สุดก่อนดูผลและ denominator

## ตรวจรับก่อนเผยแพร่

- data_source=original, ไม่กรองวันที่/โรงแรม: เทียบ Total Bookings, Completed Stays, Cancellation Rate, Average ADR และ Revenue กับ `Statistics` โดยรวม numerator/denominator ให้ถูก ไม่ AVG ค่าเฉลี่ยสองโรงแรม
- เลือก City Hotel / Resort Hotel ทีละค่า เปรียบเทียบกับ Excel แถวเดียวกัน Counts ต้องตรง; rate/ADR tolerance 0.000001; revenue tolerance 0.01
- ทดสอบ context filters กับ LOD ทั้งก่อนและหลังเลือก room; ตรวจรายละเอียด scatter อย่างน้อย 2 จุดกับ Fact booking_id เดียวกัน
- เปลี่ยน source เป็น web/ทั้งหมดหลังเพิ่ม demo, Excel refresh และ Tableau refresh; รายการ WEB-UUID ต้องเห็นและ original counts ต้องเท่าเดิม
- ตรวจมือถือ, legends, loading และ dashboard actions

## Publish และเชื่อมเว็บ

1. ปิด analysis.xlsx ใน Excel หลัง save แล้ว Tableau > Data > Refresh All Extracts
2. Server > Tableau Public > Save to Tableau Public / Publish โดยบัญชีของผู้ใช้; เผยแพร่ข้อมูลที่เหมาะกับ Public เท่านั้น
3. เปิดลิงก์ผลงานจริง > Share > คัดลอก view URL รูปแบบ `https://public.tableau.com/views/<workbook>/<view>`
4. ตั้ง `VITE_TABLEAU_VIZ_URL` ใน `.env` แล้ว restart Vite หรือ build ใหม่
5. เปิดหน้า Dashboard บนเว็บและตรวจ view จริง; ปุ่มโหลดหน้าใหม่โหลดเฉพาะฉบับที่ Publish แล้ว ไม่ upload Excel

Excel ที่อยู่ในเครื่องไม่ถูกอ่านแบบ real-time โดย Tableau Public ต้องทำขั้นตอน Refresh/Publish เองทุกครั้ง ตาม [Tableau Public FAQ](https://help.tableau.com/current/pro/desktop/en-us/public_faq.htm) เวอร์ชันแรกไม่ใช้ Tableau Cloud/Bridge/Google Sheets
