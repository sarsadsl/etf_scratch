import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { Activity, RefreshCw, Send, Lock, LogOut, User, ShieldCheck, Filter, BarChart2 } from 'lucide-react';
import './index.css';

const ETF_META = {
  '00981A': { name: '主動統一台股增長', color: '#60a5fa' },
  '00988A': { name: '主動統一全球創新', color: '#a78bfa' },
  '00991A': { name: '主動復華未來50',   color: '#f472b6' },
  '00990A': { name: '主動元大未來',     color: '#34d399' },
  '00980A': { name: '主動野村台灣優選', color: '#facc15' },
  '00982A': { name: '主動群益台灣強棒', color: '#fb923c' },
  '00985A': { name: '主動野村台灣50',   color: '#fdba74' },
};

// ─── 工具函式 ──────────────────────────────────────────────
const formatStockLabel = (code, name, etfCode) => {
  if (!code) return name;
  const tCode = code.trim();
  if (etfCode === '00990A') {
    if (tCode.includes(' ')) return tCode;
    if (/^[A-Za-z]+$/.test(tCode)) return `${tCode} US`;
    if (name && /^[A-Za-z0-9\s\.\-]+$/.test(name) && !/[\u4e00-\u9fa5]/.test(name)) return `${tCode} US`;
    return `${tCode} TW`;
  }
  if (tCode.includes(' ')) return tCode.replace(/\s+/g, '.');
  if (/^[A-Za-z]+$/.test(tCode)) return `${tCode}.US`;
  if (/^[A-Za-z0-9\s\.\-]+$/.test(name) && !/[\u4e00-\u9fa5]/.test(name)) return `${tCode}.US`;
  return `${name}.${tCode}TW`;
};

const ALL_ETF_CODES = Object.keys(ETF_META);

// ─── 主元件 ──────────────────────────────────────────────
function App() {
  // ── 資料狀態 ──
  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── 檢視模式：'single' | 'aggregated' ──
  const [viewMode, setViewMode] = useState('single');

  // ── 當前單檔 ETF ──
  const [activeEtf, setActiveEtf] = useState('00980A');

  // ── ETF 過濾清單（多選，預設全選，持久化）──
  const [visibleEtfs, setVisibleEtfs] = useState(() => {
    try {
      const saved = localStorage.getItem('etf_visible_list');
      return saved ? JSON.parse(saved) : ALL_ETF_CODES;
    } catch { return ALL_ETF_CODES; }
  });
  const [showFilter, setShowFilter] = useState(false);

  // ── 排序與榜單 ──
  const [tableSort, setTableSort] = useState('weight');
  const [diffSort, setDiffSort] = useState('addPct'); // 'addPct' | 'addAbs' | 'subPct' | 'subAbs'

  // ── 身分狀態 ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('etf_mock_user');
      return saved ? JSON.parse(saved) : { role: 'guest', name: '訪客' };
    } catch { return { role: 'guest', name: '訪客' }; }
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('etf_admin_pwd') || '');
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ── 持久化 visibleEtfs ──
  useEffect(() => {
    localStorage.setItem('etf_visible_list', JSON.stringify(visibleEtfs));
  }, [visibleEtfs]);

  // ── 確保 activeEtf 總在可見清單內 ──
  useEffect(() => {
    if (!visibleEtfs.includes(activeEtf)) {
      const first = visibleEtfs[0];
      if (first) setActiveEtf(first);
    }
  }, [visibleEtfs, activeEtf]);

  // ── Toggle 單一 ETF 的可見性 ──
  const toggleEtf = (code) => {
    setVisibleEtfs(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // 至少保留一個
        return prev.filter(c => c !== code);
      }
      return [...prev, code];
    });
  };

  // ── Auth handlers ──
  const handleAdminVerify = (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setAdminToken(passwordInput);
    localStorage.setItem('etf_admin_pwd', passwordInput);
    const adminRole = { role: 'admin', name: '系統站長' };
    setCurrentUser(adminRole);
    localStorage.setItem('etf_mock_user', JSON.stringify(adminRole));
    setShowLogin(false);
    setPasswordInput('');
  };

  const handleLogout = () => {
    if (window.confirm(`確定要登出 ${currentUser.name}？`)) {
      const guestRole = { role: 'guest', name: '訪客' };
      setCurrentUser(guestRole);
      localStorage.setItem('etf_mock_user', JSON.stringify(guestRole));
      setAdminToken('');
      localStorage.removeItem('etf_admin_pwd');
    }
  };

  const handleMockUserLogin = () => {
    const userRole = { role: 'user', name: '付費會員 (測試中)' };
    setCurrentUser(userRole);
    localStorage.setItem('etf_mock_user', JSON.stringify(userRole));
  };

  // ── 資料載入 ──
  useEffect(() => {
    fetch('./data/index.json')
      .then(res => res.json())
      .then(dates => {
        if (dates && dates.length > 0) {
          setHistoryDates(dates);
          setSelectedDate(dates[0]);
        }
      })
      .catch(() => setSelectedDate('latest'));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`./data/${selectedDate}.json`)
      .then(res => res.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  // ── 單檔持股 ──
  const activeHoldings = useMemo(() => {
    if (!data) return [];
    return data[activeEtf] || [];
  }, [data, activeEtf]);

  const sortedHoldings = useMemo(() => {
    const arr = [...activeHoldings];
    if (tableSort === 'diffShares') arr.sort((a, b) => (b.diffShares || 0) - (a.diffShares || 0));
    return arr;
  }, [activeHoldings, tableSort]);

  const chartData = useMemo(() => {
    if (!activeHoldings.length) return [];
    const sorted = [...activeHoldings].sort((a, b) => b.weight - a.weight);
    return sorted.slice(0, 10).map(item => {
      const diff = item.diffWeight || 0;
      const shares = item.shares || 0;
      const diffShares = item.diffShares || 0;
      const prevShares = shares - diffShares;
      const computedPct = prevShares > 0 ? parseFloat(((diffShares / prevShares) * 100).toFixed(2)) : 0;
      const finalPct = item.diffSharesPercent !== undefined ? item.diffSharesPercent : computedPct;
      return {
        name: formatStockLabel(item.stockCode, item.stockName, activeEtf),
        weight: item.weight,
        prevWeight: Math.max(Number((item.weight - diff).toFixed(2)), 0),
        diff,
        diffSharesPercent: finalPct,
        diffShares: diffShares
      };
    });
  }, [activeHoldings, activeEtf]);

  // 第三圖表：變動差異排行榜 (支援新增佔比、新增張數、減少佔比、減少張數)
  const diffChartInfo = useMemo(() => {
    if (!activeHoldings.length) return { data: [], dataKey: '', color: '', formatter: null, title: '' };
    
    const mapped = activeHoldings.map(item => {
      const shares = item.shares || 0;
      const diffShares = item.diffShares || 0;
      const prevShares = shares - diffShares;
      const computedPct = prevShares > 0 ? parseFloat(((diffShares / prevShares) * 100).toFixed(2)) : (diffShares > 0 ? 100 : 0);
      const finalPct = item.diffSharesPercent !== undefined ? item.diffSharesPercent : computedPct;
      return {
        name: formatStockLabel(item.stockCode, item.stockName, activeEtf),
        diffSharesPercent: finalPct,
        diffShares: diffShares,
        diffSharesLot: Math.round(diffShares / 1000)
      };
    });

    let filtered = [];
    let config = { dataKey: 'diffSharesPercent', color: 'var(--tw-up)', formatter: (v) => `+${v}%`, title: '新增張數佔比排行榜' };

    switch (diffSort) {
      case 'addPct':
        filtered = mapped.filter(m => m.diffSharesPercent > 0).sort((a, b) => b.diffSharesPercent - a.diffSharesPercent);
        break;
      case 'addAbs':
        filtered = mapped.filter(m => m.diffShares > 0).sort((a, b) => b.diffShares - a.diffShares);
        config = { dataKey: 'diffShares', color: 'var(--tw-up)', formatter: (v) => `+${(v / 1000).toFixed(1).replace(/\.0$/, '')} 張`, title: '總加碼張數排行榜' };
        break;
      case 'subPct':
        filtered = mapped.filter(m => m.diffSharesPercent < 0)
          .map(m => ({ ...m, diffSharesPercentAbs: Math.abs(m.diffSharesPercent) }))
          .sort((a, b) => b.diffSharesPercentAbs - a.diffSharesPercentAbs);
        config = { dataKey: 'diffSharesPercentAbs', color: 'var(--tw-down)', formatter: (v) => `-${v}%`, title: '大砍張數佔比排行榜' };
        break;
      case 'subAbs':
        filtered = mapped.filter(m => m.diffShares < 0)
          .map(m => ({ ...m, diffSharesAbs: Math.abs(m.diffShares) }))
          .sort((a, b) => b.diffSharesAbs - a.diffSharesAbs);
        config = { dataKey: 'diffSharesAbs', color: 'var(--tw-down)', formatter: (v) => `-${(v / 1000).toFixed(1).replace(/\.0$/, '')} 張`, title: '總減碼張數排行榜' };
        break;
    }

    return { data: filtered.slice(0, 10), ...config };
  }, [activeHoldings, activeEtf, diffSort]);

  // ── 聚合視圖：跨 ETF 股票資金吸收 ──
  // 對 visibleEtfs 中有資料的 ETF，加總同一股票的持股比例與持股數量
  const aggregatedData = useMemo(() => {
    if (!data) return [];
    const map = {}; // stockCode -> { stockCode, stockName, totalWeight, etfCount, etfBreakdown: [{etfCode, weight, shares}] }

    visibleEtfs.forEach(etfCode => {
      const holdings = data[etfCode];
      if (!Array.isArray(holdings)) return;
      holdings.forEach(h => {
        if (!h.stockCode) return;
        if (!map[h.stockCode]) {
          map[h.stockCode] = {
            stockCode: h.stockCode,
            stockName: h.stockName,
            totalWeight: 0,
            etfCount: 0,
            etfBreakdown: []
          };
        }
        map[h.stockCode].totalWeight = Number((map[h.stockCode].totalWeight + (h.weight || 0)).toFixed(4));
        map[h.stockCode].etfCount += 1;
        map[h.stockCode].etfBreakdown.push({
          etfCode,
          weight: h.weight || 0,
          shares: h.shares || 0
        });
      });
    });

    return Object.values(map)
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [data, visibleEtfs]);

  // ── Telegram 推播 ──
  const handleSendTelegram = async () => {
    setIsSending(true);
    setSendResult(null);
    const workerUrl = 'https://etf-telegram-proxy.sarsadsl.workers.dev/';
    try {
      const top10 = sortedHoldings.slice(0, 10);
      let reportText = `📊 【${ETF_META[activeEtf]?.name} (${activeEtf}) 盤後持股報告】\n`;
      reportText += `📅 資料日期：${selectedDate}\n\n🎯 權重前十大成分股：\n`;
      top10.forEach((hold, idx) => {
        const sign = hold.diffWeight > 0 ? '🔺 +' : (hold.diffWeight < 0 ? '🔻 ' : '➖ ');
        const diffWeightStr = (hold.diffWeight != null) ? `${sign}${hold.diffWeight}%` : '無異動';
        const diffLot = Math.round((hold.diffShares || 0) / 1000);
        const shareStr = diffLot !== 0 ? ` | 張數 ${diffLot > 0 ? '+' : ''}${diffLot}` : '';
        const isNewFlag = hold.isNew ? ' 🌟(新進)' : '';
        reportText += `${idx + 1}. ${formatStockLabel(hold.stockCode, hold.stockName, activeEtf)}${isNewFlag}\n`;
        reportText += `    權重: ${hold.weight}% [${diffWeightStr}]${shareStr}\n`;
      });
      reportText += `\n🌐 從 ETF Monitor 儀表板發送`;
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reportText, password: adminToken })
      });
      if (!response.ok) throw new Error('API 無效狀態');
      setSendResult({ status: 'success', text: '頻道推播成功' });
      setTimeout(() => setSendResult(null), 3000);
    } catch { setSendResult({ status: 'error', text: '連線 Cloudflare 失敗' }); setTimeout(() => setSendResult(null), 3000); }
    finally { setIsSending(false); }
  };

  const isMockData = ['20260416', '20260418', '2026416'].includes(selectedDate);

  // ── ETF 過濾器面板 ──
  const FilterPanel = () => (
    <div style={{
      position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, zIndex: 200,
      background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
      borderRadius: '12px', padding: '1rem', minWidth: '280px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '0.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>顯示的 ETF</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setVisibleEtfs(ALL_ETF_CODES)} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', cursor: 'pointer' }}>全選</button>
          <button onClick={() => setVisibleEtfs([activeEtf])} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>只留目前</button>
        </div>
      </div>
      {ALL_ETF_CODES.map(code => {
        const meta = ETF_META[code];
        const isVisible = visibleEtfs.includes(code);
        const hasData = data && Array.isArray(data[code]) && data[code].length > 0;
        return (
          <label key={code} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.5rem 0.6rem', borderRadius: '8px', cursor: 'pointer',
            background: isVisible ? `${meta.color}12` : 'transparent',
            border: `1px solid ${isVisible ? meta.color + '40' : 'transparent'}`,
            transition: 'all 0.15s'
          }}>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => toggleEtf(code)}
              style={{ accentColor: meta.color, width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isVisible ? '#e2e8f0' : 'var(--text-secondary)' }}>{code}</div>
              <div style={{ fontSize: '0.75rem', color: isVisible ? meta.color : 'var(--text-secondary)' }}>{meta.name}</div>
            </div>
            {!hasData && <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(148,163,184,0.1)', padding: '1px 6px', borderRadius: '4px' }}>無資料</span>}
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="header">
        <div>
          <h1>Active ETF Monitor</h1>
          <p>主動式 ETF 持股追蹤 Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>

          {currentUser.role === 'user' && (
            <a href="https://t.me/+KDAKgrTXv9QyYjFl" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', textDecoration: 'none' }}>
              <ShieldCheck size={14} color="#34d399" />
              <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>進入專屬 Telegram 頻道</span>
            </a>
          )}

          {currentUser.role === 'admin' && (
            <button onClick={handleSendTelegram} disabled={isSending || !adminToken}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '8px', backgroundColor: sendResult?.status === 'success' ? '#10b981' : (sendResult?.status === 'error' ? '#ef4444' : 'transparent'), color: sendResult?.status ? '#fff' : 'var(--accent-blue)', border: sendResult?.status ? 'none' : '1px solid var(--accent-blue)', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.6 : 1 }}>
              <Send size={16} />
              {isSending ? '鑑權中...' : (sendResult?.text || '發送廣播')}
            </button>
          )}

          {currentUser.role !== 'guest' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <User size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>{currentUser.name}</span>
              </div>
              <button onClick={handleLogout} title="登出" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleMockUserLogin} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                註冊 / 登入
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowLogin(!showLogin)} title="站長專用通道"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <Lock size={16} />
                </button>
                {showLogin && (
                  <form onSubmit={handleAdminVerify} style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', gap: '0.5rem' }}>
                    <input type="password" placeholder="輸入站長密碼..." value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eee', padding: '0.5rem 0.6rem', borderRadius: '4px', outline: 'none' }} />
                    <button type="submit" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '0 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>解鎖</button>
                  </form>
                )}
              </div>
            </div>
          )}

          {loading && <RefreshCw className="pulse" style={{ color: 'var(--accent-blue)' }} />}
          <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            {selectedDate === 'latest' && <option value="latest">Latest</option>}
            {historyDates.map(date => <option key={date} value={date}>{date}</option>)}
          </select>
        </div>
      </header>

      {isMockData && (
        <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center', fontWeight: 600 }}>
          ⚠️ 此為系統壓力測試用的【模擬資料】。
        </div>
      )}

      {/* ── 控制列：視圖切換 + ETF 過濾器 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>

        {/* 視圖切換 */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setViewMode('single')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', background: viewMode === 'single' ? 'var(--accent-blue)' : 'transparent', color: viewMode === 'single' ? '#fff' : 'var(--text-secondary)' }}
          >
            <Activity size={14} /> 單檔 ETF
          </button>
          <button
            onClick={() => setViewMode('aggregated')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', background: viewMode === 'aggregated' ? '#a78bfa' : 'transparent', color: viewMode === 'aggregated' ? '#fff' : 'var(--text-secondary)' }}
          >
            <BarChart2 size={14} /> 股票資金吸收
          </button>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ETF 過濾器 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilter(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 1rem', borderRadius: '8px', border: `1px solid ${showFilter ? 'var(--accent-blue)' : 'var(--border-light)'}`, background: showFilter ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', color: showFilter ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
          >
            <Filter size={14} />
            ETF 篩選 ({visibleEtfs.length}/{ALL_ETF_CODES.length})
          </button>
          {showFilter && <FilterPanel />}
        </div>
      </div>

      {/* ── ETF Tab 列（僅限可見的 ETF）── */}
      {viewMode === 'single' && (
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          {visibleEtfs.map(etf => {
            const meta = ETF_META[etf];
            if (!meta) return null;
            const hasData = data && Array.isArray(data[etf]) && data[etf].length > 0;
            return (
              <button
                key={etf}
                onClick={() => setActiveEtf(etf)}
                style={{
                  borderColor: activeEtf === etf ? meta.color : 'var(--border-light)',
                  background: activeEtf === etf ? `${meta.color}1A` : 'rgba(255,255,255,0.04)',
                  opacity: hasData ? 1 : 0.5,
                  position: 'relative', whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: activeEtf === etf ? meta.color : 'var(--text-secondary)' }}>{etf}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: activeEtf === etf ? '#e2e8f0' : 'var(--text-secondary)', marginTop: '1px' }}>{meta.name.replace('主動', '')}</span>
                {!hasData && <span style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '0.55rem', background: '#475569', color: '#cbd5e1', borderRadius: '4px', padding: '1px 4px' }}>無資料</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════ 單檔 ETF 視圖 ══════════ */}
      {viewMode === 'single' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.8rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: ETF_META[activeEtf].color }}>
                {ETF_META[activeEtf].name}
              </h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{activeEtf}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              資料更新日期：<span style={{ color: '#e2e8f0', fontWeight: 600, letterSpacing: '0.05em' }}>{historyDates[0] || selectedDate || '讀取中'}</span>
            </div>
          </div>

          {(!activeHoldings || activeHoldings.length === 0) ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
              <Activity size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
              <h3>尚無資料</h3>
              <p>此日期可能尚未有 {activeEtf} 的持股資料</p>
            </div>
          ) : (
            <>
              <div className="grid-2">
                <div className="glass-panel">
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>前十大持股權重</h3>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-light)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                        <Pie data={chartData} dataKey="weight" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill={ETF_META[activeEtf].color} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} labelStyle={{ fontSize: '13px', fontWeight: 500 }}>
                          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={ETF_META[activeEtf].color} fillOpacity={1 - index * 0.08} />)}
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
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `${val}%`} label={{ value: '權重 (%)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 13 }} />
                        <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={15} fontWeight={600} tickLine={false} axisLine={false} width={120} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 600 }} formatter={(value, name, props) => {
                          if (name === '今日權重') {
                            const pct = props.payload.diffSharesPercent;
                            const ext = pct ? ` (新增張數 ${pct > 0 ? '+' : ''}${pct}%)` : '';
                            return [`${value}%${ext}`, name];
                          }
                          return [`${value}%`, name];
                        }} />
                        <Bar dataKey="prevWeight" name="前日權重" fill="var(--text-secondary)" radius={[0, 4, 4, 0]} barSize={8} />
                        <Bar dataKey="weight" name="今日權重" radius={[0, 4, 4, 0]} barSize={12}>
                          <LabelList dataKey="diffSharesPercent" position="right" formatter={(val) => val ? `${val > 0 ? '+' : ''}${val}%` : ''} fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.diff > 0 ? 'var(--tw-up)' : (entry.diff < 0 ? 'var(--tw-down)' : 'var(--accent-blue)')} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 第三區塊：變動差異排行榜 */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: diffChartInfo.color || '#94a3b8' }}>
                      {diffChartInfo.title || '變動差異排行榜'}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                      <button onClick={() => setDiffSort('addPct')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: diffSort === 'addPct' ? 'rgba(16,185,129,0.2)' : 'transparent', color: diffSort === 'addPct' ? '#10b981' : 'var(--text-secondary)' }}>加碼%</button>
                      <button onClick={() => setDiffSort('addAbs')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: diffSort === 'addAbs' ? 'rgba(16,185,129,0.2)' : 'transparent', color: diffSort === 'addAbs' ? '#10b981' : 'var(--text-secondary)' }}>加碼張數</button>
                      <button onClick={() => setDiffSort('subPct')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: diffSort === 'subPct' ? 'rgba(239,68,68,0.2)' : 'transparent', color: diffSort === 'subPct' ? '#ef4444' : 'var(--text-secondary)' }}>減碼%</button>
                      <button onClick={() => setDiffSort('subAbs')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: diffSort === 'subAbs' ? 'rgba(239,68,68,0.2)' : 'transparent', color: diffSort === 'subAbs' ? '#ef4444' : 'var(--text-secondary)' }}>減碼張數</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: '350px', position: 'relative' }}>
                    {diffChartInfo.data && diffChartInfo.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diffChartInfo.data} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 20 }}>
                          <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => diffSort.includes('Pct') ? `${val}%` : `${val / 1000}張`} label={{ value: diffSort.includes('Pct') ? '佔比 (%)' : '張數 (千股)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 13 }} />
                          <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={15} fontWeight={600} tickLine={false} axisLine={false} width={120} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 600 }} formatter={(value, name) => {
                            return [diffChartInfo.formatter(value), diffChartInfo.title];
                          }} />
                          <Bar dataKey={diffChartInfo.dataKey} name={diffChartInfo.title} fill={diffChartInfo.color} radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey={diffChartInfo.dataKey} position="right" formatter={diffChartInfo.formatter} fill={diffChartInfo.color} fontSize={14} fontWeight={700} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <Activity size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <span style={{ fontWeight: 600 }}>本作日未偵測到此類型的實質異動</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>完整持股清單 — {ETF_META[activeEtf]?.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setTableSort('weight')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: tableSort === 'weight' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderColor: tableSort === 'weight' ? 'var(--accent-blue)' : 'var(--border-light)', color: tableSort === 'weight' ? '#fff' : 'var(--text-secondary)' }}>依權重</button>
                    <button onClick={() => setTableSort('diffShares')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: tableSort === 'diffShares' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderColor: tableSort === 'diffShares' ? 'var(--accent-blue)' : 'var(--border-light)', color: tableSort === 'diffShares' ? '#fff' : 'var(--text-secondary)' }}>依張數異動</button>
                  </div>
                </div>
                <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                      <tr>
                        <th>排名</th><th>代號</th><th>名稱</th><th>權重 (%)</th><th>權重異動</th><th>張數</th><th>狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHoldings.map((hold, idx) => {
                        const sharesLot = Math.round(hold.shares / 1000).toLocaleString();
                        const diffLot = Math.round((hold.diffShares || 0) / 1000);
                        const prevShares = (hold.shares || 0) - (hold.diffShares || 0);
                        const computedPct = prevShares > 0 ? parseFloat((((hold.diffShares || 0) / prevShares) * 100).toFixed(2)) : 0;
                        const finalPct = hold.diffSharesPercent !== undefined ? hold.diffSharesPercent : computedPct;
                        return (
                          <tr key={hold.stockCode}>
                            <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: '#94a3b8' }}>{hold.stockCode}</td>
                            <td style={{ fontWeight: 500 }}>{hold.stockName}</td>
                            <td>{hold.weight}%</td>
                            <td className={hold.diffWeight > 0 ? 'text-success' : (hold.diffWeight < 0 ? 'text-danger' : 'text-neutral')} style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                              {hold.diffWeight > 0 ? '+' : ''}{hold.diffWeight || 0}%
                            </td>
                            <td>
                              {sharesLot}
                              <span className={diffLot > 0 ? 'text-success' : (diffLot < 0 ? 'text-danger' : 'text-neutral')} style={{ fontWeight: 800, fontSize: '1.1rem', marginLeft: '8px' }}>
                                {diffLot !== 0 ? `(${diffLot > 0 ? '+' : ''}${diffLot})` : ''}
                                {finalPct ? ` [${finalPct > 0 ? '+' : ''}${finalPct}%]` : ''}
                              </span>
                            </td>
                            <td>{hold.isNew && <span className="badge new">新進榜</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════ 股票資金吸收視圖 ══════════ */}
      {viewMode === 'aggregated' && (
        <div className="glass-panel">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>主動 ETF 資金吸收排行</h3>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              統計範圍：{visibleEtfs.join(' · ')}｜共 {visibleEtfs.length} 檔 ETF
              ｜累計吸收權重 = 各 ETF 持有該股票的權重加總
            </p>
          </div>

          {aggregatedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <Activity size={48} style={{ marginBottom: '1rem' }} />
              <p>尚無跨 ETF 資料可聚合，請確認已選擇有效 ETF 並載入資料</p>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                  <tr>
                    <th>排名</th>
                    <th>股票</th>
                    <th>累計權重 (%)</th>
                    <th>涵蓋 ETF 數</th>
                    <th>各 ETF 持倉明細</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedData.slice(0, 50).map((item, idx) => (
                    <tr key={item.stockCode}>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{item.stockName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{item.stockCode}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: item.etfCount >= 2 ? '#a78bfa' : '#e2e8f0' }}>
                            {item.totalWeight.toFixed(2)}%
                          </span>
                          {/* mini bar */}
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', minWidth: '60px' }}>
                            <div style={{ height: '100%', borderRadius: '3px', background: item.etfCount >= 2 ? '#a78bfa' : 'var(--accent-blue)', width: `${Math.min(item.totalWeight / (aggregatedData[0]?.totalWeight || 1) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem',
                          background: item.etfCount >= 3 ? 'rgba(167,139,250,0.2)' : (item.etfCount >= 2 ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)'),
                          color: item.etfCount >= 3 ? '#a78bfa' : (item.etfCount >= 2 ? '#60a5fa' : 'var(--text-secondary)'),
                          border: `1px solid ${item.etfCount >= 3 ? 'rgba(167,139,250,0.4)' : (item.etfCount >= 2 ? 'rgba(96,165,250,0.3)' : 'var(--border-light)')}`
                        }}>
                          {item.etfCount} 檔
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.etfBreakdown.map(e => {
                            const meta = ETF_META[e.etfCode];
                            return (
                              <span key={e.etfCode} style={{
                                fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap',
                                background: `${meta?.color}18`, color: meta?.color || '#94a3b8',
                                border: `1px solid ${meta?.color}40`
                              }}>
                                {e.etfCode} {e.weight.toFixed(2)}%
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DevTools */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1e293b', padding: '12px 16px', borderRadius: '12px', zIndex: 9999, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>🛠 DevTools 角色模擬</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setCurrentUser({ role: 'guest', name: '訪客' }); setAdminToken(''); }} style={{ background: currentUser.role === 'guest' ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🌍 訪客</button>
          <button onClick={() => { setCurrentUser({ role: 'user', name: '付費訂閱戶' }); setAdminToken(''); }} style={{ background: currentUser.role === 'user' ? '#10b981' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✨ 一般會員</button>
          <button onClick={() => { setCurrentUser({ role: 'admin', name: '系統站長' }); setAdminToken(adminToken || 'devtools-bypass'); }} style={{ background: currentUser.role === 'admin' ? '#ef4444' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>👑 管理員</button>
        </div>
      </div>

    </div>
  );
}

export default App;
