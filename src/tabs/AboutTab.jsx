import React from 'react';

export default function AboutTab(){
  return (
    <div className='panel' style={{maxWidth:900, margin:'0 auto'}}>
      <h2 style={{marginTop:0}}>About This Application</h2>
      <p>
        This tool explores relationships between vessel activity and coral bleaching intensity over time,
        combining spatial intersection analytics with yearly regression summaries.
      </p>
      <p>
        The Map tab lets you interact with geospatial layers and inspect intersection points, while the Analysis
        tab presents derived metrics, statistical trends, and confidence intervals.
      </p>
      <p>
        Data are preprocessed through a lightweight pipeline and shipped as static assets for a fast, serverless deployment.
        All numbers are formatted for readability, with p-values shown in scientific notation when very small.
      </p>
      <p>
        Future enhancements may include interactive filtering, correlation visualizations, and expanded environmental covariates.
      </p>
    </div>
  );
}
