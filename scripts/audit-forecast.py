"""Independent OLS check using actual monthly CSV audit. Does not claim Excel execution."""

import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
audit = json.loads((root / 'docs/dataset-audit.json').read_text(encoding='utf-8'))


def month_index(month: str) -> int:
    y, m = map(int, month[:7].split('-'))
    return (y - 2015) * 12 + m - 8 + 1


def predict(xs: list[int], ys: list[int | float], x: int) -> float:
    xm = sum(xs) / len(xs)
    ym = sum(ys) / len(ys)
    slope = sum((a - xm) * (b - ym) for a, b in zip(xs, ys)) / sum((a - xm) ** 2 for a in xs)
    return ym + slope * (x - xm)


results = []
for hotel in sorted(audit['hotels']):
    periods = sorted(
        [
            r
            for r in audit['monthlyCompletedStays']
            if r['hotel'] == hotel and '2015-08' <= r['month'] <= '2017-07'
        ],
        key=lambda r: r['month'],
    )
    xs = [month_index(r['month']) for r in periods]
    ys = [r['completed_stays'] for r in periods]

    holdout = []
    for r, x, y in zip(periods[-3:], xs[-3:], ys[-3:]):
        pred = predict(xs[:-3], ys[:-3], x)
        holdout.append({
            'month': r['month'],
            'actual': y,
            'predicted': pred,
            'error': y - pred,
            'absolute_error': abs(y - pred),
            'ape': None if y == 0 else abs(y - pred) / y,
        })

    apes = [r['ape'] for r in holdout if r['ape'] is not None]
    results.append({
        'hotel': hotel,
        'train_months': 21,
        'holdout': holdout,
        'mae': sum(r['absolute_error'] for r in holdout) / 3,
        'mape': sum(apes) / len(apes) if apes else None,
        'future': [
            {'month': m, 'predicted': predict(xs, ys, month_index(m))}
            for m in ('2017-09', '2017-10', '2017-11')
        ],
    })

result = {
    'method': 'Independent Python OLS; compare to native Excel FORECAST.LINEAR results. Actual counts from unchanged CSV audit.',
    'eligibleMonths': '2015-08..2017-07',
    'holdoutMonths': '2017-05..2017-07',
    'results': results,
}

(root / 'docs/forecast-audit.json').write_text(
    json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8'
)
print(json.dumps(result, ensure_ascii=False, indent=2))
