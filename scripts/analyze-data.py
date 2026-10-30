"""Generate descriptive findings from the original CSV only, without causal claims."""

import collections
import csv
import json
import pathlib
import statistics

root = pathlib.Path(__file__).resolve().parents[1]
rows = list(
    csv.DictReader(
        (root / 'dataset/hotel_bookings.csv').open(encoding='utf-8-sig', newline='')
    )
)


def adr(r: dict) -> float | None:
    try:
        value = float(r['adr'])
        return value if value >= 0 else None
    except (ValueError, TypeError):
        return None


def table(field: str, minimum: int = 0) -> str:
    groups = collections.defaultdict(list)
    for r in rows:
        groups[r[field]].append(r)

    result = [
        '| กลุ่ม | จำนวนรายการ | Check-Out | is_canceled=1 | อัตรายกเลิก |',
        '|---|---:|---:|---:|---:|',
    ]
    for name, items in sorted(groups.items(), key=lambda pair: -len(pair[1])):
        if len(items) < minimum:
            continue
        canceled = sum(r['is_canceled'] == '1' for r in items)
        result.append(
            f"| {name} | {len(items):,} | "
            f"{sum(r['reservation_status'] == 'Check-Out' for r in items):,} | "
            f"{canceled:,} | {canceled / len(items):.2%} |"
        )
    return '\n'.join(result)


lead = collections.defaultdict(list)
for r in rows:
    days = int(r['lead_time'])
    bucket = (
        '0–30 วัน'
        if days <= 30
        else '31–90 วัน'
        if days <= 90
        else '91–180 วัน'
        if days <= 180
        else '181 วันขึ้นไป'
    )
    lead[bucket].append(r)

lead_table = [
    '| Lead time | จำนวนรายการ | ยกเลิก | อัตรายกเลิก |',
    '|---|---:|---:|---:|',
]
for name in ['0–30 วัน', '31–90 วัน', '91–180 วัน', '181 วันขึ้นไป']:
    items = lead[name]
    canceled = sum(r['is_canceled'] == '1' for r in items)
    lead_table.append(f'| {name} | {len(items):,} | {canceled:,} | {canceled / len(items):.2%} |')

prices = [
    '| โรงแรม | ADR valid | เฉลี่ยต่อ booking | Q1 | Median | Q3 | สูงสุด | ADR=0 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
]
for hotel in sorted({r['hotel'] for r in rows}):
    values = sorted(adr(r) for r in rows if r['hotel'] == hotel and adr(r) is not None)
    q1, median, q3 = statistics.quantiles(values, n=4, method='inclusive')
    prices.append(
        f'| {hotel} | {len(values):,} | {statistics.mean(values):.2f} | '
        f'{q1:.2f} | {median:.2f} | {q3:.2f} | {max(values):,.2f} | {values.count(0):,} |'
    )

native_block = 'ยังไม่มีผล native Excel ในรอบนี้ ดูขั้นตอน setup/refresh ในคู่มือ Excel'
verification = root / 'excel/verification.json'
if verification.exists():
    native = json.loads(verification.read_text(encoding='utf-8-sig'))
    native_lines = [
        'ผลจาก Microsoft Excel Desktop COM (`excel/verification.json`) แบ่ง train 21 เดือน และ holdout 3 เดือน May–Jul 2017 โดยไม่ใช้ holdout ในการ fit ค่าทดสอบ:',
        '',
        '| โรงแรม | MAE (รายการ) | MAPE |',
        '|---|---:|---:|',
    ]
    for metric in native['forecast_metrics']:
        native_lines.append(f"| {metric['hotel']} | {metric['mae']:.2f} | {metric['mape']:.2%} |")
    goal = native['goal_seek']
    native_lines.extend([
        '',
        f"Goal Seek ของ Excel จริง: ราคาสมมติ {goal['price']:,.2f} ต่อคืน และเป้าหมาย {goal['target']:,.2f} "
        f"ให้จำนวนคืนเพื่อวางแผน {goal['rounded_nights']:,.0f} คืน รายรับจำลองหลังปัด {goal['rounded_revenue']:,.2f} "
        f"เป็นสมมติฐานราคาคงที่ ไม่รวมต้นทุน/ภาษี/ความจุ และไม่ใช่การพยากรณ์กำไร",
    ])
    native_block = '\n'.join(native_lines)

text = f'''# ผลวิเคราะห์เชิงพรรณนาจาก Dataset จริง

ผลนี้สร้างด้วย `python scripts/analyze-data.py` จาก CSV ต้นฉบับ 119,390 รายการเท่านั้น ไม่รวม web ใช้ช่วงวันเข้าพัก 2015-07-01 – 2017-08-31 เป็นข้อมูลประวัติศาสตร์ ไม่มีการลบแถวซ้ำหรือสรุปสาเหตุจากความสัมพันธ์

## ภาพรวมแยกโรงแรม

{table('hotel')}

Cancellation Rate ใช้ is_canceled=1 รวม No-Show ตามต้นฉบับ ส่วน Check-Out นับตาม reservation_status ตัวเลขไม่ใช่ occupancy เพราะไม่ทราบความจุห้อง

## กลุ่มการจอง

{table('customer_type')}

## กลุ่มตลาดที่มีอย่างน้อย 1,000 รายการ

{table('market_segment', 1000)}

เกณฑ์ 1,000 ใช้ช่วยอ่านกลุ่มที่มีฐานข้อมูลเพียงพอ ไม่ใช่การทดสอบนัยสำคัญ กลุ่มตลาดเล็กยังอยู่ในข้อมูลและ metric รวม ไม่มีการตัดออกจาก Dataset

## ช่องทางที่มีอย่างน้อย 1,000 รายการ

{table('distribution_channel', 1000)}

## ระยะเวลาจองล่วงหน้า

{chr(10).join(lead_table)}

ตัวเลขนี้เป็นความสัมพันธ์ที่ยังไม่ปรับความแตกต่างด้านโรงแรม/ฤดูกาล/กลุ่มตลาด จึงยังสรุปไม่ได้ว่าการจองล่วงหน้าทำให้ยกเลิกมากขึ้น ควรใช้ Tableau กรองขอบเขตเดียวกันและตรวจขนาดกลุ่มก่อนเสนอการทดลองทางธุรกิจ

## การกระจาย ADR

{chr(10).join(prices)}

ADR เฉลี่ยไม่ถ่วงน้ำหนักด้วยคืน รวม 0 และ positive outliers ตัดเฉพาะค่าติดลบออกจาก price statistics เก็บ booking นั้นในจำนวนรวม Quartile ใช้วิธี inclusive เหมือน PERCENTILE.INC; boxplot ใน Tableau อาจใช้นิยาม hinge ต่างกันเล็กน้อย ต้องระบุวิธีเมื่อเทียบค่าจุด quartile

ADR เป็นหน่วยตาม Dataset ไม่ตั้งชื่อห้องจากรหัส A/B/C ค่าสูงผิดปกติต้องตรวจบริบทก่อนตัดหรือเปลี่ยน ไม่ลบทิ้งเพียงเพื่อให้กราฟสวย

## แนวทางใช้ผลและข้อจำกัด

{native_block}

- ใช้ตารางข้างต้นระบุกลุ่มที่ควรตรวจเพิ่ม แล้วดูทั้งอัตราและจำนวนรายการ ไม่จัดอันดับจากอัตราที่ฐานเล็กอย่างเดียว
- Forecast แยกต่างหากใน analysis.xlsx ใช้เดือน Aug 2015 – Jul 2017 และ holdout May – Jul 2017 ผลจาก Excel จริงอยู่ใน excel/verification.json; docs/forecast-audit.json เป็นการตรวจ OLS อิสระ ไม่ใช้แทนหลักฐานว่า Excel รันแล้ว
- Revenue ประมาณการจาก Check-Out ที่ ADR/nights ถูกต้องรวม 25,996,324.21 หน่วยตามข้อมูล ไม่ใช่กำไรและไม่ได้หักต้นทุน/ภาษี
- Dataset ไม่มี CustomerID หรือจำนวนห้องทั้งหมด จึงไม่ติดตามรายบุคคลหรือคำนวณ occupancy ไม่มีเหตุผลให้ตีความรหัสห้อง A ว่า Deluxe/Standard
'''

(root / 'docs/ANALYSIS_FINDINGS.md').write_text(text, encoding='utf-8')
print('Wrote docs/ANALYSIS_FINDINGS.md from 119,390 original rows')
