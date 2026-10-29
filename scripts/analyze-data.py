"""Generate descriptive findings from the original CSV only, without causal claims."""
import pathlib, csv, collections, statistics, json
root=pathlib.Path(__file__).resolve().parents[1]
rows=list(csv.DictReader((root/'dataset/hotel_bookings.csv').open(encoding='utf-8-sig',newline='')))
def adr(r):
    try:
        value=float(r['adr'])
        return value if value>=0 else None
    except (ValueError,TypeError): return None
def table(field, minimum=0):
    groups=collections.defaultdict(list)
    for r in rows: groups[r[field]].append(r)
    result=['| กลุ่ม | จำนวนรายการ | Check-Out | is_canceled=1 | อัตรายกเลิก |','|---|---:|---:|---:|---:|']
    for name,items in sorted(groups.items(),key=lambda pair:-len(pair[1])):
        if len(items)<minimum: continue
        canceled=sum(r['is_canceled']=='1' for r in items)
        result.append(f"| {name} | {len(items):,} | {sum(r['reservation_status']=='Check-Out' for r in items):,} | {canceled:,} | {canceled/len(items):.2%} |")
    return '\n'.join(result)
lead=collections.defaultdict(list)
for r in rows:
    days=int(r['lead_time'])
    lead['0–30 วัน' if days<=30 else '31–90 วัน' if days<=90 else '91–180 วัน' if days<=180 else '181 วันขึ้นไป'].append(r)
lead_table=['| Lead time | จำนวนรายการ | ยกเลิก | อัตรายกเลิก |','|---|---:|---:|---:|']
for name in ['0–30 วัน','31–90 วัน','91–180 วัน','181 วันขึ้นไป']:
    items=lead[name]
    canceled=sum(r['is_canceled']=='1' for r in items)
    lead_table.append(f'| {name} | {len(items):,} | {canceled:,} | {canceled/len(items):.2%} |')
prices=['| โรงแรม | ADR valid | เฉลี่ยต่อ booking | Q1 | Median | Q3 | สูงสุด | ADR=0 |','|---|---:|---:|---:|---:|---:|---:|---:|']
for hotel in sorted({r['hotel'] for r in rows}):
    values=sorted(adr(r) for r in rows if r['hotel']==hotel and adr(r) is not None)
    q1,median,q3=statistics.quantiles(values,n=4,method='inclusive')
    prices.append(f'| {hotel} | {len(values):,} | {statistics.mean(values):.2f} | {q1:.2f} | {median:.2f} | {q3:.2f} | {max(values):,.2f} | {values.count(0):,} |')
native_block='ยังไม่มีผล native Excel ในรอบนี้ ดูขั้นตอน setup/refresh ในคู่มือ Excel'
verification=root/'excel/verification.json'
if verification.exists():
    native=json.loads(verification.read_text(encoding='utf-8-sig'))
    native_lines=['ผลจาก Microsoft Excel Desktop COM (`excel/verification.json`) แบ่ง train21เดือน และ holdout3เดือน May–Jul2017 โดยไม่ใช้ holdoutในการfitค่าทดสอบ:', '', '| โรงแรม | MAE (รายการ) | MAPE |', '|---|---:|---:|']
    for metric in native['forecast_metrics']:
        native_lines.append(f"| {metric['hotel']} | {metric['mae']:.2f} | {metric['mape']:.2%} |")
    goal=native['goal_seek']
    native_lines.extend(['',f"Goal Seek ของExcelจริง: ราคาสมมติ{goal['price']:,.2f}ต่อคืนและเป้าหมาย{goal['target']:,.2f} ให้จำนวนคืนเพื่อวางแผน{goal['rounded_nights']:,.0f}คืน รายรับจำลองหลังปัด{goal['rounded_revenue']:,.2f} เป็นสมมติฐานราคาคงที่ ไม่รวมต้นทุน/ภาษี/ความจุ และไม่ใช่การพยากรณ์กำไร"])
    native_block='\n'.join(native_lines)
text=f'''# ผลวิเคราะห์เชิงพรรณนาจาก Dataset จริง

ผลนี้สร้างด้วย `python scripts/analyze-data.py` จาก CSV ต้นฉบับ119,390รายการเท่านั้น ไม่รวมweb ใช้ช่วงวันเข้าพัก2015-07-01–2017-08-31 เป็นข้อมูลประวัติศาสตร์ ไม่มีการลบแถวซ้ำหรือสรุปสาเหตุจากความสัมพันธ์

## ภาพรวมแยกโรงแรม

{table('hotel')}

Cancellation Rate ใช้is_canceled=1 รวมNo-Showตามต้นฉบับ ส่วนCheck-Outนับตามreservation_status ตัวเลขไม่ใช่occupancyเพราะไม่ทราบความจุห้อง

## กลุ่มการจอง

{table('customer_type')}

## กลุ่มตลาดที่มีอย่างน้อย1,000รายการ

{table('market_segment',1000)}

เกณฑ์1,000ใช้ช่วยอ่านกลุ่มที่มีฐานข้อมูลเพียงพอ ไม่ใช่การทดสอบนัยสำคัญ กลุ่มตลาดเล็กยังอยู่ในข้อมูลและmetricรวม ไม่มีการตัดออกจากDataset

## ช่องทางที่มีอย่างน้อย1,000รายการ

{table('distribution_channel',1000)}

## ระยะเวลาจองล่วงหน้า

{chr(10).join(lead_table)}

ตัวเลขนี้เป็นความสัมพันธ์ที่ยังไม่ปรับความแตกต่างด้านโรงแรม/ฤดูกาล/กลุ่มตลาด จึงยังสรุปไม่ได้ว่าการจองล่วงหน้าทำให้ยกเลิกมากขึ้น ควรใช้Tableauกรองขอบเขตเดียวกันและตรวจขนาดกลุ่มก่อนเสนอการทดลองทางธุรกิจ

## การกระจาย ADR

{chr(10).join(prices)}

ADRเฉลี่ยไม่ถ่วงน้ำหนักด้วยคืน รวม0และpositiveoutliers ตัดเฉพาะค่าติดลบออกจากprice statistics เก็บbookingนั้นในจำนวนรวม Quartileใช้วิธีinclusiveเหมือนPERCENTILE.INC; boxplotในTableauอาจใช้นิยามhingeต่างกันเล็กน้อย ต้องระบุวิธีเมื่อเทียบค่าจุดquartile

ADRเป็นหน่วยตามDataset ไม่ตั้งชื่อห้องจากรหัส A/B/C ค่าสูงผิดปกติต้องตรวจบริบทก่อนตัดหรือเปลี่ยน ไม่ลบทิ้งเพียงเพื่อให้กราฟสวย

## แนวทางใช้ผลและข้อจำกัด

{native_block}

- ใช้ตารางข้างต้นระบุกลุ่มที่ควรตรวจเพิ่ม แล้วดูทั้งอัตราและจำนวนรายการ ไม่จัดอันดับจากอัตราที่ฐานเล็กอย่างเดียว
- Forecastแยกต่างหากในanalysis.xlsx ใช้เดือนAug2015–Jul2017และholdoutMay–Jul2017 ผลจากExcelจริงอยู่ในexcel/verification.json; docs/forecast-audit.jsonเป็นการตรวจOLSอิสระ ไม่ใช้แทนหลักฐานว่าExcelรันแล้ว
- RevenueประมาณการจากCheck-Outที่ADR/nightsถูกต้องรวม25,996,324.21หน่วยตามข้อมูล ไม่ใช่กำไรและไม่ได้หักต้นทุน/ภาษี
- Datasetไม่มีCustomerIDหรือจำนวนห้องทั้งหมด จึงไม่ติดตามรายบุคคลหรือคำนวณoccupancy ไม่มีเหตุผลให้ตีความรหัสห้อง Aว่าDeluxe/Standard
'''
(root/'docs/ANALYSIS_FINDINGS.md').write_text(text,encoding='utf-8')
print('Wrote docs/ANALYSIS_FINDINGS.md from119390original rows')
