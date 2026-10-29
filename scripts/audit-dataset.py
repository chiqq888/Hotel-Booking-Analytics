"""Independent audit of the unchanged CSV. No workbook authoring or imputation."""
import csv, json, hashlib, calendar, collections, datetime, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
source = root / 'dataset' / 'hotel_bookings.csv'
rows = list(csv.DictReader(source.open(encoding='utf-8-sig', newline='')))
def num(r, k):
    try: return float(r[k])
    except (ValueError, TypeError): return None
def arrival(r):
    return datetime.date(int(r['arrival_date_year']), list(calendar.month_name).index(r['arrival_date_month']), int(r['arrival_date_day_of_month'])).isoformat()
dates = [arrival(r) for r in rows]
adrs = [num(r,'adr') for r in rows if num(r,'adr') is not None and num(r,'adr') >= 0]
completed = [r for r in rows if r['reservation_status'] == 'Check-Out']
monthly = collections.Counter((r['hotel'],arrival(r)[:7]) for r in completed)
result = {
    'source': 'https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand',
    'downloadEndpoint': 'https://www.kaggle.com/api/v1/datasets/download/jessemostipak/hotel-booking-demand',
    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'bytes': source.stat().st_size, 'rows': len(rows), 'columns': list(rows[0]),
    'dateFrom': min(dates), 'dateTo': max(dates), 'hotels': dict(collections.Counter(r['hotel'] for r in rows)),
    'statuses': dict(collections.Counter(r['reservation_status'] for r in rows)),
    'noShowCanceledValues': dict(collections.Counter(r['is_canceled'] for r in rows if r['reservation_status']=='No-Show')),
    'totalBookings': len(rows), 'completedStays': len(completed),
    'canceledBookings': sum(r['is_canceled']=='1' for r in rows),
    'cancellationRate': sum(r['is_canceled']=='1' for r in rows)/len(rows),
    'averageAdrNonnegativePerBooking': sum(adrs)/len(adrs),
    'estimatedLodgingRevenue': sum(num(r,'adr')*(num(r,'stays_in_week_nights')+num(r,'stays_in_weekend_nights')) for r in completed if num(r,'adr') is not None and num(r,'adr')>=0 and num(r,'stays_in_week_nights')>=0 and num(r,'stays_in_weekend_nights')>=0),
    'missing': {k: sum(r[k] in ('','NULL','NA') for r in rows) for k in rows[0] if any(r[k] in ('','NULL','NA') for r in rows)},
    'negativeAdr': sum(num(r,'adr') is not None and num(r,'adr')<0 for r in rows),
    'zeroAdr': sum(num(r,'adr')==0 for r in rows),
    'maxAdr': max(num(r,'adr') for r in rows),
    'monthlyCompletedStays': [{'hotel':h,'month':m,'completed_stays':n} for (h,m),n in sorted(monthly.items())],
    'boundaryMonthPolicy': 'Exclude first and last arrival month conservatively; a min/max record date does not prove full coverage. See Config in analysis.xlsx.'
}
(root/'docs'/'dataset-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ('columns','monthlyCompletedStays')},ensure_ascii=False,indent=2))
