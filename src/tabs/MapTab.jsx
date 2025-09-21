import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function fetchJSON(path){
  // Ensure path honors Vite base (important for GitHub Pages or subdirectory deploys)
  const url = (import.meta.env.BASE_URL || '/') + path.replace(/^\//,'');
  return fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.json(); });
}

const COLOR_BREAKS = [
  { thr: 500000, color: '#800026', label: '≥ 500k' },
  { thr: 100000, color: '#BD0026', label: '≥ 100k' },
  { thr:  50000, color: '#E31A1C', label: '≥ 50k' },
  { thr:  10000, color: '#FC4E2A', label: '≥ 10k' },
  { thr:   5000, color: '#FD8D3C', label: '≥ 5k' },
  { thr:   1000, color: '#FEB24C', label: '≥ 1k' },
  { thr:    100, color: '#FED976', label: '≥ 100' }
];
function colorForArea(a){ for (const b of COLOR_BREAKS){ if (a >= b.thr) return b.color; } return '#FFEDA0'; }

const INITIAL_CENTER = [10,0];
const INITIAL_ZOOM = 2;

export default function MapTab(){
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [colorMode, setColorMode] = useState('bleaching');
  const [bleachBuckets, setBleachBuckets] = useState({ low:true, mid:true, high:true });

  const bleachingThresholds = useMemo(()=>{
    if (colorMode !== 'bleaching') return null;
    const vals = features
      .filter(f=> !yearFilter || f.properties.year === parseInt(yearFilter,10))
      .map(f=> f.properties.bleaching_intensity)
      .filter(v=> v!=null && !isNaN(v))
      .sort((a,b)=>a-b);
    if (!vals.length) return null;
    function q(p){ const idx=(vals.length-1)*p; const lo=Math.floor(idx), hi=Math.ceil(idx); if(lo===hi) return vals[lo]; const t=idx-lo; return vals[lo]*(1-t)+vals[hi]*t; }
    const q33=q(1/3), q66=q(2/3); return { q33, q66, min:vals[0], max:vals[vals.length-1] };},[features, yearFilter, colorMode]);

  useEffect(()=>{ setLoading(true); console.log('[MapTab] fetching data...'); fetchJSON('data/intersections_light.geojson')
    .then(fc => setFeatures(fc.features || []))
    .catch(err => setError(err.message))
    .finally(()=> setLoading(false)); },[]);

  const years = useMemo(()=>Array.from(new Set(features.map(f=>f.properties.year))).sort(),[features]);
  const filtered = useMemo(()=>{ if(!yearFilter) return features; const yr=parseInt(yearFilter,10); return features.filter(f=>f.properties.year===yr); },[features, yearFilter]);

  const circles = useMemo(()=> filtered.map(f=>{ const area=f.properties.__intersect_area_m2 || 0; const bleaching=f.properties.bleaching_intensity; const r=Math.min(30, Math.max(3, Math.sqrt(area)/60 + 4)); let bucket=null; if(bleaching!=null && !isNaN(bleaching) && bleachingThresholds){ if(bleaching < bleachingThresholds.q33) bucket='low'; else if(bleaching < bleachingThresholds.q66) bucket='mid'; else bucket='high'; } return { coord:f.geometry.coordinates, area, bleaching, year:f.properties.year, r, bucket }; }),[filtered, bleachingThresholds]);

  const BUCKET_COLORS = { low:'#ffffcc', mid:'#fd8d3c', high:'#800026' };
  function colorForBleachingCircle(c){ if(!c || c.bleaching==null || isNaN(c.bleaching)) return '#cccccc'; if(!c.bucket) return '#999999'; return BUCKET_COLORS[c.bucket] || '#999999'; }

  if (loading) return <div className='panel'>Loading map data...</div>;
  if (error) return <div className='panel'>Error: {error}</div>;
  if (!features.length) {
    console.warn('[MapTab] zero features after load');
    return <div className='panel'>No intersection features found.</div>;
  }

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div className='toolbar' style={{padding:'0.5rem 1rem'}}>
        <label>Year: <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)}>
          <option value=''>All</option>
          {years.map(y=> <option key={y} value={y}>{y}</option>)}
        </select></label>
        <label style={{marginLeft:'1rem'}}><input type='checkbox' checked={showLegend} onChange={e=>setShowLegend(e.target.checked)} /> Show Legend</label>
        <label style={{marginLeft:'1rem'}}>Color Mode: <select value={colorMode} onChange={e=>setColorMode(e.target.value)}>
          <option value='area'>Area</option>
          <option value='bleaching'>Bleaching</option>
        </select></label>
      </div>
      <div style={{flex:1, position:'relative', minHeight:'400px'}}>
        <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{height:'100%', width:'100%'}} preferCanvas whenReady={(m)=>{console.log('[MapTab] Map ready. Feature count:', features.length);}}>
          <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' attribution='&copy; OpenStreetMap contributors' />
          {circles.filter(c=>{ if(colorMode!=='bleaching') return true; if(!bleachingThresholds) return true; if(!c.bucket) return false; return bleachBuckets[c.bucket]; }).map((c,i)=>{
            const fillColor = colorMode==='area'? colorForArea(c.area) : colorForBleachingCircle(c);
            return <CircleMarker key={i} center={[c.coord[1], c.coord[0]]} radius={c.r} pathOptions={{color:'#222', weight:0.5, fillColor, fillOpacity:0.65}}>
              <Tooltip direction='top'>Year: {c.year}<br/>Area m²: {Math.round(c.area)}{c.bleaching!=null? <><br/>Bleaching: {Number.isFinite(c.bleaching)? c.bleaching.toFixed(2): c.bleaching}</>: null}{c.bucket? <><br/>Bucket: {c.bucket}</>: null}</Tooltip>
            </CircleMarker>;
          })}
          {colorMode==='bleaching' && bleachingThresholds && circles.every(c=> !c.bucket || !bleachBuckets[c.bucket]) && (
            <div style={{position:'absolute', top:50, left:50, background:'rgba(255,255,255,0.9)', padding:8, border:'1px solid #ccc', fontSize:12}}>
              No circles visible: enable more buckets or switch to Area mode.
            </div>
          )}
        </MapContainer>
        {showLegend && (
          <div className='legend' style={{position:'absolute', zIndex:1000, bottom:10, left:10, background:'rgba(255,255,255,0.9)', padding:'8px 10px', lineHeight:1.15, fontSize:12, border:'1px solid #ccc', borderRadius:4, maxWidth:220}}>
            {colorMode==='area' ? (
              <>
                <strong style={{fontSize:13}}>Intersection Area (m²)</strong><br/>
                {COLOR_BREAKS.map(b=> (<div key={b.thr}><span style={{background:b.color,display:'inline-block',width:12,height:12,marginRight:4,border:'1px solid #222'}}></span>{b.label}</div>))}
                <div><span style={{background:'#FFEDA0',display:'inline-block',width:12,height:12,marginRight:4,border:'1px solid #ccc'}}></span>&lt; 100</div>
              </>
            ) : (
              <>
                <strong style={{fontSize:13}}>Bleaching Intensity</strong><br/>
                {bleachingThresholds ? (
                  <div style={{marginTop:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,margin:'4px 0'}}>
                      <span style={{background:'#ffffcc',width:16,height:12,display:'inline-block',border:'1px solid #ccc', opacity: bleachBuckets.low?1:0.25}}></span>
                      <span style={{background:'#fd8d3c',width:16,height:12,display:'inline-block',border:'1px solid #ccc', opacity: bleachBuckets.mid?1:0.25}}></span>
                      <span style={{background:'#800026',width:16,height:12,display:'inline-block',border:'1px solid #222', opacity: bleachBuckets.high?1:0.25}}></span>
                    </div>
                    <div style={{fontSize:10, lineHeight:1.3}}>
                      <div><strong>Buckets</strong> (quantiles)</div>
                      <div>Low &lt; {bleachingThresholds.q33.toFixed(2)}</div>
                      <div>Mid {bleachingThresholds.q33.toFixed(2)}–{bleachingThresholds.q66.toFixed(2)}</div>
                      <div>High ≥ {bleachingThresholds.q66.toFixed(2)}</div>
                    </div>
                    <div style={{fontSize:10, marginTop:4}}>Min {bleachingThresholds.min.toFixed(2)} · Max {bleachingThresholds.max.toFixed(2)}</div>
                  </div>
                ) : <div style={{fontSize:11, marginTop:4}}>No bleaching values.</div>}
                <div style={{marginTop:6}}>
                  <strong style={{fontSize:12}}>Show Buckets:</strong><br/>
                  {['low','mid','high'].map(b=> (
                    <label key={b} style={{display:'inline-block',marginRight:8,fontSize:11}}>
                      <input type='checkbox' checked={bleachBuckets[b]} onChange={e=> setBleachBuckets(prev=> ({...prev,[b]:e.target.checked}))} /> {b}
                    </label>
                  ))}
                </div>
                <div style={{fontSize:10, marginTop:4}}>Uncheck buckets to hide them.</div>
              </>
            )}
            {colorMode==='area' && (
              <>
                <hr style={{margin:'6px 6px'}}/>
                <strong style={{fontSize:13}}>Circle Size</strong><br/>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <svg width='70' height='30'>
                    <circle cx='15' cy='15' r='4' fill='#999' stroke='#222' strokeWidth='0.5' />
                    <circle cx='35' cy='15' r='8' fill='#999' stroke='#222' strokeWidth='0.5' />
                    <circle cx='60' cy='15' r='12' fill='#999' stroke='#222' strokeWidth='0.5' />
                  </svg>
                </div>
                <div style={{marginTop:2}}>Radius ∝ √(area) (fixed scale)</div>
              </>
            )}
            <div style={{marginTop:4, fontStyle:'italic'}}>Filter by year to isolate temporal clusters.</div>
          </div>
        )}
      </div>
    </div>
  );
}
