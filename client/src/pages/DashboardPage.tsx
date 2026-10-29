import { useEffect, useRef, useState } from 'react';
import SummaryCards from '../components/SummaryCards';
import Icon from '../components/Icon';
import { ErrorState, Loading } from '../components/States';

const TABLEAU_LIBRARY = 'https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js';
function normalizeUrl(value: string): string | null { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'public.tableau.com' && /^\/(views|shared)\//.test(url.pathname) ? url.toString() : null; } catch { return null; } }
type VizElement = HTMLElement & { src: string; toolbar: string; width: string; height: string };
export default function DashboardPage({ revision }: { revision: number }) {
  const [page, setPage] = useState(0);
  const views = [
    { label: 'หน้า 1 · ภาพรวม', envKey: 'VITE_TABLEAU_VIZ_URL', configuredUrl: (import.meta.env.VITE_TABLEAU_VIZ_URL ?? '').trim() },
    { label: 'หน้า 2 · วิเคราะห์เพิ่มเติม', envKey: 'VITE_TABLEAU_VIZ_URL_2', configuredUrl: (import.meta.env.VITE_TABLEAU_VIZ_URL_2 ?? '').trim() },
  ];
  const selectedView = views[page];
  const selectedUrl = normalizeUrl(selectedView.configuredUrl);
  return <>
    <div className="page-heading"><div><span className="eyebrow">ANALYTICS & INSIGHTS</span><h1>แดชบอร์ด</h1><p>สำรวจแนวโน้มการเข้าพัก การยกเลิก และการกระจายราคา</p></div>{selectedUrl && <a className="button outline" href={selectedUrl} target="_blank" rel="noreferrer">เปิด Tableau Public <Icon name="external" size={16}/></a>}</div>
    <SummaryCards refreshKey={revision}/>
    <div className="tableau-pages" role="group" aria-label="เลือกหน้าแดชบอร์ด">
      {views.map((view, index) => <button key={view.envKey} className={`button ${page === index ? 'primary' : 'outline'}`} aria-pressed={page === index} onClick={() => setPage(index)}>{view.label}</button>)}
    </div>
    <TableauPanel key={selectedView.envKey} configuredUrl={selectedView.configuredUrl} envKey={selectedView.envKey}/>
    <div className="notice soft dashboard-notice"><Icon name="info" size={20}/><div><strong>ข้อมูลบน Tableau Public อัปเดตตามการ Publish</strong><p>เพิ่มรายการผ่านเว็บ → Refresh Excel → Refresh ข้อมูลใน Tableau → Publish ทับ workbook เดิม → โหลด Dashboard ใหม่ การโหลดหน้าเว็บใหม่อย่างเดียวจะยังไม่ส่งข้อมูลในเครื่องขึ้น Tableau Public</p></div></div>
  </>;
}

function TableauPanel({ configuredUrl, envKey }: { configuredUrl: string; envKey: string }) {
  const url = normalizeUrl(configuredUrl);
  const container = useRef<HTMLDivElement>(null);
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!url) return;
    let active = true;
    let viz: VizElement | undefined;
    setStatus('loading'); setError('');
    const timer = window.setTimeout(() => { if (active) { setStatus('error'); setError('Tableau ยังโหลดไม่เสร็จ กรุณาตรวจการเชื่อมต่อหรือลองเปิด Dashboard ต้นทาง'); } }, 45000);
    const ready = () => { if (active) { window.clearTimeout(timer); setStatus('ready'); } };
    const failed = () => { if (active) { window.clearTimeout(timer); setStatus('error'); setError('โหลด Dashboard ไม่สำเร็จ กรุณาตรวจว่า URL เผยแพร่บน Tableau Public และอนุญาตให้ฝังได้'); } };
    void import(/* @vite-ignore */ TABLEAU_LIBRARY).then(module => {
      if (!active || !container.current) return;
      const TableauViz = module.TableauViz as new () => VizElement;
      viz = new TableauViz(); viz.src = url; viz.toolbar = 'bottom'; viz.width = '100%'; viz.height = '800px';
      viz.addEventListener(module.TableauEventType.FirstInteractive, ready);
      viz.addEventListener(module.TableauEventType.VizLoadError || 'vizloaderror', failed);
      container.current.replaceChildren(viz);
    }).catch(failed);
    return () => { active = false; window.clearTimeout(timer); viz?.remove(); };
  }, [url, reload]);
  return <>
    <section className="panel tableau-panel"><div className="panel-heading"><div><h2>Hotel Booking Dashboard <span className={`connection-tag ${url ? 'connected' : ''}`}><span/>{url ? 'Tableau Public' : 'ยังไม่เชื่อมต่อ'}</span></h2><p>Dashboard และ Story ที่เผยแพร่จาก Tableau Public</p></div>{url && <button className="button outline small" onClick={() => setReload(value => value + 1)}><Icon name="refresh" size={16}/>โหลดฉบับที่ Publish แล้ว</button>}</div>
      {!configuredUrl ? <div className="dashboard-empty"><span className="dashboard-empty-icon"><Icon name="grid" size={32}/></span><span className="eyebrow">READY WHEN YOU ARE</span><h2>เชื่อมต่อมุมมองจาก Tableau</h2><p>ยังไม่ได้ตั้งค่า URL ของ Dashboard<br/>เมื่อเผยแพร่ผลงานบน Tableau Public แล้ว สามารถนำมาแสดงที่นี่ได้</p><div className="setup-steps"><div><span>1</span><strong>เตรียมข้อมูล</strong><p>Refresh analysis.xlsx<br/>ด้วย Power Query</p></div><Icon name="arrow" size={16}/><div><span>2</span><strong>เผยแพร่ผลงาน</strong><p>สร้าง Dashboard และ Story<br/>แล้ว Publish บน Tableau Public</p></div><Icon name="arrow" size={16}/><div><span>3</span><strong>เชื่อมต่อเว็บไซต์</strong><p>ตั้งค่า {envKey}<br/>ใน .env แล้วเริ่มเว็บใหม่</p></div></div><div className="config-example"><span>.env</span><code>{envKey}=https://public.tableau.com/views/…</code></div></div> : !url ? <div className="panel-state"><ErrorState message={`URL ไม่ถูกต้อง กรุณาใช้ HTTPS ของ public.tableau.com ที่มีรูปแบบ /views/ชื่อWorkbook/ชื่อView หรือ /shared/รหัส จากเมนู Share ใน Tableau แล้วแก้ ${envKey}`}/></div> : <div className="viz-wrapper">{status === 'loading' && <Loading text="กำลังโหลด Dashboard จาก Tableau Public…"/>}{status === 'error' && <div className="panel-state"><ErrorState message={error} retry={() => setReload(value => value + 1)}/><a className="text-button" href={url} target="_blank" rel="noreferrer">เปิด Dashboard ต้นทาง <Icon name="external" size={14}/></a></div>}<div ref={container} className="viz-container" style={{ visibility: status === 'ready' ? 'visible' : 'hidden', height: status === 'ready' ? undefined : 0 }}/></div>}
    </section>
  </>;
}
