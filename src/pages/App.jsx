import React, { useState } from 'react';
import AnalysisTab from '../tabs/AnalysisTab.jsx';
import MapTab from '../tabs/MapTab.jsx';

export default function App() {
  const [tab, setTab] = useState('map'); // default to Map first
  return (
    <div style={{height:'100%'}}>
      <div className="tabs">
        <button className={`tab-btn ${tab==='analysis'?'active':''}`} onClick={()=>setTab('analysis')}>Analysis</button>
        <button className={`tab-btn ${tab==='map'?'active':''}`} onClick={()=>setTab('map')}>Map</button>
      </div>
      <div className="content">
        {tab === 'analysis' && <AnalysisTab />}
        {tab === 'map' && <MapTab />}
      </div>
    </div>
  );
}
