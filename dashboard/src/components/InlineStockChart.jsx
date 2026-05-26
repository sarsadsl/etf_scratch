import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

// --- 輔助函式區 ---
function getWeekYear(dateStr) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getMonthYear(dateStr) {
  return dateStr.substring(0, 7);
}

function aggregateData(data, timeframe) {
  if (timeframe === 'daily') return data;
  const grouped = {};
  data.forEach(d => {
    const key = timeframe === 'weekly' ? getWeekYear(d.date) : getMonthYear(d.date);
    if (!grouped[key]) {
      grouped[key] = { ...d };
    } else {
      grouped[key].max = Math.max(grouped[key].max, d.max);
      grouped[key].min = Math.min(grouped[key].min, d.min);
      grouped[key].close = d.close;
      grouped[key].Trading_Volume += d.Trading_Volume;
    }
  });
  return Object.values(grouped);
}

function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].date, value: sum / period });
  }
  return result;
}

// --- ETFBasicInfo 顯示面板 ---
function ETFBasicInfo({ stats, metaData }) {
  if (!stats) return <div style={{ color: 'var(--text-secondary)' }}>載入中...</div>;
  
  const isUp = stats.change >= 0;
  const color = isUp ? '#ef4444' : '#10b981';
  const sign = isUp ? '▲' : '▼';

  const premiumInfo = React.useMemo(() => {
    if (!metaData || !metaData.nav || !stats.close) return { value: '-', color: 'var(--text-secondary)' };
    const p = ((stats.close - metaData.nav) / metaData.nav) * 100;
    return {
      value: `${p > 0 ? '+' : ''}${p.toFixed(2)}%`,
      color: p > 0 ? '#ef4444' : p < 0 ? '#10b981' : 'var(--text-secondary)'
    };
  }, [metaData, stats]);

  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' };
  const labelStyle = { color: 'var(--text-secondary)', fontSize: '0.85rem' };
  const valStyle = { color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>最新交易日</span>
          <span>{stats.time}</span>
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color, lineHeight: 1.1 }}>
          {stats.close.toFixed(2)}
        </div>
        <div style={{ fontSize: '1rem', color, fontWeight: 600, display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span>{sign} {Math.abs(stats.change).toFixed(2)}</span>
          <span>{stats.changePercent.toFixed(2)}%</span>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={rowStyle}><span style={labelStyle}>開盤</span><span style={valStyle}>{stats.open.toFixed(2)}</span></div>
        <div style={rowStyle}><span style={labelStyle}>最高</span><span style={valStyle}>{stats.high.toFixed(2)}</span></div>
        <div style={rowStyle}><span style={labelStyle}>最低</span><span style={valStyle}>{stats.low.toFixed(2)}</span></div>
        <div style={rowStyle}><span style={labelStyle}>成交量(張)</span><span style={valStyle}>{(stats.volume/1000).toLocaleString(undefined, {maximumFractionDigits:0})}</span></div>
        <div style={rowStyle}>
          <span style={labelStyle}>離季線</span>
          <span style={{...valStyle, color: stats.distToMa60 >= 0 ? '#ef4444' : '#10b981'}}>
            {stats.distToMa60 !== null ? `${stats.distToMa60 > 0 ? '+' : ''}${stats.distToMa60.toFixed(2)}%` : '-'}
          </span>
        </div>
        <div style={rowStyle}><span style={labelStyle}>淨值</span><span style={valStyle}>{metaData?.nav || '-'}</span></div>
        <div style={rowStyle}><span style={labelStyle}>折溢價</span><span style={{...valStyle, color: premiumInfo.color}}>{premiumInfo.value}</span></div>
        <div style={rowStyle}><span style={labelStyle}>規模(百萬)</span><span style={valStyle}>{metaData?.aum || '-'}</span></div>
        <div style={{...rowStyle, borderBottom: 'none'}}><span style={labelStyle}>發行單位(千)</span><span style={valStyle}>{metaData?.units || '-'}</span></div>
      </div>
    </div>
  );
}

// ----------------------------------------------------

export default function InlineStockChart({ stockCode }) {
  const chartContainerRef = useRef(null);
  const legendRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);
  const [rawData, setRawData] = useState([]);
  const [timeframe, setTimeframe] = useState('daily');
  const [latestStats, setLatestStats] = useState(null);
  const [metaData, setMetaData] = useState(null);
  
  const chartRef = useRef(null);
  const cleanCode = stockCode.replace(/\s*(US|TW|HK|JP)$/i, '').trim();

  // 1. 初次載入
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setRawData([]);
        setLatestStats(null);
        setMetaData(null);
        
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const startDate = threeYearsAgo.toISOString().split('T')[0];

        // 加上 timestamp 防止 corsproxy 或 allorigins 快取舊資料
        const targetUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${cleanCode}&start_date=${startDate}&_t=${Date.now()}`;
        
        let res;
        try { res = await fetch(targetUrl); if (!res.ok) throw new Error('Direct fetch not ok'); } 
        catch (e1) {
          try { res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`); if (!res.ok) throw new Error('corsproxy.io not ok'); } 
          catch (e2) { res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`); }
        }
        
        const result = await res.json();
        
        if (ignore) return;

        if (result.status !== 200 || !result.data || result.data.length === 0) {
          setHasData(false); setLoading(false); return;
        }

        setRawData(result.data);
        setHasData(true);
        setLoading(false);
      } catch (err) {
        if (ignore) return;
        setError(`無法取得歷史資料 (${err.message})`);
        setLoading(false);
      }
    };
    
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/data/latest/meta.json`);
        if (res.ok) {
          const allMeta = await res.json();
          if (!ignore && allMeta[cleanCode]) {
            setMetaData(allMeta[cleanCode]);
          }
        }
      } catch (e) {
        console.log('Failed to fetch meta.json', e);
      }
    };

    fetchData();
    fetchMeta();

    return () => {
      ignore = true;
    };
  }, [cleanCode]);

  // 2. 計算即時的右側最新報價 (基於日K rawData)
  useEffect(() => {
    if (rawData.length >= 2) {
      const current = rawData[rawData.length - 1];
      const previous = rawData[rawData.length - 2];
      const change = current.close - previous.close;
      const changePercent = (change / previous.close) * 100;

      const ma60Array = calculateMA(rawData, 60);
      const lastMa60 = ma60Array.length > 0 ? ma60Array[ma60Array.length - 1].value : null;
      let distToMa60 = null;
      if (lastMa60) {
        distToMa60 = ((current.close - lastMa60) / lastMa60) * 100;
      }

      setLatestStats({
        time: current.date,
        close: current.close,
        open: current.open,
        high: current.max,
        low: current.min,
        prevClose: previous.close,
        volume: current.Trading_Volume,
        change,
        changePercent,
        distToMa60,
      });
    }
  }, [rawData]);

  // 3. 繪製圖表
  useEffect(() => {
    if (rawData.length === 0 || !chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const aggregated = aggregateData(rawData, timeframe);
    const klineData = aggregated.map(d => ({
      time: d.date, open: d.open, high: d.max, low: d.min, close: d.close,
    }));
    const volumeData = aggregated.map(d => ({
      time: d.date, value: d.Trading_Volume / 1000, 
      color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'
    }));

    const ma5Data = calculateMA(aggregated, 5);
    const ma10Data = calculateMA(aggregated, 10);
    const ma20Data = calculateMA(aggregated, 20);
    const ma60Data = calculateMA(aggregated, 60);

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { width: 1, color: 'rgba(255, 255, 255, 0.3)', style: 3 }, horzLine: { width: 1, color: 'rgba(255, 255, 255, 0.3)', style: 3 } },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true },
      autoSize: true,
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({ upColor: '#ef4444', downColor: '#10b981', borderVisible: false, wickUpColor: '#ef4444', wickDownColor: '#10b981' });
    candlestickSeries.setData(klineData);

    const volumeSeries = chart.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '' });
    chart.priceScale('').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeries.setData(volumeData);

    const ma5Series = chart.addLineSeries({ color: '#f8fafc', lineWidth: 1, crosshairMarkerVisible: false }); ma5Series.setData(ma5Data);
    const ma10Series = chart.addLineSeries({ color: '#facc15', lineWidth: 1, crosshairMarkerVisible: false }); ma10Series.setData(ma10Data);
    const ma20Series = chart.addLineSeries({ color: '#c084fc', lineWidth: 1, crosshairMarkerVisible: false }); ma20Series.setData(ma20Data);
    const ma60Series = chart.addLineSeries({ color: '#60a5fa', lineWidth: 1, crosshairMarkerVisible: false }); ma60Series.setData(ma60Data);

    const totalPoints = klineData.length;
    if (totalPoints > 0) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, totalPoints - 30), to: totalPoints - 1 });
    }

    const updateLegend = (param) => {
      if (!legendRef.current) return;
      const valid = !(param === undefined || param.time === undefined || param.point.x < 0 || param.point.y < 0);
      
      const setLegendHTML = (k, v, m5, m10, m20, m60) => {
        if (!k) return;
        const color = k.close >= k.open ? '#ef4444' : '#10b981';
        legendRef.current.innerHTML = `
          <div style="font-size: 13px; margin-bottom: 4px;">
            <span style="color: #94a3b8; margin-right: 8px;">${k.time}</span>
            開: <span style="color: ${color}; margin-right: 8px;">${k.open}</span>
            高: <span style="color: ${color}; margin-right: 8px;">${k.high}</span>
            低: <span style="color: ${color}; margin-right: 8px;">${k.low}</span>
            收: <span style="color: ${color}; font-weight: bold; margin-right: 8px;">${k.close}</span>
            量: <span style="color: var(--text-primary);">${v ? v.value.toLocaleString() : 0}</span>
          </div>
          <div style="font-size: 12px;">
            <span style="color: #f8fafc; margin-right: 8px;">MA5: ${m5 ? m5.value.toFixed(2) : '-'}</span>
            <span style="color: #facc15; margin-right: 8px;">MA10: ${m10 ? m10.value.toFixed(2) : '-'}</span>
            <span style="color: #c084fc; margin-right: 8px;">MA20: ${m20 ? m20.value.toFixed(2) : '-'}</span>
            <span style="color: #60a5fa; margin-right: 8px;">MA60: ${m60 ? m60.value.toFixed(2) : '-'}</span>
          </div>
        `;
      };

      if (valid) {
        setLegendHTML(
          param.seriesData.get(candlestickSeries),
          param.seriesData.get(volumeSeries),
          param.seriesData.get(ma5Series),
          param.seriesData.get(ma10Series),
          param.seriesData.get(ma20Series),
          param.seriesData.get(ma60Series)
        );
      } else {
        setLegendHTML(
          klineData[klineData.length - 1],
          volumeData[volumeData.length - 1],
          ma5Data[ma5Data.length - 1],
          ma10Data[ma10Data.length - 1],
          ma20Data[ma20Data.length - 1],
          ma60Data[ma60Data.length - 1]
        );
      }
    };

    chart.subscribeCrosshairMove(updateLegend);
    updateLegend();

    return () => {
      chart.unsubscribeCrosshairMove(updateLegend);
      chart.remove();
      chartRef.current = null;
    };
  }, [rawData, timeframe]);

  return (
    <div 
      className="glass-panel"
      style={{
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.2rem',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* 左側：圖表區 */}
      <div style={{ flex: '1 1 65%', minWidth: '400px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['daily', 'weekly', 'monthly'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  background: timeframe === tf ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: timeframe === tf ? '#60a5fa' : '#94a3b8',
                  border: `1px solid ${timeframe === tf ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`,
                  padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
                }}
              >
                {tf === 'daily' ? '日K' : tf === 'weekly' ? '周K' : '月K'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {(!loading && hasData && !error) && (
            <div ref={legendRef} style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, background: 'rgba(15, 23, 42, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(4px)', pointerEvents: 'none' }} />
          )}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <Loader2 className="animate-spin" size={36} color="var(--accent-blue)" />
              <span style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>正在獲取歷史資料...</span>
            </div>
          )}
          {error && !loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', zIndex: 10 }}>
              <AlertCircle size={40} />
              <span style={{ marginTop: '12px', fontWeight: 500 }}>{error}</span>
            </div>
          )}
          {!hasData && !loading && !error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <AlertCircle size={40} color="#94a3b8" />
              <span style={{ marginTop: '12px', color: '#94a3b8', fontWeight: 500 }}>暫無歷史走勢</span>
            </div>
          )}
          <div ref={chartContainerRef} style={{ width: '100%', height: '100%', opacity: (!loading && hasData && !error) ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }} />
        </div>
      </div>

      {/* 右側：基本資料面板 */}
      <div 
        style={{ 
          flex: '1 1 30%', 
          minWidth: '250px',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          paddingLeft: '1.2rem',
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <ETFBasicInfo stats={latestStats} metaData={metaData} />
      </div>
    </div>
  );
}
