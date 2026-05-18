import React, { useEffect, useState, useRef } from 'react';

export default function IframeArticle({ src, title }) {
  const [height, setHeight] = useState(800);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'resize') {
        setHeight(e.data.height + 20); // 增加些許緩衝
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '4rem', width: '100%' }}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        style={{ width: '100%', height: `${height}px`, border: 'none', background: 'transparent' }}
        scrolling="no"
      />
    </div>
  );
}
