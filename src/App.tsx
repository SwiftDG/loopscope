import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowDownToLine, CircleHelp, FileSpreadsheet, Gauge, Info, Upload, Zap, X } from 'lucide-react';
import { analyze, downloadReport, makeDemo, parseCSV, type Metrics, type Sample } from './analysis';

const fmt=(n:number)=>Number(n).toFixed(2);

function Startup({onFinish}:{onFinish:()=>void}) {
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const start=performance.now();
    let frame=0;
    const tick=(now:number)=>{
      const p=Math.min(100,((now-start)/2450)*100);
      setProgress(p);
      if(p<100) frame=requestAnimationFrame(tick); else onFinish();
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[onFinish]);
  return <div className="startup" role="status" aria-label="Starting LoopScope">
    <div className="startup-grid"/>
    <div className="startup-orbit orbit-one"/><div className="startup-orbit orbit-two"/>
    <div className="startup-core">
      <div className="startup-symbol"><Activity size={43} strokeWidth={1.35}/></div>
      <div className="startup-wordmark">loopscope</div>
      <div className="startup-caption">CONTROL RESPONSE INTELLIGENCE</div>
    </div>
    <div className="startup-wave"><svg viewBox="0 0 620 90" preserveAspectRatio="none"><path d="M0 48 H125 L145 48 L158 25 L175 69 L194 8 L215 81 L236 48 H300 L316 48 L330 39 L344 56 L360 48 H620"/></svg></div>
    <div className="startup-bottom"><span>INITIALISING ANALYSIS ENGINE</span><span>{Math.round(progress).toString().padStart(3,'0')}%</span></div>
    <div className="startup-progress"><i style={{width:`${progress}%`}}/></div>
    <button className="startup-skip" onClick={onFinish}>Skip intro <span>↗</span></button>
    <div className="startup-reveal">READ THE RESPONSE.</div>
  </div>;
}

function Chart({data, metrics}:{data:Sample[];metrics:Metrics}) {
  const W=900,H=340,L=62,R=24,T=20,B=42; const minX=data[0].time,maxX=data[data.length-1].time;
  const minY=Math.min(...data.map(d=>Math.min(d.value,d.setpoint)))-5,maxY=Math.max(...data.map(d=>Math.max(d.value,d.setpoint)))+5;
  const x=(v:number)=>L+(v-minX)/(maxX-minX||1)*(W-L-R); const y=(v:number)=>T+(maxY-v)/(maxY-minY||1)*(H-T-B);
  const path=data.map((d,i)=>`${i?'L':'M'}${x(d.time).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const sp=data[data.length-1].setpoint; const peakIndex=data.findIndex(d=>d.value===metrics.peak); const peak=data[peakIndex];
  return <div className="chart-wrap"><div className="chart-legend"><span><i className="legend-line actual"/>Measured response</span><span><i className="legend-line target"/>Setpoint</span><span><i className="legend-band"/>Settling band ±{fmt(metrics.tolerance)}</span></div><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="System response graph"><defs><clipPath id="plot"><rect x={L} y={T} width={W-L-R} height={H-T-B}/></clipPath></defs>
    {Array.from({length:6},(_,i)=>{const v=minY+(maxY-minY)*i/5;return <g key={i}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} className="gridline"/><text x={L-12} y={y(v)+4} textAnchor="end" className="axis-label">{v.toFixed(0)}</text></g>})}
    <rect x={L} y={y(sp+metrics.tolerance)} width={W-L-R} height={y(sp-metrics.tolerance)-y(sp+metrics.tolerance)} className="settle-band"/>
    <line x1={L} x2={W-R} y1={y(sp)} y2={y(sp)} className="setpoint-line"/>
    <g clipPath="url(#plot)"><path d={path} className="response-line"/></g>
    {peak && <g><circle cx={x(peak.time)} cy={y(peak.value)} r="5" className="peak-dot"/><line x1={x(peak.time)} y1={y(peak.value)-8} x2={x(peak.time)+45} y2={y(peak.value)-38} className="annotation-line"/><text x={x(peak.time)+50} y={y(peak.value)-42} className="annotation">Peak {fmt(peak.value)}</text></g>}
    <text x={L} y={H-9} className="axis-label">{minX.toFixed(1)} s</text><text x={W-R} y={H-9} textAnchor="end" className="axis-label">{maxX.toFixed(1)} s</text><text x={W/2} y={H-9} textAnchor="middle" className="axis-label">TIME (SECONDS)</text>
  </svg></div>
}

function Metric({label,value,unit,icon,detail}:{label:string;value:string;unit:string;icon:ReactNode;detail:string}) {
  return <div className="metric-row"><div className="metric-symbol">{icon}</div><div className="metric-label">{label}</div><div className="metric-reading"><strong>{value}</strong><span>{unit}</span></div><div className="metric-detail">{detail}</div></div>
}

export default function App(){
  const [showStartup,setShowStartup]=useState(true);
  const [data,setData]=useState<Sample[]>(makeDemo()); const [fileName,setFileName]=useState('demo_step_response.csv'); const [message,setMessage]=useState(''); const [activeTab,setActiveTab]=useState<'overview'|'data'>('overview'); const input=useRef<HTMLInputElement>(null);
  const metrics=useMemo(()=>analyze(data),[data]);
  const finishStartup=()=>setShowStartup(false);
  const importFile=async(file?:File)=>{if(!file)return;try{const parsed=parseCSV(await file.text());setData(parsed);setFileName(file.name);setMessage(`Loaded ${parsed.length} valid samples.`);setActiveTab('overview')}catch(e){setMessage(e instanceof Error?e.message:'Unable to read this file.')} finally {if(input.current) input.current.value='';}};
  const loadDemo=()=>{setData(makeDemo());setFileName('demo_step_response.csv');setMessage('Demonstration dataset loaded.');};
  const diagnostic=metrics.settlingTime===null?'The response did not settle during the recording.':metrics.overshoot>metrics.tolerance*2?'Overshoot exceeds the review threshold.':metrics.crossings>=4?'Repeated crossings indicate an oscillatory response.':'The response settled inside the observed tolerance band.';
  const severity=metrics.settlingTime===null||metrics.overshoot>metrics.tolerance*2?'warning':'good';
  return <>
    {showStartup&&<Startup onFinish={finishStartup}/>}
    <div className={`app-shell ${showStartup?'app-hidden':''}`}>
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>loopscope</strong><small>CONTROL INTELLIGENCE</small></div></div>
        <div className="workspace-label">WORKSPACE</div><button className={`nav-item ${activeTab==='overview'?'selected':''}`} onClick={()=>setActiveTab('overview')}><Gauge size={17}/> Response analysis</button><button className={`nav-item ${activeTab==='data'?'selected':''}`} onClick={()=>setActiveTab('data')}><FileSpreadsheet size={17}/> Source data</button>
        <div className="sidebar-bottom"><div className="side-status"><span className="status-dot"/> Analysis engine ready</div><div className="sidebar-foot"><span>LOOPSCOPE</span><span>v0.2</span></div></div>
      </aside>
      <main className="main"><header className="topbar"><div className="breadcrumb"><span className="crumb-root">Workspace</span><b>{activeTab==='overview'?'Response analysis':'Source data'}</b></div><div className="top-actions"><span className="local-tag"><span className="status-dot"/> Local analysis</span><button className="icon-btn" title="About this prototype"><CircleHelp size={18}/></button></div></header>
        <div className="content"><div className="page-heading"><div><div className="eyebrow">RESPONSE ANALYSIS</div><h1>{activeTab==='overview'?'Understand the response.':'Source measurements'}</h1><p>{activeTab==='overview'?'A measured view of how the process behaves after a setpoint change.':'Review the measurements used in this analysis.'}</p></div><button className="button secondary" onClick={()=>downloadReport(data,metrics)}><ArrowDownToLine size={16}/> Export data</button></div>
        <section className="source-strip"><div className="source-icon"><FileSpreadsheet size={19}/></div><div className="source-info"><strong>{fileName}</strong><span>{data.length} measurements <i/> {fmt(data[0].time)} to {fmt(data[data.length-1].time)} seconds</span></div><div className="source-actions"><button className="text-button" onClick={loadDemo}>Use example data</button><button className="button primary small" onClick={()=>input.current?.click()}><Upload size={15}/> Import CSV</button><input ref={input} type="file" accept=".csv,text/csv" hidden onChange={e=>importFile(e.target.files?.[0])}/></div></section>
        {message&&<div className="message" role="status"><Info size={15}/>{message}<button onClick={()=>setMessage('')}><X size={14}/></button></div>}
        {activeTab==='overview'?<>
          <div className="section-heading"><div><h2>Response characteristics</h2><p>Calculated from the selected measurements</p></div><span className="computed"><span className="status-dot"/> Calculated locally</span></div>
          <section className="metrics-panel">
            <Metric label="Peak response" value={fmt(metrics.peak)} unit="units" detail="Highest measured value after the step" icon={<Activity size={18}/>}/>
            <Metric label="Overshoot" value={fmt(metrics.overshoot)} unit="units" detail="Amount above the final setpoint" icon={<Zap size={18}/>}/>
            <Metric label="Settling time" value={metrics.settlingTime===null?'Not reached':fmt(metrics.settlingTime)} unit={metrics.settlingTime===null?'':'seconds'} detail="Time to remain inside the tolerance band" icon={<Gauge size={18}/>}/>
            <Metric label="Steady-state error" value={fmt(metrics.steadyStateError)} unit="units" detail="Setpoint minus final-window mean" icon={<span className="metric-e">ε</span>}/>
          </section>
          <section className="panel chart-panel"><div className="panel-head"><div><h2>Step response</h2><p>Measured process value against the target setpoint</p></div><div className="chart-tools"><span className="live-label"><span className="status-dot"/> MEASURED DATA</span><button className="icon-btn" title="Graph information"><Info size={16}/></button></div></div><Chart data={data} metrics={metrics}/><div className="chart-foot"><span>Response begins at {fmt(data[metrics.startIndex].time)} seconds</span><span>Target value <b>{fmt(data[data.length-1].setpoint)}</b></span></div></section>
          <div className="lower-grid"><section className="panel diagnosis"><div className="panel-head"><div><h2>Engineering assessment</h2><p>Interpretation of the measured response</p></div><span className={`severity ${severity}`}>{severity==='warning'?'REVIEW REQUIRED':'WITHIN OBSERVED BAND'}</span></div><div className="finding"><div className={`finding-icon ${severity}`}><Info size={18}/></div><div><strong>{diagnostic}</strong><p>{metrics.settlingTime===null?'The response did not remain inside the defined settling band before the recording ended.':`The response entered the defined settling band after ${fmt(metrics.settlingTime)} seconds.`}</p></div></div><div className="finding-list"><div><span>Setpoint crossings</span><b>{metrics.crossings}</b></div><div><span>Final measured mean</span><b>{fmt(metrics.finalMean)}</b></div><div><span>Settling band</span><b>±{fmt(metrics.tolerance)}</b></div></div></section>
            <section className="panel method"><div className="panel-head"><div><h2>Calculation basis</h2><p>Definitions used in this analysis</p></div></div><div className="method-row"><span>Settling tolerance</span><strong>±2% of step</strong></div><div className="method-row"><span>Final value estimate</span><strong>Final 10% mean</strong></div><div className="method-row"><span>Response direction</span><strong>{metrics.responseDirection>0?'Rising step':'Falling step'}</strong></div><div className="method-note"><Info size={14}/> These measurements describe the supplied dataset. They do not certify plant safety or controller stability.</div></section></div>
        </>:<section className="panel data-panel"><div className="panel-head"><div><h2>Source measurements</h2><p>First 100 rows of the imported dataset</p></div><span className="computed">{data.length} total rows</span></div><div className="table-scroll"><table><thead><tr><th>#</th><th>Time (s)</th><th>Setpoint</th><th>Measured value</th><th>Deviation</th></tr></thead><tbody>{data.slice(0,100).map((d,i)=><tr key={i}><td>{i+1}</td><td>{fmt(d.time)}</td><td>{fmt(d.setpoint)}</td><td>{fmt(d.value)}</td><td className={d.value-d.setpoint>0?'positive':'negative'}>{fmt(d.value-d.setpoint)}</td></tr>)}</tbody></table></div></section>}
        <footer className="footer"><span>LOOPSCOPE · RESPONSE INTELLIGENCE</span><span>Deterministic calculations · Browser-based analysis</span></footer>
        </div>
      </main>
    </div>
  </>;
}
