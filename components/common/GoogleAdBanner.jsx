import React, { useEffect } from 'react';

export default function GoogleAdBanner({ slotId, format = 'auto', style = {} }) {
  useEffect(() => {
    try {
      // This pushes the ad to the adsbygoogle array if it exists
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Google Ads error:", e);
    }
  }, []);

  // If no slot ID is provided yet, show a placeholder in development/demo mode
  if (!slotId) {
    return (
      <div className="w-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg h-[100px] flex flex-col items-center justify-center text-slate-400 p-4 my-4">
        <span className="font-bold text-sm uppercase tracking-wider">Advertisement</span>
        <span className="text-xs">Google Ads Banner Placeholder</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden my-4 text-center">
      <ins className="adsbygoogle"
           style={{ display: 'block', ...style }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with actual client ID
           data-ad-slot={slotId}
           data-ad-format={format}
           data-full-width-responsive="true"></ins>
    </div>
  );
}