import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

// --- 輔助函式區 ---

// 取得該日期屬於 ISO 的哪一年哪一周 (例如 "2024-W15")
function getWeekYear(dateStr) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// 取得該日期的 YYYY-MM
function getMonthYear(dateStr) {
  return dateStr.substring(0, 7);
}

// 資料聚合引擎
function aggregateData(data, timeframe) {
  if (timeframe === 'daily') return data;
  
  const grouped = {};
  data.forEach(d => {
    const key = timeframe === 'weekly' ? getWeekYear(d.date) : getMonthYear(d.date);
    if (!grouped[key]) {
      grouped[key] = {
        date: d.date,
        open: d.open,
        max: d.max,
        min: d.min,
        close: d.close,
        Trading_Volume: d.Trading_Volume
      };
    } else {
      grouped[key].max = Math.max(grouped[key].max, d.max);
      grouped[key].min = Math.min(grouped[key].min, d.min);
      grouped[key].close = d.close;
      grouped[key].Trading_Volume += d.Trading_Volume;
    }
  });
  return Object.values(grouped);
}

// 計算簡單移動平均線 (SMA)
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].date, value: sum / period });
  }
  return result;
}

// ----------------------------------------------------

export default function StockChartModal({ stockCode, stockName, onClose }) {
  const chartContainerRef = useRef(null);
  const legendRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);
  
  // 原始所有日 K 資料 (API 抓取後不動)
  const [rawData, setRawData] = useState([]);
  
  // 當前選擇的週期: 'daily', 'weekly', 'monthly'
  const [timeframe, setTimeframe] = useState('daily');
  
  // 圖表實例參考
  const chartRef = useRef(null);
  const seriesRefs = useRef({}); // 存放所有 series 以供移除或更新

  const cleanCode = stockCode.replace(/\s*(US|TW|HK|JP)$/i, '').trim();

  // 1. 初次載入：抓取原始資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 為了均線，我們需要多抓一些時間的資料。過去 3 年，這樣 60MA 或是更長期的均線才畫得出來
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const startDate = threeYearsAgo.toISOString().split('T')[0];

        const targetUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${cleanCode}&start_date=${startDate}`;
        
        let res;
        try {
          res = await fetch(targetUrl);
          if (!res.ok) throw new Error('Direct fetch not ok');
        } catch (e1) {
          try {
            res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
            if (!res.ok) throw new Error('corsproxy.io not ok');
          } catch (e2) {
            res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
          }
        }
        
        const result = await res.json();

        if (result.status !== 200 || !result.data || result.data.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        setRawData(result.data);
        setHasData(true);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch stock data:', err);
        setError(`無法取得歷史資料 (${err.message})`);
        setLoading(false);
      }
    };

    fetchData();
  }, [cleanCode]);

  // 2. 根據 timeframe 與 rawData 重新渲染圖表
  useEffect(() => {
    if (rawData.length === 0 || !chartContainerRef.current) return;

    // 清理舊圖表
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 聚合資料
    const aggregated = aggregateData(rawData, timeframe);
    
    // 轉為 chart 格式
    const klineData = aggregated.map(d => ({
      time: d.date,
      open: d.open,
      high: d.max,
      low: d.min,
      close: d.close,
    }));

    const volumeData = aggregated.map(d => ({
      time: d.date,
      value: d.Trading_Volume / 1000, 
      color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'
    }));

    // 計算均線
    const ma5Data = calculateMA(aggregated, 5);
    const ma10Data = calculateMA(aggregated, 10);
    const ma20Data = calculateMA(aggregated, 20);
    const ma60Data = calculateMA(aggregated, 60);

    // 建立圖表
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: 'rgba(255, 255, 255, 0.3)', style: 3 },
        horzLine: { width: 1, color: 'rgba(255, 255, 255, 0.3)', style: 3 },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true },
      autoSize: true,
    });
    chartRef.current = chart;

    // 添加 K 線
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#10b981',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#10b981',
    });
    candlestickSeries.setData(klineData);

    // 添加成交量
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });
    chart.priceScale('').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeries.setData(volumeData);

    // 添加均線
    const ma5Series = chart.addLineSeries({ color: '#f8fafc', lineWidth: 1, crosshairMarkerVisible: false });
    ma5Series.setData(ma5Data);
    
    const ma10Series = chart.addLineSeries({ color: '#facc15', lineWidth: 1, crosshairMarkerVisible: false });
    ma10Series.setData(ma10Data);
    
    const ma20Series = chart.addLineSeries({ color: '#c084fc', lineWidth: 1, crosshairMarkerVisible: false });
    ma20Series.setData(ma20Data);
    
    const ma60Series = chart.addLineSeries({ color: '#60a5fa', lineWidth: 1, crosshairMarkerVisible: false });
    ma60Series.setData(ma60Data);

    // 預設自動 Zoom 到最後 30 個資料點 (30天/周/月)
    const totalPoints = klineData.length;
    if (totalPoints > 0) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalPoints - 30),
        to: totalPoints - 1,
      });
    }

    // 更新圖例的函數
    const updateLegend = (param) => {
      if (!legendRef.current) return;
      
      const validCrosshairPoint = !(
        param === undefined ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.y < 0
      );

      if (validCrosshairPoint) {
        const kline = param.seriesData.get(candlestickSeries);
        const ma5 = param.seriesData.get(ma5Series);
        const ma10 = param.seriesData.get(ma10Series);
        const ma20 = param.seriesData.get(ma20Series);
        const ma60 = param.seriesData.get(ma60Series);
        const vol = param.seriesData.get(volumeSeries);

        if (kline) {
          const color = kline.close >= kline.open ? '#ef4444' : '#10b981';
          legendRef.current.innerHTML = `
            <div style="font-size: 13px; margin-bottom: 4px;">
              <span style="color: #94a3b8; margin-right: 8px;">${param.time}</span>
              開: <span style="color: ${color}; margin-right: 8px;">${kline.open}</span>
              高: <span style="color: ${color}; margin-right: 8px;">${kline.high}</span>
              低: <span style="color: ${color}; margin-right: 8px;">${kline.low}</span>
              收: <span style="color: ${color}; font-weight: bold; margin-right: 8px;">${kline.close}</span>
              量: <span style="color: var(--text-primary);">${vol ? vol.value.toLocaleString() : 0}</span>
            </div>
            <div style="font-size: 12px;">
              <span style="color: #f8fafc; margin-right: 8px;">MA5: ${ma5 ? ma5.value.toFixed(2) : '-'}</span>
              <span style="color: #facc15; margin-right: 8px;">MA10: ${ma10 ? ma10.value.toFixed(2) : '-'}</span>
              <span style="color: #c084fc; margin-right: 8px;">MA20: ${ma20 ? ma20.value.toFixed(2) : '-'}</span>
              <span style="color: #60a5fa; margin-right: 8px;">MA60: ${ma60 ? ma60.value.toFixed(2) : '-'}</span>
            </div>
          `;
        }
      } else {
        // 十字線離開，顯示最後一筆
        const lastKline = klineData[klineData.length - 1];
        const lastVol = volumeData[volumeData.length - 1];
        const lastMa5 = ma5Data[ma5Data.length - 1];
        const lastMa10 = ma10Data[ma10Data.length - 1];
        const lastMa20 = ma20Data[ma20Data.length - 1];
        const lastMa60 = ma60Data[ma60Data.length - 1];
        
        if (lastKline) {
          const color = lastKline.close >= lastKline.open ? '#ef4444' : '#10b981';
          legendRef.current.innerHTML = `
            <div style="font-size: 13px; margin-bottom: 4px;">
              <span style="color: #94a3b8; margin-right: 8px;">${lastKline.time}</span>
              開: <span style="color: ${color}; margin-right: 8px;">${lastKline.open}</span>
              高: <span style="color: ${color}; margin-right: 8px;">${lastKline.high}</span>
              低: <span style="color: ${color}; margin-right: 8px;">${lastKline.low}</span>
              收: <span style="color: ${color}; font-weight: bold; margin-right: 8px;">${lastKline.close}</span>
              量: <span style="color: var(--text-primary);">${lastVol ? lastVol.value.toLocaleString() : 0}</span>
            </div>
            <div style="font-size: 12px;">
              <span style="color: #f8fafc; margin-right: 8px;">MA5: ${lastMa5 ? lastMa5.value.toFixed(2) : '-'}</span>
              <span style="color: #facc15; margin-right: 8px;">MA10: ${lastMa10 ? lastMa10.value.toFixed(2) : '-'}</span>
              <span style="color: #c084fc; margin-right: 8px;">MA20: ${lastMa20 ? lastMa20.value.toFixed(2) : '-'}</span>
              <span style="color: #60a5fa; margin-right: 8px;">MA60: ${lastMa60 ? lastMa60.value.toFixed(2) : '-'}</span>
            </div>
          `;
        }
      }
    };

    chart.subscribeCrosshairMove(updateLegend);
    updateLegend(); // 預設呼叫一次以顯示最後一根 K 線的資料

    return () => {
      chart.unsubscribeCrosshairMove(updateLegend);
      chart.remove();
      chartRef.current = null;
    };
  }, [rawData, timeframe]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1200px', // 放大一點以容納更多資訊
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題、週期控制與關閉按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-block', width: '5px', height: '22px', background: 'var(--accent-purple)', borderRadius: '3px' }} />
              {stockName} <span style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 500 }}>({stockCode})</span>
            </h2>
            <div style={{ margin: '8px 0 0 15px', display: 'flex', gap: '8px' }}>
              {['daily', 'weekly', 'monthly'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    background: timeframe === tf ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: timeframe === tf ? '#60a5fa' : '#94a3b8',
                    border: `1px solid ${timeframe === tf ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {tf === 'daily' ? '日K' : tf === 'weekly' ? '周K' : '月K'}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 圖表容器與圖例 */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          {/* 絕對定位的互動圖例 */}
          {(!loading && hasData && !error) && (
            <div 
              ref={legendRef}
              style={{
                position: 'absolute',
                top: 10,
                right: 70,
                zIndex: 20,
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'none' // 讓滑鼠可以穿透圖例點擊後方的圖表
              }}
            >
              {/* 將由 JS 動態填入 OHLC 與 MA */}
            </div>
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
              <span style={{ marginTop: '12px', color: '#94a3b8', fontWeight: 500 }}>暫無該標的之歷史走勢資料</span>
              <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>FinMind API 主要支援台灣股市，海外標的可能無法獲取。</p>
            </div>
          )}

          <div 
            ref={chartContainerRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              opacity: (!loading && hasData && !error) ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }} 
          />
        </div>
      </div>
    </div>
  );
}
