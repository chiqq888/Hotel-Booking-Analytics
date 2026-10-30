# พจนานุกรมข้อมูลและนิยามวิเคราะห์

## แหล่งข้อมูลและ grain

Hotel Booking Demand จาก [Kaggle](https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand) อ้างอิงบทความ [Antonio, Almeida และ Nunes (2019)](https://doi.org/10.1016/j.dib.2018.11.126) ข้อมูลต้นฉบับที่ตรวจจริงมี 119,390 แถว 32 คอลัมน์ ไฟล์ 16,855,599 bytes SHA-256 `7c2ae42a7353905ea136e5c2287f17c92c5435826598bfbb8491c6f0c7b1fc06` เก็บผลตรวจแยกใน `docs/dataset-audit.json`

หนึ่งแถวแทนหนึ่งรายการจอง ไม่มี customer ID หรือ booking ID ที่ได้รับจากโรงแรม จึงไม่ลบแถวที่มีข้อมูลเหมือนกันอัตโนมัติ และไม่ใช้ระบุการซื้อซ้ำรายคน

## คอลัมน์ต้นฉบับครบ 32 ช่อง

| คอลัมน์                        | ชนิดเชิงวิเคราะห์        | ความหมาย                                                            |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| hotel                          | text                     | City Hotel หรือ Resort Hotel                                        |
| is_canceled                    | integer 0/1              | ตัวระบุการยกเลิกตามต้นฉบับ                                          |
| lead_time                      | integer days             | วันระหว่างการบันทึกจองใน PMS กับวันเข้าพักตามกำหนด                  |
| arrival_date_year              | integer                  | ปีเข้าพักตามกำหนด                                                   |
| arrival_date_month             | text                     | เดือนภาษาอังกฤษ                                                     |
| arrival_date_week_number       | integer                  | เลขสัปดาห์ของปีตามต้นฉบับ                                           |
| arrival_date_day_of_month      | integer                  | วันที่ของเดือน                                                      |
| stays_in_weekend_nights        | integer nights           | จำนวนคืนวันหยุดตามนิยามต้นฉบับ                                      |
| stays_in_week_nights           | integer nights           | จำนวนคืนวันธรรมดา                                                   |
| adults                         | integer persons          | จำนวนผู้ใหญ่                                                        |
| children                       | nullable integer persons | จำนวนเด็ก; NA/ว่างเก็บ null ไม่แทนด้วยศูนย์                         |
| babies                         | integer persons          | จำนวนทารก                                                           |
| meal                           | text code                | รหัสอาหาร เช่น BB/HB/FB/SC/Undefined ไม่สร้างข้อมูลแทนเมื่อไม่ทราบ  |
| country                        | nullable text code       | รหัสประเทศตามต้นฉบับ ไม่ใช่ตัวระบุบุคคล                             |
| market_segment                 | text                     | กลุ่มตลาด เช่น Direct/Online TA                                     |
| distribution_channel           | text                     | ช่องทางจัดจำหน่าย                                                   |
| is_repeated_guest              | integer 0/1              | flag ผู้เข้าพักซ้ำจากระบบต้นทาง ใช้สรุปกลุ่มได้แต่ติดตามรายคนไม่ได้ |
| previous_cancellations         | integer                  | จำนวนรายการก่อนหน้าที่ยกเลิกตามต้นทาง                               |
| previous_bookings_not_canceled | integer                  | จำนวนรายการก่อนหน้าที่ไม่ยกเลิกตามต้นทาง                            |
| reserved_room_type             | text code                | รหัสประเภทห้องที่จอง ไม่มีชื่อจริง                                  |
| assigned_room_type             | text code                | รหัสประเภทห้องที่จัดให้                                             |
| booking_changes                | integer                  | จำนวนครั้งที่เปลี่ยนข้อมูลจอง                                       |
| deposit_type                   | text                     | ประเภทมัดจำตามข้อมูล เช่น No Deposit/Non Refund/Refundable          |
| agent                          | nullable code            | รหัสตัวแทนในต้นทาง เก็บต้นฉบับใน raw เป็นข้อความเพื่อรักษารหัส      |
| company                        | nullable code            | รหัสบริษัทในต้นทาง ไม่มีชื่อบุคคล                                   |
| days_in_waiting_list           | integer days             | จำนวนวันใน waiting list                                             |
| customer_type                  | text                     | Contract/Group/Transient/Transient-Party เป็นประเภทการจอง           |
| adr                            | number                   | Average Daily Rate ตามต้นฉบับ ไม่สมมติสกุลเงินเพิ่มในหน้าเว็บ       |
| required_car_parking_spaces    | integer                  | จำนวนพื้นที่จอดรถที่ต้องการ                                         |
| total_of_special_requests      | integer                  | จำนวนคำร้องขอพิเศษ                                                  |
| reservation_status             | text                     | Check-Out, Canceled, No-Show                                        |
| reservation_status_date        | date text yyyy-MM-dd     | วันที่สถานะถูกตั้งตามข้อมูลต้นทาง ไม่ใช่ arrival date               |

## คอลัมน์ทางเทคนิคและอนุมาน

| คอลัมน์                                | นิยาม                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| booking_id                             | Primary Key ของรายการ original=`HBD-0000001` ตามลำดับแถว, web=`WEB-UUID` ไม่ใช่ Customer ID                         |
| data_source                            | original หรือ web                                                                                                   |
| created_at                             | UTC ISO timestamp เฉพาะรายการ web; original เป็น null เพราะไม่ทราบเวลาสร้าง                                         |
| arrival_date                           | วันที่ประกอบจาก year/month/day ตรวจวันจริงก่อนใช้งาน                                                                |
| month_start                            | วันแรกของเดือน arrival_date                                                                                         |
| inferred_booking_date                  | arrival_date − lead_time เป็นค่าอนุมาน ไม่ใช่วันที่จองจริงที่ตรวจสอบจากต้นฉบับ                                      |
| total_nights                           | weekday + weekend หากทั้งสองค่าคำนวณได้และไม่ติดลบ                                                                  |
| hotel_key                              | hotel; ใช้ค่าแทน missing ที่ระบุใน M                                                                                |
| room_key                               | hotel + `                                                                                                           | ` + reserved_room_type เพื่อไม่ปะปนรหัสต่างโรงแรม |
| country_key/customer_type_key          | รหัสหมวดหมู่ หรือสมาชิก unknown ที่อธิบายชัดเจน                                                                     |
| children_missing                       | true เมื่อ children missing; ไม่ impute ศูนย์                                                                       |
| missing_fields/required_missing_fields | รายชื่อช่องที่ขาด แยก required ต่อ metric                                                                           |
| analysis_missing_fields                | ช่องเชิงวิเคราะห์ที่ขาด ใช้คัดรายการเข้า DataQuality; ไม่ทำให้ optional/technical null ที่คาดไว้กลายเป็นปัญหาทุกแถว |
| invalid_fields                         | รายชื่อค่าผิดชนิด/โดเมน/วันที่/สถานะขัดกัน                                                                          |
| outlier_flags                          | ADR สูงกว่า threshold ใน Config เป็นสัญญาณตรวจสอบ ไม่ลบทิ้ง                                                         |
| adr_valid/nights_valid                 | flag ว่าค่านำไปคำนวณ metric ได้หรือไม่                                                                              |
| estimated_lodging_revenue              | ADR × total_nights เฉพาะ Check-Out และสองค่าถูกต้อง                                                                 |

FactBookings grain=หนึ่งแถวต่อ booking_id; dimensions มีหนึ่งแถวต่อ key. Join แบบ many-to-one จาก Fact → DimHotel(hotel_key), DimRoom(room_key), DimCountry(country_key), DimCustomerType(customer_type_key), DimDate(arrival_date/date_key ตาม query) ตรวจซ้ำและ orphan ใน ModelChecks ห้าม join ตาราง Forecast กลับเป็นแถว booking เพราะทำให้จำนวนจองพอง

MonthlySummary grain=เดือนเข้าพัก × โรงแรม × data_source. Statistics grain=โรงแรม × data_source. Forecast grain=โรงแรม × เดือน × ประเภท train/holdout/future ตามตารางผลจริง แยกจากข้อมูลจอง

FactSnapshot เป็น query ที่อ่านตาราง tblFactBookings ที่โหลดสำเร็จแล้วเพื่อไม่ให้การคลีน119390แถวถูกประเมินซ้ำในทุก dimension/summary ต้อง Refresh Fact ก่อน แล้วจึง Refresh ตารางที่พึ่งพาตามลำดับด้วยสคริปต์ ไม่ถือว่า Refresh All ครั้งเดียวรับประกันลำดับนี้

## Metric ที่ใช้ร่วม Excel/API/Tableau

ค่าเริ่มต้นผลรายงานคือ `data_source=original` ต้องใช้ scope/filter เดียวกันเมื่อตรวจเทียบ

| Metric                    | สูตรและขอบเขต                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Total Bookings            | COUNT(booking_id) ทั้งหมดใน scope                                                                                          |
| Cancellation Rate         | SUM(is_canceled=1)/COUNT(booking_id); ใช้ denominator ทุก booking ใน scope                                                 |
| Completed Stays           | COUNT ของ reservation_status=Check-Out                                                                                     |
| Total Nights              | SUM(total_nights) ที่ถูกต้องของกลุ่มที่ระบุ; API summary รวมทุกสถานะ ไม่ใช่คืนเข้าพักสำเร็จเท่านั้น                        |
| Average ADR               | ค่าเฉลี่ยไม่ถ่วงน้ำหนักต่อ booking ของ ADR ที่เป็นตัวเลข ≥0 รวมศูนย์และ outlier ที่เป็นบวก; ตัดค่าติดลบ/แปลงไม่ได้เท่านั้น |
| Estimated Lodging Revenue | SUM(ADR×nights) เฉพาะ Check-Out และ ADR/nights ใช้คำนวณได้ ไม่ใช่รายได้ที่ตรวจสอบบัญชีแล้ว                                 |

No-Show ต้นฉบับตรวจพบ 1,207 แถว ทุกแถวมี is_canceled=1 จึงรวมใน Cancellation Rate ทั้ง Excel/API/Tableau ส่วน Completed Stays นับเฉพาะ Check-Out โดยไม่ขึ้นกับจำนวนคืนเป็นศูนย์

ผลตรวจอิสระจาก CSV: Total119,390, Completed75,166, Canceled44,224, Cancellation Rate37.0416282771%, Average ADR แบบข้างต้น101.8320279088, Estimated Lodging Revenue25,996,324.21 หน่วยตามข้อมูล ค่านี้คือ baseline จาก original ไม่รวม web ดูผลตรวจปัจจุบันใน `docs/dataset-audit.json`

## กฎคุณภาพ

1. CSV ต้นฉบับคงเดิม raw แปลงตัวเลขที่แปลงได้เป็น number และ token ว่าง/NULL/NA เป็น null; Power Query เก็บ flags และรายงานค่าที่แปลงไม่ได้
2. missing ต่างจาก invalid ต่างจาก outlier เก็บทุกแถวใน FactBookings; ไม่ drop duplicates อัตโนมัติ
3. children missing มี 4 แถว ไม่เท่ากับเด็ก0; country missing488, agent16,340, company112,593 ในไฟล์ที่ตรวจ
4. คน/คืน/lead time ติดลบหรือไม่เป็นจำนวนเต็มต้องตรวจ เด็ก/ทารก0 ปกติ ADR0 มี1,959 แถวอาจมีความหมาย จึงรวมใน ADR เฉลี่ย
5. ADR ติดลบ1แถวถูก flag และไม่นำไปคำนวณ ADR/Revenue แต่ยังนับ booking; ADRสูงสุด5,400 ยังเก็บและ flag ให้ตรวจตาม threshold ที่เปิดเผยใน Config
6. missing agent/company ของ original และช่องเว็บที่ไม่ให้กรอกเป็นสิ่งที่คาดได้ DataQuality ใช้ระบุข้อมูล ไม่ตีความว่าทุกแถวใช้วิเคราะห์ไม่ได้
7. เดือนต้น/ท้ายเลือกตัดจากการ fit Forecast แบบระมัดระวัง แม้วันแรก/สุดท้ายใน CSV ตรงขอบเดือน เพราะ min/max เพียงอย่างเดียวไม่ยืนยันความครบถ้วนของเดือน อ่านนโยบายจริงใน Config/คู่มือ Excel

## รายการสาธิตผ่านเว็บ

ผู้ใช้กรอก hotel/arrival/room/country/customer_type/ผู้เข้าพัก/คืนพัก/ADR/lead_time/status/channel/segment ใช้รายการหมวดหมู่จาก original และ validation ร่วมกัน

วันที่ arrival แตกออกเป็น year/month/day/week ISO สำหรับ web เท่านั้น `is_canceled=0` เมื่อ Check-Out และ1เมื่อ Canceled/No-Show ไม่มีการกรอกค่า is_canceled ที่ขัดแย้งเอง

คอลัมน์ต้นฉบับที่ไม่ได้ให้กรอกทั้งหมดเป็น null: meal, is_repeated_guest, previous_cancellations, previous_bookings_not_canceled, assigned_room_type, booking_changes, deposit_type, agent, company, days_in_waiting_list, required_car_parking_spaces, total_of_special_requests, reservation_status_date. ไม่แต่งประวัติหรือวันเปลี่ยนสถานะ; reservation_status_date ไม่เท่ากับ created_at โดยอัตโนมัติ

ADR0 และจำนวนคืน0 อนุญาตตามลักษณะ Dataset จำนวนผู้เข้าพักต้องมีอย่างน้อย1และตัวเลขจำนวนเป็นจำนวนเต็มไม่ติดลบ children/countryไม่ทราบส่งnull รายการ web ใช้เพื่อสาธิตการไหลข้อมูล ไม่อ้างว่าเป็น booking จริงของโรงแรม
