import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Activity, RefreshCw } from 'lucide-react';
import './index.css';

const ETF_META = {
  '00981A': { name: '主動統一台股增長', color: '#60a5fa' },
  '00988A': { name: '主動統一全球創新', color: '#a78bfa' },
  '00991A': { name: '主動復華未來50', color: '#f472b6' },
  '00990A': { name: '主動元大未來', color: '#34d399' }
};

const formatStockLabel = (code, name, etfCode) => {
  if (!code) return name;
  const tCode = code.trim();
  
  if (etfCode === '00990A') {
    // 若原代碼已經有空白區域碼 (例如 "MU US", "6787 JP")，則直接回傳
    if (tCode.includes(' ')) return tCode;
    // 否則智慧補上區域碼：純英文代號預設加 US
    if (/^[A-Za-z]+$/.test(tCode)) return `${tCode} US`;
    // 若名稱為純英文預設為海外(補 US)以防 5801 等數字代號
    if (name && /^[A-Za-z0-9\s\.\-]+$/.test(name) && !/[\u4e00-\u9fa5]/.test(name)) return `${tCode} US`;
    // 其他（如台股 2330，或有中文名稱者）一律補 TW
    return `${tCode} TW`;
  }
  
  // 一般 ETF (如 00981A, 00988A)：依照原需求加綴
  // 海外股票特徵 1：包含空白 (如 "LITE US")
  if (tCode.includes(' ')) {
    return tCode.replace(/\s+/g, '.');
  }
  
  // 海外股票特徵 2：全英文代號 (如 "LITE", "SNDK"，若被誤刪國家碼或原資料無國家碼)
  if (/^[A-Za-z]+$/.test(tCode)) {
    return `${tCode}.US`; 
  }
  
  // 海外股票特徵 3：若名稱為純英文，但代碼為數字 (如 5801, Furukawa Electric)
  if (/^[A-Za-z0-9\s\.\-]+$/.test(name) && !/[\u4e00-\u9fa5]/.test(name)) {
    return `${tCode}.US`; // 預設給個後綴
  }

  // 預設台股：股票名稱+代號TW
  return `${name}.${tCode}TW`;
};

function App() {
  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEtf, setActiveEtf] = useState('00981A');
  const [tableSort, setTableSort] = useState('weight');

  useEffect(() => {
    // 第一次先載入 index.json 取得歷史日期清單
    fetch('./data/index.json')
      .then(res => res.json())
      .then(dates => {
        if (dates && dates.length > 0) {
          setHistoryDates(dates);
          setSelectedDate(dates[0]); // 預設使用最新的日期
        }
      })
      .catch(err => {
        console.error('Failed to fetch index.json', err);
        // Fallback: 如果抓不到 index，我們預期會有 latest.json
        setSelectedDate('latest');
      });
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`./data/${selectedDate}.json`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch daily data', err);
        setLoading(false);
      });
  }, [selectedDate]);

  const activeHoldings = useMemo(() => {
    if (!data) return [];
    return data[activeEtf] || [];
  }, [data, activeEtf]);

  const sortedHoldings = useMemo(() => {
    const arr = [...activeHoldings];
    if (tableSort === 'diffShares') {
      arr.sort((a, b) => (b.diffShares || 0) - (a.diffShares || 0));
    }
    return arr;
  }, [activeHoldings, tableSort]);

  // 圖表用資料：權重最高的前十檔
  const chartData = useMemo(() => {
    if (!activeHoldings || activeHoldings.length === 0) return [];
    const sorted = [...activeHoldings].sort((a, b) => b.weight - a.weight);
    return sorted.slice(0, 10).map(item => {
      const diff = item.diffWeight || 0;
      const prevWeight = Number((item.weight - diff).toFixed(2));
      return {
        name: formatStockLabel(item.stockCode, item.stockName, activeEtf),
        weight: item.weight,
        prevWeight: prevWeight > 0 ? prevWeight : 0,
        diff: diff
      };
    });
  }, [activeHoldings]);

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>Active ETF Monitor</h1>
          <p>主動式 ETF 持股追蹤 Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {loading && <RefreshCw className="pulse" style={{ color: 'var(--accent-blue)' }} />}
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {selectedDate === 'latest' && <option value="latest">Latest</option>}
            {historyDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {Object.keys(ETF_META).map(etf => (
          <button 
            key={etf}
            onClick={() => setActiveEtf(etf)}
            style={{ 
              borderColor: activeEtf === etf ? ETF_META[etf].color : 'var(--border-light)',
              background: activeEtf === etf ? `${ETF_META[etf].color}1A` : 'rgba(255,255,255,0.05)'
            }}
          >
            {etf} {ETF_META[etf].name}
          </button>
        ))}
      </div>

      {!activeHoldings || activeHoldings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <Activity size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>尚無資料</h3>
          <p>此日期可能尚未有 {activeEtf} 的持股資料</p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid-2">
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>前十大持股權重</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-light)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="weight"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill={ETF_META[activeEtf].color}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      labelStyle={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ETF_META[activeEtf].color} fillOpacity={1 - index * 0.08} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>權重對比 (前日 vs 今日)</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                    <XAxis 
                      type="number" 
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `${val}%`}
                      label={{ value: '權重 (%)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 13 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--text-secondary)" 
                      fontSize={15} 
                      fontWeight={600}
                      tickLine={false} 
                      axisLine={false} 
                      width={120} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 600 }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    {/* 前日權重 - 較暗的顏色 */}
                    <Bar dataKey="prevWeight" name="前日權重" fill="var(--text-secondary)" radius={[0, 4, 4, 0]} barSize={8} />
                    {/* 今日權重 - 根據增減顯示台股紅綠色 */}
                    <Bar dataKey="weight" name="今日權重" radius={[0, 4, 4, 0]} barSize={12}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.diff > 0 ? 'var(--tw-up)' : (entry.diff < 0 ? 'var(--tw-down)' : 'var(--accent-blue)')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table Row */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>完整持股清單</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setTableSort('weight')}
                  style={{ 
                    padding: '0.4rem 0.8rem', fontSize: '0.85rem', 
                    background: tableSort === 'weight' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: tableSort === 'weight' ? 'var(--accent-blue)' : 'var(--border-light)',
                    color: tableSort === 'weight' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  依權重 (預設)
                </button>
                <button 
                  onClick={() => setTableSort('diffShares')}
                  style={{ 
                    padding: '0.4rem 0.8rem', fontSize: '0.85rem', 
                    background: tableSort === 'diffShares' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: tableSort === 'diffShares' ? 'var(--accent-blue)' : 'var(--border-light)',
                    color: tableSort === 'diffShares' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  依張數異動排序
                </button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                  <tr>
                    <th>排名</th>
                    <th>標的</th>
                    <th>權重 (%)</th>
                    <th>權重異動</th>
                    <th>張數</th>
                    <th>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((hold, idx) => {
                  const sharesLot = Math.round(hold.shares / 1000).toLocaleString();
                  const diffLot = Math.round((hold.diffShares || 0) / 1000);
                  const isNew = hold.isNew;
                  
                  return (
                    <tr key={hold.stockCode}>
                      <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500, letterSpacing: '0.02em' }}>{formatStockLabel(hold.stockCode, hold.stockName, activeEtf)}</td>
                      <td>{hold.weight}%</td>
                      <td className={hold.diffWeight > 0 ? 'text-success' : (hold.diffWeight < 0 ? 'text-danger' : 'text-neutral')} style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                        {hold.diffWeight > 0 ? '+' : ''}{hold.diffWeight || 0}%
                      </td>
                      <td>
                        {sharesLot}
                        <span 
                          className={diffLot > 0 ? 'text-success' : (diffLot < 0 ? 'text-danger' : 'text-neutral')} 
                          style={{ fontWeight: 800, fontSize: '1.1rem', marginLeft: '8px' }}
                        >
                          ({diffLot > 0 ? '+' : ''}{diffLot})
                        </span>
                      </td>
                      <td>{isNew && <span className="badge new">新進榜</span>}</td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App;
