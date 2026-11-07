export type Sample = { time: number; setpoint: number; value: number };
export type Metrics = { peak: number; overshoot: number; settlingTime: number | null; steadyStateError: number; finalMean: number; tolerance: number; crossings: number; responseDirection: number; startIndex: number };

export function parseCSV(text: string): Sample[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 4) throw new Error('The file needs a header and at least three data rows.');
  const split = (line: string) => line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]).map(h => h.toLowerCase());
  const find = (names: string[]) => headers.findIndex(h => names.includes(h));
  const ti = find(['time','timestamp','seconds','t']);
  const si = find(['setpoint','target','reference','sp']);
  const vi = find(['value','process_value','measurement','measured','pv','actual']);
  if (ti < 0 || si < 0 || vi < 0) throw new Error('Required columns: time, setpoint, value.');
  const rows = lines.slice(1).map((line, i) => {
    const c = split(line); const row = {time:Number(c[ti]), setpoint:Number(c[si]), value:Number(c[vi])};
    if (!Object.values(row).every(Number.isFinite)) throw new Error(`Invalid numeric value on data row ${i + 2}.`);
    return row;
  });
  if (rows.length < 3) throw new Error('At least three valid samples are required.');
  for (let i=1;i<rows.length;i++) if (rows[i].time <= rows[i-1].time) throw new Error('Time values must be strictly increasing.');
  return rows;
}

export function analyze(data: Sample[]): Metrics {
  const finalSp = data[data.length-1].setpoint;
  let startIndex = 0;
  for (let i=1;i<data.length;i++) if (Math.abs(data[i].setpoint-data[i-1].setpoint) > 1e-9) { startIndex=i; break; }
  const baseline = data[Math.max(0,startIndex-1)].setpoint;
  const step = finalSp-baseline;
  const direction = step >= 0 ? 1 : -1;
  const response = data.slice(startIndex);
  const peak = direction > 0 ? Math.max(...response.map(d=>d.value)) : Math.min(...response.map(d=>d.value));
  const overshoot = Math.max(0, direction*(peak-finalSp));
  const tolerance = Math.max(Math.abs(step)*0.02, Math.abs(finalSp)*0.001, 1e-6);
  let settlingTime: number | null = null;
  for (let i=startIndex;i<data.length;i++) {
    const settled = data.slice(i).every(d=>Math.abs(d.value-finalSp)<=tolerance);
    if (settled) { settlingTime=data[i].time-data[startIndex].time; break; }
  }
  const tail = data.slice(Math.max(startIndex, Math.floor(data.length*0.9)));
  const finalMean = tail.reduce((s,d)=>s+d.value,0)/tail.length;
  const steadyStateError = finalSp-finalMean;
  let crossings=0;
  for(let i=startIndex+1;i<data.length;i++) if ((data[i-1].value-finalSp)*(data[i].value-finalSp)<0) crossings++;
  return {peak, overshoot, settlingTime, steadyStateError, finalMean, tolerance, crossings, responseDirection:direction, startIndex};
}

export function makeDemo(): Sample[] {
  const out: Sample[]=[];
  for(let i=0;i<=80;i++) {
    const t=i*0.5; const sp=t<2?20:100;
    const elapsed=Math.max(0,t-2);
    const y=t<2?20:100-80*Math.exp(-0.19*elapsed)*Math.cos(0.48*elapsed) + 1.5*Math.sin(1.7*elapsed)*Math.exp(-0.12*elapsed);
    out.push({time:t,setpoint:sp,value:y});
  }
  return out;
}

export function downloadReport(data: Sample[], m: Metrics) {
  const rows = [
    ['LOOPSCOPE — RESPONSE ANALYSIS REPORT',''],['Samples',String(data.length)],['Peak response',m.peak.toFixed(3)],['Overshoot',m.overshoot.toFixed(3)],['Settling time (s)',m.settlingTime===null?'Not settled within observation window':m.settlingTime.toFixed(3)],['Steady-state error',m.steadyStateError.toFixed(3)],['Final measured mean',m.finalMean.toFixed(3)],['Settling tolerance',m.tolerance.toFixed(3)],['Setpoint crossings',String(m.crossings)],['Method note','Settling time uses a ±2% step-amplitude band (with a small scale floor); final value is mean of final 10% of samples.'],['Data note','Results describe the supplied dataset; they do not certify plant safety or controller stability.']
  ];
  const csv=rows.map(r=>r.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='loopscope-analysis-report.csv'; a.click(); URL.revokeObjectURL(url);
}
