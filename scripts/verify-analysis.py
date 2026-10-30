"""Read-only independent checks of saved native Excel output, no XLSX rewriting."""

import csv
import json
import math
import pathlib
import xml.etree.ElementTree as ET
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]


def load(p: str) -> dict:
    return json.loads((root / p).read_text(encoding='utf-8-sig'))


native = load('excel/verification.json')
source = load('docs/dataset-audit.json')
forecast = load('docs/forecast-audit.json')

original = [r for r in native['statistics'] if r['data_source'] == 'original']


def close(a: float | int | str, b: float | int | str) -> bool:
    return math.isclose(float(a), float(b), rel_tol=1e-9, abs_tol=1e-6)


for target, column in [
    ('totalBookings', 'total_bookings'),
    ('completedStays', 'completed_stays'),
    ('canceledBookings', 'canceled_bookings'),
    ('estimatedLodgingRevenue', 'estimated_lodging_revenue'),
]:
    assert close(sum(r[column] for r in original), source[target]), (target, original, source[target])

weighted_adr = sum(r['average_adr_per_booking'] * r['adr_valid_count'] for r in original) / sum(
    r['adr_valid_count'] for r in original
)
assert close(weighted_adr, source['averageAdrNonnegativePerBooking'])

for expected in forecast['results']:
    actual = next(r for r in native['forecast_metrics'] if r['hotel'] == expected['hotel'])
    assert close(actual['mae'], expected['mae']) and close(actual['mape'], expected['mape'])
    assert actual['train_months'] == 21 and actual['holdout_months'] == 3

with (root / 'tableau/import/tblForecast.csv').open(encoding='utf-8-sig', newline='') as f:
    records = list(csv.DictReader(f))

for expected in forecast['results']:
    for role in ['holdout', 'future']:
        actuals = [r for r in records if r['hotel'] == expected['hotel'] and r['role'] == role]
        for period in expected[role]:
            actual = next(r for r in actuals if r['month_start'].startswith(period['month']))
            assert close(actual['predicted'], period['predicted']), (actual, period)
            if role == 'holdout':
                assert close(actual['actual'], period['actual'])

goal = native['goal_seek']
assert goal['status'].startswith('สำเร็จ') and close(goal['revenue'], goal['target'])
# Excel uses 15 significant digits: GoalSeek can expose 1000.0000000000001
# through COM while ROUNDUP correctly evaluates the material value as 1000.
assert goal['rounded_nights'] == int(goal['rounded_nights'])
assert (
    goal['rounded_nights'] >= goal['nights'] - 1e-9
    and goal['rounded_nights'] < goal['nights'] + 1 + 1e-9
)
assert goal['rounded_revenue'] >= goal['target'] - 1e-6

ns = {
    'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

with zipfile.ZipFile(root / 'data/analysis.xlsx') as book:
    shared = []
    if 'xl/sharedStrings.xml' in book.namelist():
        for item in ET.fromstring(book.read('xl/sharedStrings.xml')).findall('x:si', ns):
            shared.append(''.join(t.text or '' for t in item.findall('.//x:t', ns)))
    workbook = ET.fromstring(book.read('xl/workbook.xml'))
    sheet = next(
        s for s in workbook.findall('x:sheets/x:sheet', ns) if s.attrib['name'] == 'ModelChecks'
    )
    relationships = ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))
    target = next(
        r.attrib['Target']
        for r in relationships
        if r.attrib['Id'] == sheet.attrib['{' + ns['r'] + '}id']
    )
    target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
    checks = {}
    for row in ET.fromstring(book.read(target)).findall('x:sheetData/x:row', ns):
        if int(row.attrib['r']) <= 4:
            continue
        cells = {}
        for cell in row.findall('x:c', ns):
            v = cell.find('x:v', ns)
            if v is None:
                continue
            cells[''.join(c for c in cell.attrib['r'] if c.isalpha())] = (
                shared[int(v.text)] if cell.attrib.get('t') == 's' else v.text
            )
        if 'A' in cells and 'B' in cells:
            checks[cells['A']] = float(cells['B'])
    assert len(checks) == 8 and all(v == 0 for v in checks.values()), checks
    assert 'xl/connections.xml' in book.namelist() and any(
        n.startswith('customXml/') for n in book.namelist()
    )

result = {
    'originalMetricsMatchCsv': True,
    'nativeForecastMatchesIndependentOls': True,
    'goalSeekVerified': True,
    'modelChecks': checks,
    'queryCount': native['query_count'],
    'factRows': native['tables']['tblFactBookings'],
    'note': 'Read-only checks of saved Excel output and native CSV exports; no workbook changes.',
}
(root / 'docs/analysis-verification.json').write_text(
    json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8'
)
print(json.dumps(result, indent=2, ensure_ascii=False))
