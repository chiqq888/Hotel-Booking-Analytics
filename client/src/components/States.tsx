import Icon from './Icon';
export function Loading({ text = 'กำลังอ่านข้อมูล…' }: { text?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <Icon name="info" />
      <div>
        <strong>ดำเนินการไม่สำเร็จ</strong>
        <p>{message}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            ลองอีกครั้ง <Icon name="refresh" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
export function SourceBadge({ source }: { source: unknown }) {
  return (
    <span className={`badge ${source === 'web' ? 'web' : 'original'}`}>
      <span />
      {source === 'web' ? 'จากเว็บไซต์' : 'Dataset ต้นฉบับ'}
    </span>
  );
}
export function StatusBadge({ status }: { status: unknown }) {
  return (
    <span
      className={`status ${status === 'Check-Out' ? 'completed' : status === 'Canceled' ? 'canceled' : 'noshow'}`}
    >
      <span />
      {status === 'Check-Out'
        ? 'เข้าพักสำเร็จ'
        : status === 'Canceled'
          ? 'ยกเลิก'
          : status === 'No-Show'
            ? 'ไม่มาเข้าพัก'
            : String(status ?? '—')}
    </span>
  );
}
export const number = (value: unknown, digits = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('th-TH', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })
    : '—';
export function date(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
