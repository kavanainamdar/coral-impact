import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const NUM_FMT = new Intl.NumberFormat(undefined,{maximumFractionDigits:3});

function formatCell(value, col){
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'number' || Number.isNaN(value)) return value;
  if (/p_value|pearson_p/i.test(col)) {
    if (value === 0) return '<1e-308';
    const abs = Math.abs(value);
    if (abs < 1e-6) return value.toExponential(2);
  }
  return NUM_FMT.format(value);
}

function fetchCSV(path) {
  const base = import.meta?.env?.BASE_URL || '/';
  const url = (base.endsWith('/') ? base.slice(0,-1) : base) + path; // path expected to start with /data
  return fetch(url)
    .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
    .then(text => Papa.parse(text, { header:true, dynamicTyping:true, skipEmptyLines:true }).data);
}

export default function AnalysisTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCI, setShowCI] = useState(true);

  useEffect(()=>{
    setLoading(true);
    fetchCSV('/data/regression_yearly_stats.csv')
      .then(rows => setData(rows))
      .catch(err => setError(err.message))
      .finally(()=> setLoading(false));
  },[]);

  if (loading) return <div className='panel'>Loading regression stats...</div>;
  if (error) return <div className='panel'>Error: {error}</div>;
  if (!data.length) return <div className='panel'>No regression data found.</div>;

  const slopeSeries = data.map(d => ({ year:d.year, slope:d.slope, slope_ci_lower:d.slope_ci_lower, slope_ci_upper:d.slope_ci_upper }));
  // const rSeries = data.map(d => ({ year:d.year, r:d.pearson_r })); // reserved for future correlation chart

  const columns = Object.keys(data[0]);
  const numericCols = new Set(columns.filter(c => typeof data[0][c] === 'number'));

  return (
    <div className='panel analysis-section'>
      <div style={{display:'flex', alignItems:'baseline', gap:'1.5rem', flexWrap:'wrap'}}>
        <h2 style={{margin:'0 0 .5rem 0'}}>Regression Overview</h2>
        <label style={{fontSize:'.8rem'}}><input type='checkbox' checked={showCI} onChange={e=>setShowCI(e.target.checked)} /> Show Slope CI</label>
      </div>
      <div className='analysis-charts'>
        <div style={{width:'100%', height:320}}>
          <ResponsiveContainer>
            <LineChart data={slopeSeries} margin={{left:20,right:20,top:10,bottom:10}}>
              <CartesianGrid stroke='#e0e0e0' strokeDasharray='3 3' />
              <XAxis dataKey='year' tick={{fontSize:12}} />
              <YAxis yAxisId='s' label={{ value:'Slope', angle:-90, position:'insideLeft' }} tick={{fontSize:12}} />
              <Tooltip formatter={(v)=>NUM_FMT.format(v)} />
              <Legend wrapperStyle={{fontSize:12}} />
              <Line yAxisId='s' type='monotone' dataKey='slope' stroke='#0066cc' dot strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {showCI && slopeSeries.some(d=>d.slope_ci_lower!==undefined && d.slope_ci_lower!=='') && (
          <div style={{width:'100%', height:240}}>
            <ResponsiveContainer>
              <LineChart data={slopeSeries} margin={{left:20,right:20,top:10,bottom:10}}>
                <CartesianGrid stroke='#f0f0f0' />
                <XAxis dataKey='year' tick={{fontSize:12}} />
                <YAxis label={{ value:'Slope CI', angle:-90, position:'insideLeft' }} tick={{fontSize:12}} />
                <Tooltip formatter={(v)=>NUM_FMT.format(v)} />
                <Legend wrapperStyle={{fontSize:12}} />
                <Line type='monotone' dataKey='slope_ci_lower' stroke='#ff8243' dot={false} strokeWidth={1.5} />
                <Line type='monotone' dataKey='slope_ci_upper' stroke='#ff8243' dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <h3 style={{marginTop:28, marginBottom:6}}>Yearly Regression Table</h3>
      <div className='analysis-table-wrapper'>
        <table className='analysis-table'>
          <thead>
            <tr>
              {columns.map(col => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row,i)=>(
              <tr key={i}>
                {columns.map(col => <td key={col} className={numericCols.has(col)?'num':''}>{formatCell(row[col], col)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='analysis-footnote'>
        Slope: change in mean bleaching intensity per additional vessel event (per coral patch/year). Pearson r: linear correlation. Confidence intervals (if present) are bootstrap-derived.
      </div>
    </div>
  );
}
