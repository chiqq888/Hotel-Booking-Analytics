import type { CSSProperties } from 'react';
const paths: Record<string, React.ReactNode> = {
  hotel: <><path d="M4 21V5l8-3 8 3v16M2 21h20M9 21v-5h6v5"/><path d="M8 7h1m6 0h1M8 11h1m6 0h1"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
  list: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  arrow: <path d="m9 5 7 7-7 7"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/></>,
  cancel: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/></>,
  external: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  file: <><path d="M14 2H5v20h14V7zM14 2v6h5"/><path d="M8 12h8m-8 4h8"/></>,
};
export default function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name] || paths.info}</svg>;
}
