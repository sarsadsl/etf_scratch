import { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { Activity, RefreshCw, Send, Lock, LogOut, User, ShieldCheck, Filter, BarChart2, BookOpen, ArrowLeft } from 'lucide-react';
import IndustryIndex from './pages/IndustryIndex';
import BmcPage from './pages/BmcPage';
import DeltaPage from './pages/DeltaPage';
import GlobalWafersPage from './pages/GlobalWafersPage';
import BizLinkPage from './pages/BizLinkPage';
import StockChartModal from './components/StockChartModal';
import InlineStockChart from './components/InlineStockChart';
import './index.css';

const ETF_META = {
  '00981A': { name: '主動統一台股增長', color: '#60a5fa' },
  '00988A': { name: '主動統一全球創新', color: '#a78bfa' },
  '00991A': { name: '主動復華未來50', color: '#f472b6' },
  '00990A': { name: '主動元大未來', color: '#34d399' },
  '00403A': { name: '主動統一台股升級50', color: '#10b981' },
  '00980A': { name: '主動野村台灣優選', color: '#facc15' },
  '00982A': { name: '主動群益台灣強棒', color: '#fb923c' },
  '00985A': { name: '主動野村台灣50', color: '#fdba74' },
  '00992A': { name: '主動群益科技創新', color: '#f87171' },
  '00995A': { name: '主動中信卓越成長', color: '#818cf8' },
};

// ─── 產業板塊字典與分類邏輯 ──────────────────────────────────
const STOCK_INDUSTRY_MAP = {
  // 半導體代工
  '2330': '半導體代工', '2303': '半導體代工', '5347': '半導體代工', '6488': '半導體代工', '3105': '半導體代工', '4991': '半導體代工',
  'INTL': '半導體代工', 'INTC': '半導體代工', 'TSEM': '半導體代工', 'WOLF': '半導體代工', 'SOI': '半導體代工', 'SOI FP': '半導體代工', 'AXTI US': '半導體代工',
  
  // 半導體封測
  '3711': '半導體封測', '2449': '半導體封測', '6147': '半導體封測', '3264': '半導體封測', '6257': '半導體封測', '8150': '半導體封測', '2351': '半導體封測',
  
  // IC 設計 / IP
  '2454': 'IC 設計/IP', '3661': 'IC 設計/IP', '3443': 'IC 設計/IP', '3035': 'IC 設計/IP', 
  '6462': 'IC 設計/IP', '8299': 'IC 設計/IP', '5274': 'IC 設計/IP', '5269': 'IC 設計/IP', 
  '3034': 'IC 設計/IP', '2379': 'IC 設計/IP', '3527': 'IC 設計/IP', '3008': 'IC 設計/IP', '4966': 'IC 設計/IP',
  '3529': 'IC 設計/IP', '6415': 'IC 設計/IP', '6531': 'IC 設計/IP', '8016': 'IC 設計/IP',
  'AMD': 'IC 設計/IP', 'AMD US': 'IC 設計/IP', 'NVDA': 'IC 設計/IP', 'NVDA US': 'IC 設計/IP',
  'AVGO': 'IC 設計/IP', 'AVGO US': 'IC 設計/IP', 'MRVL': 'IC 設計/IP', 'MRVL US': 'IC 設計/IP',
  'IFX': 'IC 設計/IP', 'IFX GY': 'IC 設計/IP', 'ON': 'IC 設計/IP', 'RENESAS ELECTRONICS CORP': 'IC 設計/IP',
  '6723': 'IC 設計/IP', 'NVTS': 'IC 設計/IP', 'SMTC': 'IC 設計/IP',
  
  // AI 伺服器 & 代工
  '2317': 'AI 伺服器/代工', '2382': 'AI 伺服器/代工', '3231': 'AI 伺服器/代工', '6669': 'AI 伺服器/代工', 
  '2376': 'AI 伺服器/代工', '2301': 'AI 伺服器/代工', '8210': 'AI 伺服器/代工', '2059': 'AI 伺服器/代工',
  '6584': 'AI 伺服器/代工', '3706': 'AI 伺服器/代工',
  'GOOGL': 'AI 伺服器/軟體', 'GOOGL US': 'AI 伺服器/軟體', 'NBIS': 'AI 伺服器/軟體', 'PENG': 'AI 伺服器/軟體',
  
  // 電腦代工
  '2353': '電腦代工', '2324': '電腦代工', '2357': '電腦代工', '2377': '電腦代工', '4938': '電腦代工',
  
  // CoWoS & 半導體設備
  '3583': 'CoWoS/設備', '6187': 'CoWoS/設備', '3131': 'CoWoS/設備', '6640': 'CoWoS/設備', '6207': 'CoWoS/設備', 
  '2360': '電源/設備', '3680': 'CoWoS/設備', '2404': 'CoWoS/設備', '6223': 'CoWoS/設備', '1560': 'CoWoS/設備',
  '2467': 'CoWoS/設備', '3030': 'CoWoS/設備', '4749': 'CoWoS/設備', '5536': 'CoWoS/設備', '6139': 'CoWoS/設備',
  '6438': 'CoWoS/設備', '6510': 'CoWoS/設備', '6515': 'CoWoS/設備', '7750': 'CoWoS/設備', '7751': 'CoWoS/設備',
  '7769': 'CoWoS/設備',
  '268A': 'CoWoS/設備', 'AEHR': 'CoWoS/設備', 'AIXA': 'CoWoS/設備', 'AIXA GY': 'CoWoS/設備',
  '7826': 'CoWoS/設備', '7826 JP': 'CoWoS/設備',
  
  // CPO & 網通光通訊
  '2345': '網通', '6285': '網通', 'NOK': '網通', 'NOK US': '網通',
  '6442': 'CPO/光通訊', '3450': 'CPO/光通訊', '3363': 'CPO/光通訊', '3163': 'CPO/光通訊', '4979': 'CPO/光通訊',
  '3081': 'CPO/光通訊', '2455': 'CPO/光通訊',
  'FURUKAWA ELECTRIC CO LTD': 'CPO/光通訊', '5801': 'CPO/光通訊', '5801 JP': 'CPO/光通訊',
  'FUJIKURA LTD': 'CPO/光通訊', '5803': 'CPO/光通訊', '6869 HK': 'CPO/光通訊',
  'AAOI': 'CPO/光通訊', 'AAOI US': 'CPO/光通訊', 'CIEN': 'CPO/光通訊', 'CIEN US': 'CPO/光通訊',
  'COHERENT INC': 'CPO/光通訊', 'COHR US': 'CPO/光通訊', 'GLW': 'CPO/光通訊', 'GLW US': 'CPO/光通訊',
  'LITE': 'CPO/光通訊', 'LITE US': 'CPO/光通訊', 'VIAV US': 'CPO/光通訊', '6777': 'CPO/光通訊',
  
  // 散熱模組
  '3017': '散熱模組', '3324': '散熱模組', '2421': '散熱模組', '3016': '散熱模組', '3653': '散熱模組', '8996': '散熱模組',
  
  // PCB & 載板
  '3037': 'PCB/載板', '3189': 'PCB/載板', '8046': 'PCB/載板', '2368': 'PCB/載板', '2383': 'PCB/載板', '6274': 'PCB/載板',
  '2313': 'PCB/載板', '3044': 'PCB/載板', '4958': 'PCB/載板', '5439': 'PCB/載板', '1815': 'PCB/載板',
  '4062': 'PCB/載板', '4062 JP': 'PCB/載板', '6787': 'PCB/載板', '6787 JP': 'PCB/載板',
  '603256 CH': 'PCB/載板',
  
  // 被動元件 & 電子零組件
  '2327': '被動元件', '3023': '電子零組件', '3005': '電子零組件', '6805': '電子零組件', '3533': '電子零組件', 
  '3665': '電子零組件', '3211': '電子零組件', '3217': '電子零組件', '3376': '電子零組件', '6781': '電子零組件',
  'AES Holding Co Ltd': '電子零組件', '009150': '被動元件', '009150 KS': '被動元件', '6981 JP': '被動元件',
  '6997 JP': '被動元件', '5706': '電子零組件', '5706 JP': '電子零組件', 'VICR': '電子零組件',
  '2439': '電子零組件', '2481': '電子零組件', 'VSH US': '被動元件',
  
  // 記憶體
  '2408': '記憶體', '2344': '記憶體', '2337': '記憶體', '2451': '記憶體', '3260': '記憶體', '5289': '記憶體',
  '000660': '記憶體', '005930': '記憶體', '285A': '記憶體', '285A JP': '記憶體',
  'MU': '記憶體', 'MU US': '記憶體', 'WDC': '記憶體', 'WDC US': '記憶體', 'STX': '記憶體', 'SNDK': '記憶體', 'SNDK US': '記憶體',
  
  // 電子通路
  '2347': '電子通路', '3702': '電子通路', '3036': '電子通路',
  
  // 綠能/重電
  '2308': '綠能/重電', '1519': '綠能/重電', '2395': '綠能/工業電腦',
  '010120': '綠能/重電', '010120 KS': '綠能/重電', 'BE': '綠能/重電', 'BE US': '綠能/重電',
  'ENR GY': '綠能/重電', 'GEV US': '綠能/重電',
  
  // 金融
  '2881': '金融保險', '2882': '金融保險', '2891': '金融保險', '2886': '金融保險', '2884': '金融保險', '5880': '金融保險', '2892': '金融保險', '2885': '金融保險',
  
  // 航運
  '2603': '航運', '2609': '航運', '2615': '航運', '2618': '航運', '2610': '航運',
  
  // 傳統產業
  '1216': '傳統產業', '1303': '傳統產業', '1319': '傳統產業', '1477': '傳統產業', '1590': '傳統產業',
  '2548': '傳統產業', '5904': '傳統產業', '6177': '傳統產業', '8464': '傳統產業', 'HOT GY': '傳統產業',
  '2002': '傳統產業', '3045': '傳統產業', '4441': '傳統產業',
};

// ─── 科技概念字典 (經過雜訊過濾與手動校正) ──────────────────────────────────
const STOCK_CONCEPTS_MAP = {
  '1459': ['HBM'], // 聯發
  '1560': ['CoWoS'], // 中砂
  '1802': ['FOPLP'], // 台玻
  '2301': ['GB200', 'BBU'], // 光寶科
  '2303': ['IC載板'], // 聯電
  '2308': ['GB200', 'BBU'], // 台達電
  '2313': ['低軌衛星', 'IC載板'], // 華通
  '2314': ['低軌衛星'], // 台揚
  '2316': ['CoWoS'], // 楠梓電
  '2327': ['GB200', 'BBU'], // 國巨
  '2330': ['CoWoS', 'GB200'], // 台積電
  '2344': ['HBM'], // 華邦電
  '2345': ['光通訊'], // 智邦
  '2354': ['散熱模組'], // 鴻準
  '2357': ['AI PC'], // 華碩
  '2363': ['ASIC'], // 矽統
  '2367': ['低軌衛星'], // 燿華
  '2376': ['GB200', 'AI PC'], // 技嘉
  '2379': ['HBM'], // 瑞昱
  '2382': ['GB200', 'AI PC', 'IC載板'], // 廣達
  '2383': ['低軌衛星'], // 台光電
  '2388': ['ASIC'], // 威盛
  '2392': ['GB200', 'BBU'], // 正崴
  '2401': ['ASIC'], // 凌陽
  '2408': ['HBM'], // 南亞科
  '2409': ['FOPLP'], // 友達
  '2419': ['低軌衛星'], // 仲琦
  '2421': ['散熱模組'], // 建準
  '2449': ['CoWoS'], // 京元電子
  '2454': ['HBM', 'ASIC', 'AI PC'], // 聯發科
  '2455': ['HBM', '光通訊'], // 全新
  '2458': ['AI PC'], // 義隆
  '2467': ['CoWoS', 'HBM'], // 志聖
  '2476': ['BBU'], // 鉅祥
  '2485': ['低軌衛星'], // 兆赫
  '2489': ['IC載板'], // 瑞軒
  '3003': ['BBU'], // 健和興
  '3017': ['GB200', 'AI PC', '散熱模組'], // 奇鋐
  '3034': ['HBM', 'ASIC'], // 聯詠
  '3035': ['ASIC', '矽智財IP'], // 智原
  '3037': ['HBM', 'IC載板'], // 欣興
  '3062': ['低軌衛星'], // 建漢
  '3081': ['HBM', '光通訊'], // 聯亞
  '3105': ['HBM'], // 穩懋
  '3131': ['CoWoS'], // 弘塑
  '3138': ['低軌衛星'], // 耀登
  '3149': ['FOPLP'], // 正達
  '3163': ['光通訊'], // 波若威
  '3189': ['IC載板'], // 景碩
  '3211': ['GB200', 'BBU'], // 順達
  '3231': ['HBM', 'GB200', 'AI PC', 'FOPLP'], // 緯創
  '3234': ['光通訊'], // 光環
  '3324': ['GB200', '散熱模組'], // 雙鴻
  '3338': ['散熱模組'], // 泰碩
  '3363': ['光通訊'], // 上詮
  '3374': ['CoWoS'], // 精材
  '3443': ['HBM', 'ASIC', '矽智財IP'], // 創意
  '3450': ['光通訊'], // 聯鈞
  '3481': ['FOPLP'], // 群創
  '3483': ['散熱模組'], // 力致
  '3491': ['低軌衛星'], // 昇達科
  '3529': ['矽智財IP', 'IC載板'], // 力旺
  '3533': ['GB200', 'AI PC'], // 嘉澤
  '3576': ['HBM'], // 聯合再生
  '3580': ['FOPLP'], // 友威科
  '3583': ['CoWoS'], // 辛耘
  '3625': ['GB200'], // 西勝
  '3653': ['散熱模組'], // 健策
  '3661': ['ASIC', '矽智財IP'], // 世芯-KY
  '3663': ['FOPLP'], // 鑫科
  '3665': ['GB200'], // 貿聯-KY
  '3680': ['CoWoS'], // 家登
  '3711': ['CoWoS', 'AI PC', 'FOPLP'], // 日月光投控
  '4919': ['IC載板'], // 新唐
  '4931': ['GB200', 'BBU'], // 新盛力
  '4958': ['IC載板'], // 臻鼎-KY
  '4966': ['AI PC'], // 譜瑞-KY
  '4979': ['光通訊'], // 華星光
  '5269': ['AI PC'], // 祥碩
  '5274': ['GB200'], // 信驊
  '5309': ['GB200', 'BBU'], // 系統電
  '5498': ['HBM'], // 凱崴
  '6121': ['GB200'], // 新普
  '6138': ['AI PC'], // 茂達
  '6196': ['IC載板'], // 帆宣
  '6223': ['CoWoS'], // 旺矽
  '6230': ['散熱模組'], // 尼得科超眾
  '6239': ['HBM', 'FOPLP'], // 力成
  '6274': ['GB200'], // 台燿
  '6282': ['BBU'], // 康舒
  '6285': ['低軌衛星'], // 啟碁
  '6290': ['HBM'], // 良維
  '6423': ['矽智財IP'], // 億而得
  '6442': ['光通訊'], // 光聖
  '6451': ['光通訊'], // 訊芯-KY
  '6515': ['CoWoS'], // 穎崴
  '6533': ['矽智財IP'], // 晶心科
  '6568': ['矽智財IP'], // 宏觀
  '6591': ['散熱模組'], // 動力-KY
  '6640': ['CoWoS'], // 均華
  '6643': ['矽智財IP'], // M31
  '6669': ['GB200'], // 緯穎
  '6695': ['ASIC'], // 芯鼎
  '6781': ['GB200', 'BBU'], // AES-KY
  '7879': ['HBM'], // 益材科技
  '8027': ['FOPLP'], // 鈦昇
  '8046': ['IC載板'], // 南電
  '8054': ['ASIC'], // 安國
  '8064': ['FOPLP'], // 東捷
  '8112': ['HBM'], // 至上
  '8171': ['BBU'], // 天宇
  '8210': ['AI 伺服器'], // 勤誠
  '8227': ['矽智財IP'], // 巨有科技
  '8299': ['HBM', 'FOPLP'], // 群聯
  '8358': ['HBM'], // 金居
  '8996': ['GB200'], // 高力
};


const getStockIndustry = (code, name) => {
  if (!code) return '其他';
  const cleanCode = code.trim();
  if (STOCK_INDUSTRY_MAP[cleanCode]) return STOCK_INDUSTRY_MAP[cleanCode];
  
  if (name) {
    if (name.includes('光') || name.includes('訊') || name.includes('波')) return 'CPO/光通訊';
    if (name.includes('科') || name.includes('電')) return '電子零組件';
    if (name.includes('銀') || name.includes('金') || name.includes('保')) return '金融保險';
    if (name.includes('船') || name.includes('航') || name.includes('運')) return '航運';
    if (name.includes('電信') || name.includes('電訊')) return '傳統產業';
  }
  return '其他';
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

// ─── 頂層導航 Tab ─────────────────────────────────────────
const NAV_TABS = [
  { id: 'etf', label: 'ETF 追蹤', icon: Activity },
  { id: 'industry', label: '產業分析', icon: BookOpen },
];

// ─── 抽離的板塊資金流向熱力圖元件 ──────────────────────────────────
function TreemapFlowChart({ 
  industryFlowData, 
  activeHoldings, 
  comparisonLabel, 
  selectedDate, 
  getStockIndustry 
}) {
  const tooltipRef = useRef(null);

  // 遞迴 BSP Treemap 佈局演算法，保證方形面積與權重精確成比例，且始終沿長邊切割以優化長寬比
  const computeBspTreemap = (items, x, y, w, h) => {
    if (items.length === 0) return [];
    if (items.length === 1) {
      return [{ item: items[0], x, y, w, h }];
    }
    
    const currentTotal = items.reduce((sum, item) => sum + (item.displayWeight || 0), 0);
    let accumulated = 0;
    let splitIdx = 0;
    let minDiff = Infinity;
    
    // 尋找能讓兩側權重最均衡的切割點
    for (let i = 0; i < items.length - 1; i++) {
      accumulated += items[i].displayWeight || 0;
      const diff = Math.abs(accumulated - (currentTotal - accumulated));
      if (diff < minDiff) {
        minDiff = diff;
        splitIdx = i;
      }
    }
    
    const leftItems = items.slice(0, splitIdx + 1);
    const rightItems = items.slice(splitIdx + 1);
    
    const leftWeight = leftItems.reduce((sum, item) => sum + (item.displayWeight || 0), 0);
    
    // 沿長邊切割，維持接近正方形的比例
    const splitVertically = w >= h;
    
    if (splitVertically) {
      const leftWidth = currentTotal > 0 ? (leftWeight / currentTotal) * w : 0;
      const rightWidth = w - leftWidth;
      return [
        ...computeBspTreemap(leftItems, x, y, leftWidth, h),
        ...computeBspTreemap(rightItems, x + leftWidth, y, rightWidth, h)
      ];
    } else {
      const leftHeight = currentTotal > 0 ? (leftWeight / currentTotal) * h : 0;
      const rightHeight = h - leftHeight;
      return [
        ...computeBspTreemap(leftItems, x, y, w, leftHeight),
        ...computeBspTreemap(rightItems, x, y + leftHeight, w, rightHeight)
      ];
    }
  };

  const getTopStocksForIndustry = (industryName, limit = 2, prefix = '主要持股：') => {
    if (!activeHoldings) return '';
    const list = activeHoldings
      .filter(h => !h.isSoldOut && getStockIndustry(h.stockCode, h.stockName) === industryName)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, limit);
    if (list.length === 0) return '';
    return `${prefix}${list.map(h => `${h.stockName} (${h.weight.toFixed(1)}%)`).join('、')}`;
  };

  // 依照佔比權重由大到小排序，使大板塊優先分配在左上角
  // 視覺權重錨定：防止小板塊塌陷到不可見，設定最小視覺權重為 2.0%
  const treemapRects = useMemo(() => {
    const sortedFlowData = [...industryFlowData].map(item => ({
      ...item,
      displayWeight: Math.max(item.currentWeight || 0, 2.0)
    })).sort((a, b) => (b.displayWeight || 0) - (a.displayWeight || 0));
    return computeBspTreemap(sortedFlowData, 0, 0, 100, 100);
  }, [industryFlowData]);

  return (
    <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'var(--accent-purple)', borderRadius: '2px' }} />
            板塊資金流向熱力圖 ({comparisonLabel} vs {selectedDate})
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
            台股配色：紅漲綠跌
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          展示各產業板塊在選定比較區間內的累計權重增減變化與目前總持股佔比（方塊面積已錨定最小視覺比例，滑鼠懸浮可檢視完整資訊）
        </p>
      </div>
      <div 
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
          e.currentTarget.style.setProperty('--shift-x', x > rect.width * 0.55 ? '-105%' : '0px');
          e.currentTarget.style.setProperty('--shift-y', y > rect.height * 0.55 ? '-105%' : '0px');
        }}
        style={{
          width: '50%',
          margin: '0 auto',
          aspectRatio: '1.2 / 1',
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '0px',
          boxShadow: 'inset 0 4px 30px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        {treemapRects.map(rect => {
          const item = rect.item;
          const isPositive = item.diffWeight > 0;
          const isNegative = item.diffWeight < 0;
          
          // 根據變動幅度的絕對值計算透明度比例 (最深設為 0.28)
          const intensity = Math.min(0.04 + Math.abs(item.diffWeight) * 0.08, 0.28);
          
          let bg = 'rgba(255, 255, 255, 0.02)';
          let border = 'rgba(255, 255, 255, 0.08)';
          let flowColor = 'var(--text-secondary)';
          let badgeBg = 'rgba(255, 255, 255, 0.05)';
          let badgeBorder = 'rgba(255, 255, 255, 0.1)';
          let flowSign = '';
          let glowColor = 'rgba(255, 255, 255, 0.05)';
          
          if (isPositive) {
            bg = `rgba(239, 68, 68, ${intensity})`;
            border = `rgba(239, 68, 68, ${Math.min(0.12 + Math.abs(item.diffWeight) * 0.15, 0.45)})`;
            flowColor = 'var(--tw-up)';
            badgeBg = 'rgba(239, 68, 68, 0.18)';
            badgeBorder = 'rgba(239, 68, 68, 0.35)';
            flowSign = '+';
            glowColor = 'rgba(239, 68, 68, 0.22)';
          } else if (isNegative) {
            bg = `rgba(16, 185, 129, ${intensity})`;
            border = `rgba(16, 185, 129, ${Math.min(0.12 + Math.abs(item.diffWeight) * 0.15, 0.45)})`;
            flowColor = 'var(--tw-down)';
            badgeBg = 'rgba(16, 185, 129, 0.18)';
            badgeBorder = 'rgba(16, 185, 129, 0.35)';
            glowColor = 'rgba(16, 185, 129, 0.22)';
          }

          const isLarge = item.currentWeight > 12;
          const isMedium = item.currentWeight >= 5 && item.currentWeight <= 12;

          let padding = '0.45rem 0.6rem';
          let titleSize = '0.75rem';
          let titleWeight = 600;
          let weightSize = '0.95rem';
          let badgeSize = '0.65rem';

          if (isLarge) {
            padding = '0.75rem 0.9rem';
            titleSize = '0.98rem';
            titleWeight = 800;
            weightSize = '1.4rem';
            badgeSize = '0.78rem';
          } else if (isMedium) {
            padding = '0.6rem 0.75rem';
            titleSize = '0.85rem';
            titleWeight = 700;
            weightSize = '1.15rem';
            badgeSize = '0.72rem';
          }

          return (
            <div
              key={item.name}
              style={{
                position: 'absolute',
                left: `calc(${rect.x}% + 4px)`,
                top: `calc(${rect.y}% + 4px)`,
                width: `calc(${rect.w}% - 8px)`,
                height: `calc(${rect.h}% - 8px)`,
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: padding,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: isPositive || isNegative ? `0 4px 15px rgba(0, 0, 0, 0.15)` : 'none',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                e.currentTarget.style.zIndex = '10';
                e.currentTarget.style.borderColor = isPositive ? 'rgba(239, 68, 68, 0.65)' : (isNegative ? 'rgba(16, 185, 129, 0.65)' : 'rgba(255, 255, 255, 0.25)');
                e.currentTarget.style.boxShadow = `0 8px 25px ${glowColor}`;
                
                const tooltip = tooltipRef.current;
                if (tooltip) {
                  const titleEl = tooltip.querySelector('[data-tooltip-title]');
                  if (titleEl) titleEl.textContent = item.name;
                  
                  const pctEl = tooltip.querySelector('[data-tooltip-pct]');
                  if (pctEl) {
                    pctEl.textContent = `${item.diffWeight > 0 ? '+' : ''}${item.diffWeight.toFixed(2)}%`;
                    pctEl.style.color = item.diffWeight > 0 ? 'var(--tw-up)' : (item.diffWeight < 0 ? 'var(--tw-down)' : 'var(--text-secondary)');
                    pctEl.style.background = item.diffWeight > 0 ? 'rgba(239, 68, 68, 0.18)' : (item.diffWeight < 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.05)');
                    pctEl.style.borderColor = item.diffWeight > 0 ? 'rgba(239, 68, 68, 0.35)' : (item.diffWeight < 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.1)');
                  }
                  
                  const curWeightEl = tooltip.querySelector('[data-tooltip-curweight]');
                  if (curWeightEl) curWeightEl.textContent = `${item.currentWeight.toFixed(2)}%`;
                  
                  const holdingsEl = tooltip.querySelector('[data-tooltip-holdings]');
                  if (holdingsEl) {
                    holdingsEl.textContent = getTopStocksForIndustry(item.name, 3, '') || '暫無主要持股';
                  }
                  
                  tooltip.style.display = 'block';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.zIndex = '1';
                e.currentTarget.style.borderColor = border;
                e.currentTarget.style.boxShadow = isPositive || isNegative ? `0 4px 15px rgba(0, 0, 0, 0.15)` : 'none';
                
                const tooltip = tooltipRef.current;
                if (tooltip) {
                  tooltip.style.display = 'none';
                }
              }}
            >
              {/* Top Row: Sector Name & Flow Diff Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                width: '100%',
                gap: '4px'
              }}>
                <div style={{
                  fontSize: titleSize,
                  fontWeight: titleWeight,
                  color: '#f1f5f9',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: badgeSize,
                  fontWeight: 700,
                  color: flowColor,
                  background: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  borderRadius: '6px',
                  padding: '2px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap'
                }}>
                  {flowSign}{item.diffWeight.toFixed(2)}%
                </div>
              </div>

              {/* Middle Row: Primary Holdings (Large cards only) */}
              {isLarge && (
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%'
                }}>
                  {getTopStocksForIndustry(item.name, 2)}
                </div>
              )}

              {/* Bottom Row: Current Weight */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'flex-start',
                marginTop: 'auto',
                paddingTop: '6px',
                width: '100%'
              }}>
                <span style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-secondary)',
                  marginRight: '4px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  佔比
                </span>
                <span style={{
                  fontSize: weightSize,
                  fontWeight: 900,
                  color: '#f8fafc',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1
                }}>
                  {item.currentWeight.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}

        {/* 懸浮板塊資訊浮動視窗 (Tooltip) */}
        <div 
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            left: 'calc(var(--mouse-x) + 15px)',
            top: 'calc(var(--mouse-y) + 15px)',
            transform: 'translate(var(--shift-x, 0px), var(--shift-y, 0px))',
            zIndex: 100,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 8px 16px -6px rgba(0, 0, 0, 0.6)',
            minWidth: '240px',
            maxWidth: '300px',
            color: '#f8fafc',
            boxSizing: 'border-box',
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* 標題與變動百分比 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '8px' }}>
            <span data-tooltip-title style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
              -
            </span>
            <span data-tooltip-pct style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              padding: '2px 6px',
              fontFamily: 'var(--font-mono)'
            }}>
              -
            </span>
          </div>
          
          {/* 數據清單 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>目前總持股佔比：</span>
              <span data-tooltip-curweight style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                -
              </span>
            </div>
            <div style={{ height: '1.5px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>前 3 大持股：</span>
              <div data-tooltip-holdings style={{
                color: '#e2e8f0',
                lineHeight: 1.45,
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.04)'
              }}>
                -
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主元件 ──────────────────────────────────────────────
function App() {
  const [chartModalData, setChartModalData] = useState(null);

  // ── 路由 ──
  const navigate = useNavigate();
  const location = useLocation();
  const isIndustry = location.pathname.startsWith('/industry');
  // ── 資料狀態 ──
  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── 多日比對區間 ──
  const [compareRange, setCompareRange] = useState(1); // 1 | 3 | 5 | 10 | 'custom'
  const [customBaseDate, setCustomBaseDate] = useState(''); // YYYYMMDD
  const [baseData, setBaseData] = useState(null); // 基準日的完整資料
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // ── 檢視模式：'single' | 'aggregated' | 'compare' ──
  const [viewMode, setViewMode] = useState('single');
  const [compareEtfA, setCompareEtfA] = useState('00981A');
  const [compareEtfB, setCompareEtfB] = useState('00403A');

  // ── 新增：圖表 Tab 與比對 Tab 狀態 ──
  const [activePieTab, setActivePieTab] = useState('holdings'); // 'holdings' | 'industry'
  const [compareTab, setCompareTab] = useState('common'); // 'common' | 'uniqueA' | 'uniqueB'
  const [compareCommonView, setCompareCommonView] = useState('list'); // 'list' | 'chart'


  // ── 當前單檔 ETF ──
  const [activeEtf, setActiveEtf] = useState('00980A');

  // ── ETF 過濾清單（多選，預設全選，持久化）──
  const [visibleEtfs, setVisibleEtfs] = useState(() => {
    try {
      const saved = localStorage.getItem('etf_visible_list_v2');
      return saved ? JSON.parse(saved) : ['00981A', '00991A'];
    } catch { return ['00981A', '00991A']; }
  });
  const [showFilter, setShowFilter] = useState(false);

  // ── 排序與榜單 ──
  const [tableSort, setTableSort] = useState('weight');
  const [diffSort, setDiffSort] = useState('addPct'); // 'addPct' | 'addAbs' | 'subPct' | 'subAbs'
  const [aggregatedSort, setAggregatedSort] = useState('weight'); // 'weight' | 'diffShares' | 'buyingValue'

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('etf_admin_pwd');
      return saved ? { role: 'admin', name: '系統站長' } : { role: 'guest', name: '訪客' };
    } catch { return { role: 'guest', name: '訪客' }; }
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('etf_admin_pwd') || '');
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ── 持久化 visibleEtfs ──
  useEffect(() => {
    localStorage.setItem('etf_visible_list_v2', JSON.stringify(visibleEtfs));
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
    setCurrentUser({ role: 'admin', name: '系統站長' });
    setShowLogin(false);
    setPasswordInput('');
  };

  const handleLogout = () => {
    if (window.confirm(`確定要登出 ${currentUser.name}？`)) {
      setCurrentUser({ role: 'guest', name: '訪客' });
      setAdminToken('');
      localStorage.removeItem('etf_admin_pwd');
    }
  };


  // ── 資料載入 ──
  // 輔助函式：從日期目錄逐 ETF 載入後合併為 { etfCode: [...] } 物件
  const fetchDateData = async (dateOrLatest) => {
    const results = {};
    const fetches = ALL_ETF_CODES.map(async (etfCode) => {
      try {
        const res = await fetch(`./data/${dateOrLatest}/${etfCode}.json`);
        if (res.ok) {
          results[etfCode] = await res.json();
        }
      } catch {
        // 該 ETF 無資料，跳過
      }
    });
    await Promise.all(fetches);
    return Object.keys(results).length > 0 ? results : null;
  };

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
    if (!selectedDate || historyDates.length === 0) return;
    setLoading(true);
    setPrevData(null);

    // 載入當日資料（逐 ETF 個別載入）
    const currentFetch = fetchDateData(selectedDate);

    // 載入前一日資料（用於偵測出清持股）
    const idx = historyDates.indexOf(selectedDate);
    const prevDate = (idx >= 0 && idx < historyDates.length - 1) ? historyDates[idx + 1] : null;
    const prevFetch = prevDate
      ? fetchDateData(prevDate)
      : Promise.resolve(null);

    Promise.all([currentFetch, prevFetch]).then(([currentJson, prevJson]) => {
      if (currentJson) setData(currentJson);
      setPrevData(prevJson);
      setLoading(false);
    });
  }, [selectedDate, historyDates]);

  // ── 多日比對：載入基準日資料 ──
  useEffect(() => {
    if (!selectedDate || historyDates.length === 0) return;
    if (compareRange === 1) { setBaseData(null); return; }

    const idx = historyDates.indexOf(selectedDate);
    let baseDateStr = null;

    if (compareRange === 'custom') {
      baseDateStr = customBaseDate || null;
    } else {
      const baseIdx = idx + compareRange;
      baseDateStr = (baseIdx < historyDates.length) ? historyDates[baseIdx] : null;
    }

    if (baseDateStr) {
      fetchDateData(baseDateStr).then(json => setBaseData(json));
    } else {
      setBaseData(null);
    }
  }, [selectedDate, historyDates, compareRange, customBaseDate]);


  // ── 計算比對基準日標籤 ──
  const comparisonLabel = useMemo(() => {
    if (compareRange === 1) return '前日';
    if (compareRange === 'custom' && customBaseDate) return customBaseDate;
    const idx = historyDates.indexOf(selectedDate);
    const baseIdx = idx + (typeof compareRange === 'number' ? compareRange : 0);
    if (baseIdx < historyDates.length) return historyDates[baseIdx];
    return '(無資料)';
  }, [compareRange, customBaseDate, selectedDate, historyDates]);

  // ── 單檔持股（含前端層出清偵測 + 多日比對） ──
  const activeHoldings = useMemo(() => {
    if (!data) return [];
    const current = data[activeEtf] || [];
    const useMultiDay = compareRange !== 1;
    const base = useMultiDay ? (baseData?.[activeEtf] || []) : (prevData?.[activeEtf] || []);

    if (base.length === 0 && !useMultiDay) return current;
    if (base.length === 0 && useMultiDay) return current;

    if (useMultiDay) {
      // 多日模式：前端重算 diff
      const baseMap = new Map(base.map(h => [h.stockCode, h]));
      const recomputed = current.map(h => {
        const prev = baseMap.get(h.stockCode);
        if (!prev) {
          return { ...h, diffShares: h.shares, diffWeight: Number(h.weight.toFixed(2)), diffSharesPercent: 100, isNew: true };
        }
        const ds = h.shares - prev.shares;
        const dsp = prev.shares > 0 ? parseFloat(((ds / prev.shares) * 100).toFixed(2)) : 0;
        return {
          ...h,
          diffShares: ds,
          diffWeight: Number((h.weight - prev.weight).toFixed(2)),
          diffSharesPercent: dsp,
          isNew: false
        };
      });
      // 偵測出清
      const currentCodes = new Set(current.map(h => h.stockCode));
      const soldOut = base
        .filter(p => !currentCodes.has(p.stockCode))
        .map(p => ({
          stockCode: p.stockCode, stockName: p.stockName,
          shares: 0, weight: 0,
          diffShares: -(p.shares || 0), diffWeight: -(p.weight || 0),
          diffSharesPercent: -100, isNew: false, isSoldOut: true,
        }));
      return [...recomputed, ...soldOut];
    }

    // 單日模式：沿用原邏輯（使用 JSON 中既有的 diffShares）
    const currentCodes = new Set(current.map(h => h.stockCode));
    const soldOut = base
      .filter(p => !currentCodes.has(p.stockCode))
      .map(p => ({
        stockCode: p.stockCode,
        stockName: p.stockName,
        shares: 0,
        weight: 0,
        diffShares: -(p.shares || 0),
        diffWeight: -(p.weight || 0),
        diffSharesPercent: -100,
        isNew: false,
        isSoldOut: true,
      }));
    return [...current, ...soldOut];
  }, [data, prevData, baseData, activeEtf, compareRange]);

  const sortedHoldings = useMemo(() => {
    const arr = [...activeHoldings];
    arr.sort((a, b) => {
      // 1. 新進榜優先置頂，若同為新進榜則依張數降冪
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      if (a.isNew && b.isNew) return (b.shares || 0) - (a.shares || 0);

      // 2. 一般排序
      if (tableSort === 'diffShares') {
        const diffA = a.diffShares || 0;
        const diffB = b.diffShares || 0;
        
        const getGroup = (item, diff) => {
          if (item.isSoldOut) return 2;
          if (diff > 0) return 1;
          if (diff < 0) return 3;
          return 4; // 無變動
        };

        const groupA = getGroup(a, diffA);
        const groupB = getGroup(b, diffB);

        // 若不同群組，依群組順序排：1(加碼) -> 2(出清) -> 3(減碼) -> 4(無變動)
        if (groupA !== groupB) {
          return groupA - groupB;
        }

        // 若同群組，依張數變動量排序 (由多到少)
        if (groupA === 1) return diffB - diffA; // 加碼：降冪 (增加多的在前)
        if (groupA === 2) return diffA - diffB; // 出清：升冪 (出清多的在前，因 diffShares 是負數)
        if (groupA === 3) return diffA - diffB; // 減碼：升冪 (減少多的在前，因 diffShares 是負數)
        
        return 0; // 無變動排最後
      }

      // 預設依權重排序
      return (b.weight || 0) - (a.weight || 0);
    });
    return arr;
  }, [activeHoldings, tableSort]);

  // 計算今日買進估計金額比例 (以 diffShares * weight / shares 作為買進金額的相對代理值)
  // 判斷「有買進」的依據是 diffShares > 0，與 diffWeight 無關
  const { totalBuyingValue, holdingBuyingValues } = useMemo(() => {
    const values = {};
    let total = 0;
    activeHoldings.forEach(h => {
      if ((h.diffShares || 0) > 0 && (h.shares || 0) > 0) {
        const estimatedValue = h.diffShares * (h.weight / h.shares);
        values[h.stockCode] = estimatedValue;
        total += estimatedValue;
      }
    });
    return { totalBuyingValue: total, holdingBuyingValues: values };
  }, [activeHoldings]);

  // 今日買進資金佔比圓餅圖資料
  const BUYING_PIE_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
  const buyingPieData = useMemo(() => {
    if (totalBuyingValue <= 0) return [];
    const all = activeHoldings
      .filter(h => (h.diffShares || 0) > 0 && holdingBuyingValues[h.stockCode])
      .map(h => ({
        name: formatStockLabel(h.stockCode, h.stockName, activeEtf),
        value: parseFloat(((holdingBuyingValues[h.stockCode] / totalBuyingValue) * 100).toFixed(1)),
        diffWeight: h.diffWeight,
        isNew: h.isNew,
      }))
      .sort((a, b) => b.value - a.value);
    const main = all.filter(d => d.value >= 5);
    const others = all.filter(d => d.value < 5);
    if (others.length > 0) {
      const othersTotal = parseFloat(others.reduce((s, d) => s + d.value, 0).toFixed(1));
      const othersDiffWeight = parseFloat(others.reduce((s, d) => s + d.diffWeight, 0).toFixed(2));
      main.push({ name: `其他 (${others.length} 檔)`, value: othersTotal, diffWeight: othersDiffWeight, isNew: false, isOthers: true });
    }
    return main;
  }, [activeHoldings, totalBuyingValue, holdingBuyingValues, activeEtf]);

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
        name: (item.isNew ? '* ' : '') + formatStockLabel(item.stockCode, item.stockName, activeEtf),
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
    const map = {}; // stockCode -> { stockCode, stockName, totalWeight, etfCount, etfBreakdown: [{etfCode, weight, shares}], totalDiffShares: 0, totalBuyingValue: 0 }

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
            etfBreakdown: [],
            totalDiffShares: 0,
            totalBuyingValue: 0
          };
        }
        map[h.stockCode].totalWeight = Number((map[h.stockCode].totalWeight + (h.weight || 0)).toFixed(4));
        map[h.stockCode].etfCount += 1;
        map[h.stockCode].etfBreakdown.push({
          etfCode,
          weight: h.weight || 0,
          shares: h.shares || 0,
          diffShares: h.diffShares || 0
        });
        
        if ((h.diffShares || 0) > 0 && (h.shares || 0) > 0) {
          const estimatedValue = h.diffShares * (h.weight / h.shares);
          map[h.stockCode].totalDiffShares += h.diffShares;
          map[h.stockCode].totalBuyingValue += estimatedValue;
        }
      });
    });

    return Object.values(map)
      .sort((a, b) => {
        if (aggregatedSort === 'diffShares') return b.totalDiffShares - a.totalDiffShares;
        if (aggregatedSort === 'buyingValue') return b.totalBuyingValue - a.totalBuyingValue;
        return b.totalWeight - a.totalWeight;
      });
  }, [data, visibleEtfs, aggregatedSort]);

  // ── 單檔 ETF 產業持股佔比 ──
  const activeIndustryData = useMemo(() => {
    if (!activeHoldings || activeHoldings.length === 0) return [];
    const map = {};
    activeHoldings.forEach(h => {
      if (h.isSoldOut) return;
      const ind = getStockIndustry(h.stockCode, h.stockName);
      map[ind] = (map[ind] || 0) + (h.weight || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [activeHoldings]);

  // ── 單檔 ETF 產業資金流動變動 ──
  const industryFlowData = useMemo(() => {
    if (!activeHoldings || activeHoldings.length === 0) return [];
    const map = {};
    activeHoldings.forEach(h => {
      const ind = getStockIndustry(h.stockCode, h.stockName);
      if (!map[ind]) {
        map[ind] = { currentWeight: 0, diffWeight: 0 };
      }
      if (!h.isSoldOut) {
        map[ind].currentWeight += (h.weight || 0);
      }
      map[ind].diffWeight += (h.diffWeight || 0);
    });
    return Object.entries(map)
      .map(([name, { currentWeight, diffWeight }]) => ({
        name,
        currentWeight: parseFloat(currentWeight.toFixed(2)),
        diffWeight: parseFloat(diffWeight.toFixed(2))
      }))
      .sort((a, b) => b.diffWeight - a.diffWeight);
  }, [activeHoldings]);

  // ── 跨 ETF 產業資金版圖統計 ──
  const aggregatedIndustryData = useMemo(() => {
    if (!data) return [];
    const map = {};
    visibleEtfs.forEach(etfCode => {
      const holdings = data[etfCode];
      if (!Array.isArray(holdings)) return;
      holdings.forEach(h => {
        if (!h.stockCode) return;
        const ind = getStockIndustry(h.stockCode, h.stockName);
        map[ind] = (map[ind] || 0) + (h.weight || 0);
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [data, visibleEtfs]);

  // ── 雙檔 ETF 比對核心計算邏輯 ──
  const etfCompareResults = useMemo(() => {
    if (!data) return { overlapPct: 0, commonHoldings: [], uniqueA: [], uniqueB: [] };
    const listA = data[compareEtfA] || [];
    const listB = data[compareEtfB] || [];

    const mapA = new Map(listA.map(h => [h.stockCode, h]));
    const mapB = new Map(listB.map(h => [h.stockCode, h]));

    let overlapPct = 0;
    const commonHoldings = [];
    const uniqueA = [];
    const uniqueB = [];

    // 比對共同持股與 A 獨有
    listA.forEach(hA => {
      const hB = mapB.get(hA.stockCode);
      if (hB) {
        const minW = Math.min(hA.weight, hB.weight);
        overlapPct += minW;
        commonHoldings.push({
          stockCode: hA.stockCode,
          stockName: hA.stockName,
          weightA: hA.weight,
          weightB: hB.weight,
          diffWeight: Number((hA.weight - hB.weight).toFixed(2)),
          sharesA: hA.shares,
          sharesB: hB.shares,
        });
      } else {
        uniqueA.push(hA);
      }
    });

    // 比對 B 獨有
    listB.forEach(hB => {
      if (!mapA.has(hB.stockCode)) {
        uniqueB.push(hB);
      }
    });

    commonHoldings.sort((a, b) => b.weightA + b.weightB - (a.weightA + a.weightB));
    uniqueA.sort((a, b) => b.weight - a.weight);
    uniqueB.sort((a, b) => b.weight - a.weight);

    return {
      overlapPct: parseFloat(overlapPct.toFixed(2)),
      commonHoldings,
      uniqueA,
      uniqueB,
    };
  }, [data, compareEtfA, compareEtfB]);

  // ── Telegram 推播（僅發送當前 tab 選中的 ETF）──
  const handleSendTelegram = async () => {
    if (!data || !activeHoldings) return;
    setIsSending(true);
    setSendResult(null);
    const workerUrl = 'https://etf-telegram-proxy.sarsadsl.workers.dev/';

    try {
      const BLACKLIST = { "00981A": ["2357", "2439", "5347"] };
      const etfCode = activeEtf;
      const etfName = ETF_META[etfCode]?.name.replace('主動', '') || etfCode;

      // 使用 activeHoldings（已含前端出清偵測）
      let changedHoldings = activeHoldings.filter(h =>
        h.isNew || h.isSoldOut || (h.diffShares !== undefined && h.diffShares !== 0)
      );

      // 排除黑名單
      if (BLACKLIST[etfCode]) {
        changedHoldings = changedHoldings.filter(s => !BLACKLIST[etfCode].includes(s.stockCode));
      }

      if (changedHoldings.length === 0) {
        setSendResult({ status: 'success', text: `${etfCode} 今日無任何異動` });
        setTimeout(() => setSendResult(null), 2000);
        setIsSending(false);
        return;
      }

      // 排序：增持在前、減持在後、出清最後
      changedHoldings.sort((a, b) => {
        if (a.isSoldOut && !b.isSoldOut) return 1;
        if (!a.isSoldOut && b.isSoldOut) return -1;
        return (b.diffShares || 0) - (a.diffShares || 0);
      });

      // 組裝訊息
      let msg = `━━━━━━━━━━━━━━\n`;
      msg += `📊 ${etfCode} ${etfName} 持股異動\n`;
      msg += `📅 日期: ${selectedDate}\n`;
      msg += `━━━━━━━━━━━━━━\n\n`;

      changedHoldings.forEach((hold, idx) => {
        if (hold.isSoldOut) {
          // 出清持股：特殊格式
          const prevShares = Math.abs(Math.round(hold.diffShares / 1000));
          msg += `${idx + 1}. 🔴 ${hold.stockName} (${hold.stockCode}) 全部出清\n`;
          msg += `   📉 原持倉: ${prevShares.toLocaleString()} 張 → 0 張\n`;
          msg += `   📉 原權重: ${Math.abs(hold.diffWeight)}% → 0%\n\n`;
          return;
        }

        let weightIcon = '➖';
        let sharesIcon = '';
        if (hold.diffWeight > 0) weightIcon = '🔺';
        if (hold.diffWeight < 0) weightIcon = '🔻';
        if (hold.diffShares > 0) sharesIcon = '+';

        const newTag = hold.isNew ? ' ✨新進榜' : '';
        const sharesLot = Math.round(hold.shares / 1000);
        const diffSharesLot = Math.round(hold.diffShares / 1000);

        let sharesStr = '';
        if (diffSharesLot === 0 && hold.diffShares !== 0) {
           sharesStr = `${(hold.shares / 1000).toFixed(1)} 張 (${sharesIcon}${(hold.diffShares / 1000).toFixed(1)})`;
        } else {
           sharesStr = `${sharesLot.toLocaleString()} 張 (${sharesIcon}${diffSharesLot.toLocaleString()})`;
        }

        const lineIcon = hold.diffShares >= 0 ? '📈' : '📉';
        msg += `${idx + 1}. ${hold.stockName} (${hold.stockCode})${newTag}\n`;
        msg += `   ${lineIcon} 權重: ${hold.weight}% (${weightIcon}${hold.diffWeight > 0 ? '+' : ''}${hold.diffWeight}%)\n`;
        msg += `   📦 持倉: ${sharesStr}\n\n`;
      });

      msg += `━━━━━━━━━━━━━━\n`;
      msg += `🌐 即時視覺化儀表板: https://stocktrack.morningjoy.cc`;

      // 發送
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, password: adminToken })
      });
      const result = await response.json().catch(() => ({}));
      console.log('[Broadcast] Worker Response:', response.status, result);

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      setSendResult({ status: 'success', text: `${etfCode} 廣播成功` });
      setTimeout(() => setSendResult(null), 3000);
    } catch (err) {
      console.error('[Broadcast] Send Error:', err);
      setSendResult({ status: 'error', text: `廣播失敗: ${err.message}` });
      setTimeout(() => setSendResult(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const isMockData = ['20260416', '20260418', '2026416'].includes(selectedDate);

  // ── ETF 過濾器面板 ──
  const FilterPanel = () => (
    <div className="filter-popup" style={{
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
      {/* ── 頂層導航 ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '0.5rem',
      }}>
        {NAV_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === 'industry' ? isIndustry : !isIndustry;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id === 'industry' ? '/industry' : '/')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 1.1rem', borderRadius: '8px',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                transition: 'all 0.2s',
                border: isActive ? '1px solid var(--accent-blue)' : '1px solid transparent',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'var(--text-secondary)',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ══════════ 路由渲染 ══════════ */}
      <Routes>
        {/* 產業分析：文章列表 */}
        <Route path="/industry" element={<IndustryIndex />} />

        {/* 產業分析：各文章 */}
        <Route path="/industry/bmc" element={
          <div>
            <button
              onClick={() => navigate('/industry')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.4rem 0.9rem', borderRadius: '8px', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> 返回產業分析列表
            </button>
            <BmcPage />
          </div>
        } />
        
        <Route path="/industry/delta" element={
          <div>
            <button
              onClick={() => navigate('/industry')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.4rem 0.9rem', borderRadius: '8px', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> 返回產業分析列表
            </button>
            <DeltaPage />
          </div>
        } />
        
        <Route path="/industry/globalwafers" element={
          <div>
            <button
              onClick={() => navigate('/industry')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.4rem 0.9rem', borderRadius: '8px', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> 返回產業分析列表
            </button>
            <GlobalWafersPage />
          </div>
        } />
        
        <Route path="/industry/bizlink" element={
          <div>
            <button
              onClick={() => navigate('/industry')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.4rem 0.9rem', borderRadius: '8px', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> 返回產業分析列表
            </button>
            <BizLinkPage />
          </div>
        } />

        {/* ETF 追蹤（預設路由）*/}
        <Route path="/*" element={
          <>
            {/* ── Header ── */}
            <header className="header">
              <div>
                <h1>主動式 ETF 持股追蹤</h1>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>


                {currentUser.role === 'admin' && (
                  <button onClick={handleSendTelegram} disabled={isSending || !adminToken}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '8px', backgroundColor: sendResult?.status === 'success' ? '#10b981' : (sendResult?.status === 'error' ? '#ef4444' : 'transparent'), color: sendResult?.status ? '#fff' : 'var(--accent-blue)', border: sendResult?.status ? 'none' : '1px solid var(--accent-blue)', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.6 : 1 }}>
                    <Send size={16} />
                    {isSending ? '鑑權中...' : (sendResult?.text || '發送廣播')}
                  </button>
                )}

                {currentUser.role === 'admin' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <User size={14} color="#94a3b8" />
                      <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>系統站長</span>
                    </div>
                    <button onClick={handleLogout} title="登出" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                <button
                  onClick={() => setViewMode('compare')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', background: viewMode === 'compare' ? '#ec4899' : 'transparent', color: viewMode === 'compare' ? '#fff' : 'var(--text-secondary)' }}
                >
                  <RefreshCw size={14} /> 雙檔對比
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
                {showFilter && (
                  <>
                    <div className="popup-overlay" onClick={() => setShowFilter(false)} />
                    <FilterPanel />
                  </>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.8rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: ETF_META[activeEtf].color }}>
                      {ETF_META[activeEtf].name}
                    </h2>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{activeEtf}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      資料更新日期：<span style={{ color: '#e2e8f0', fontWeight: 600, letterSpacing: '0.05em' }}>{selectedDate || '讀取中'}</span>
                    </div>
                  </div>
                </div>

                {/* ── ETF 歷史走勢圖 ── */}
                <div style={{ marginBottom: '2rem' }}>
                  <InlineStockChart stockCode={activeEtf} />
                </div>

                {/* ── 比對區間選擇器 ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>比對區間：</span>
                  <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-light)' }}>
                    {[
                      { label: '1 日', value: 1 },
                      { label: '3 日', value: 3 },
                      { label: '5 日', value: 5 },
                      { label: '10 日', value: 10 },
                    ].map(opt => (
                      <button key={opt.value}
                        onClick={() => { setCompareRange(opt.value); setCustomBaseDate(''); setShowCalendar(false); }}
                        style={{
                          padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px',
                          cursor: 'pointer', border: 'none', fontWeight: 600, transition: 'all 0.2s',
                          background: compareRange === opt.value ? 'var(--accent-blue)' : 'transparent',
                          color: compareRange === opt.value ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => { setCompareRange('custom'); setShowCalendar(c => !c); }}
                        style={{
                          padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px',
                          cursor: 'pointer', border: 'none', fontWeight: 600, transition: 'all 0.2s',
                          background: compareRange === 'custom' ? '#a78bfa' : 'transparent',
                          color: compareRange === 'custom' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        自訂
                      </button>
                      {/* ── 日曆彈出層 ── */}
                      {showCalendar && compareRange === 'custom' && (
                        <>
                          <div className="popup-overlay" onClick={() => setShowCalendar(false)} />
                          {(() => {
                            const availSet = new Set(historyDates);
                            const { year, month } = calendarMonth;
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const cells = [];
                            for (let i = 0; i < firstDay; i++) cells.push(null);
                            for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                            const pad = n => String(n).padStart(2, '0');
                            const toStr = d => `${year}${pad(month + 1)}${pad(d)}`;

                            // 範圍高亮遏輯
                            const selIdx = selectedDate ? historyDates.indexOf(selectedDate) : -1;
                            const baseIdx = customBaseDate ? historyDates.indexOf(customBaseDate) : -1;
                            const rangeSet = new Set();
                            if (selIdx >= 0 && baseIdx >= 0) {
                              const lo = Math.min(selIdx, baseIdx);
                              const hi = Math.max(selIdx, baseIdx);
                              for (let i = lo; i <= hi; i++) rangeSet.add(historyDates[i]);
                            }

                            // 可選日期：必須在 historyDates 且必須比 selectedDate 更早
                            const isSelectable = (dateStr) => {
                              if (!availSet.has(dateStr)) return false;
                              return historyDates.indexOf(dateStr) > historyDates.indexOf(selectedDate);
                            };

                            const oldestDate = historyDates[historyDates.length - 1];
                            const oldestYear = parseInt(oldestDate.slice(0, 4));
                            const oldestMonth = parseInt(oldestDate.slice(4, 6)) - 1;
                            const canGoPrev = year > oldestYear || (year === oldestYear && month > oldestMonth);
                            const now = new Date();
                            const canGoNext = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

                            return (
                              <div className="calendar-popup" style={{
                                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
                                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                                borderRadius: '12px', padding: '0.8rem', minWidth: '280px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                              }}>
                                {/* 月份導航 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                  <button onClick={() => canGoPrev && setCalendarMonth(p => {
                                    const m = p.month - 1;
                                    return m < 0 ? { year: p.year - 1, month: 11 } : { ...p, month: m };
                                  })} style={{ background: 'none', border: 'none', color: canGoPrev ? '#e2e8f0' : '#475569', cursor: canGoPrev ? 'pointer' : 'default', fontSize: '1rem', padding: '4px 8px' }}>&lt;</button>
                                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{year} 年 {month + 1} 月</span>
                                  <button onClick={() => canGoNext && setCalendarMonth(p => {
                                    const m = p.month + 1;
                                    return m > 11 ? { year: p.year + 1, month: 0 } : { ...p, month: m };
                                  })} style={{ background: 'none', border: 'none', color: canGoNext ? '#e2e8f0' : '#475569', cursor: canGoNext ? 'pointer' : 'default', fontSize: '1rem', padding: '4px 8px' }}>&gt;</button>
                                </div>
                                {/* 星期標題 */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '4px' }}>
                                  {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                                    <div key={w} style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, padding: '2px 0' }}>{w}</div>
                                  ))}
                                </div>
                                {/* 日期格子 */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                                  {cells.map((day, i) => {
                                    if (day === null) return <div key={`e-${i}`} />;
                                    const dateStr = toStr(day);
                                    const selectable = isSelectable(dateStr);
                                    const isSelected = dateStr === customBaseDate;
                                    const isTarget = dateStr === selectedDate;
                                    const inRange = rangeSet.has(dateStr);
                                    const hasData = availSet.has(dateStr);

                                    let bg = 'transparent';
                                    let color = '#475569'; // gray default
                                    let fontWeight = 400;
                                    let border = '1px solid transparent';

                                    if (isSelected) {
                                      bg = '#a78bfa'; color = '#fff'; fontWeight = 700;
                                      border = '1px solid #a78bfa';
                                    } else if (isTarget) {
                                      bg = 'var(--accent-blue)'; color = '#fff'; fontWeight = 700;
                                      border = '1px solid var(--accent-blue)';
                                    } else if (inRange && hasData) {
                                      bg = 'rgba(167,139,250,0.15)'; color = '#c4b5fd'; fontWeight = 600;
                                    } else if (selectable) {
                                      color = '#e2e8f0'; fontWeight = 500;
                                    }

                                    return (
                                      <div key={dateStr}
                                        onClick={() => {
                                          if (selectable) {
                                            setCustomBaseDate(dateStr);
                                            setShowCalendar(false);
                                          }
                                        }}
                                        style={{
                                          padding: '5px 2px', borderRadius: '6px', fontSize: '0.78rem',
                                          cursor: selectable ? 'pointer' : 'default',
                                          background: bg, color, fontWeight, border,
                                          transition: 'all 0.15s'
                                        }}
                                      >
                                        {day}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  {compareRange !== 1 && (
                    <span style={{ fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(167,139,250,0.3)' }}>
                      基準日：{comparisonLabel}
                    </span>
                  )}
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
                      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{activePieTab === 'holdings' ? '前十大持股權重' : '產業持股分佈'}</h3>
                          <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px' }}>
                            <button
                              onClick={() => setActivePieTab('holdings')}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', border: 'none', background: activePieTab === 'holdings' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activePieTab === 'holdings' ? '#60a5fa' : 'var(--text-secondary)' }}
                            >
                              持股
                            </button>
                            <button
                              onClick={() => setActivePieTab('industry')}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', border: 'none', background: activePieTab === 'industry' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activePieTab === 'industry' ? '#60a5fa' : 'var(--text-secondary)' }}
                            >
                              產業
                            </button>
                          </div>
                        </div>
                        <div style={{ height: '300px', flex: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            {activePieTab === 'holdings' ? (
                              <PieChart>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-light)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                                <Pie data={chartData} dataKey="weight" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill={ETF_META[activeEtf].color} label={({ name, value }) => `${name} ${Number(value).toFixed(1)}%`} labelStyle={{ fontSize: '12px', fontWeight: 500 }} labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={ETF_META[activeEtf].color} fillOpacity={1 - index * 0.08} />)}
                                </Pie>
                              </PieChart>
                            ) : (
                              <PieChart>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-light)' }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(val) => [`${val}%`, '產業權重']} />
                                <Pie data={activeIndustryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill={ETF_META[activeEtf].color} label={({ name, value }) => `${name} ${Number(value).toFixed(1)}%`} labelStyle={{ fontSize: '12px', fontWeight: 500 }} labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                                  {activeIndustryData.map((_, index) => {
                                    const baseColor = ETF_META[activeEtf].color;
                                    return <Cell key={`cell-ind-${index}`} fill={baseColor} fillOpacity={1 - index * 0.09} />;
                                  })}
                                </Pie>
                              </PieChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="glass-panel">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>權重對比 ({comparisonLabel} vs {selectedDate})</h3>
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
                              <Bar dataKey="prevWeight" name={`${comparisonLabel}權重`} fill="var(--text-secondary)" radius={[0, 4, 4, 0]} barSize={8} />
                              <Bar dataKey="weight" name="今日權重" radius={[0, 4, 4, 0]} barSize={12}>
                                <LabelList dataKey="diffSharesPercent" position="right" formatter={(val) => val ? `${val > 0 ? '+' : ''}${val}%` : ''} fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.diff > 0 ? 'var(--tw-up)' : (entry.diff < 0 ? 'var(--tw-down)' : 'var(--accent-blue)')} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    {/* 第三區塊：變動差異排行榜 + 買進資金圓餅圖 (grid-2) */}
                    <div className="grid-2">
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

                      {/* 今日買進資金佔比圓餅圖 */}
                      {buyingPieData.length > 0 && (
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: '#10b981' }}>今日買進資金佔比</h3>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            今日買進標的數：<span style={{ color: '#10b981', fontWeight: 700 }}>{Object.keys(holdingBuyingValues).length} 檔</span>
                          </p>
                          <div style={{ flex: 1, minHeight: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', borderRadius: '8px', color: '#fff' }}
                                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                                  formatter={(value, name, props) => [
                                    `${value}% (權重 +${props.payload.diffWeight}%)${props.payload.isNew ? ' ⭐新進榜' : ''}`,
                                    name
                                  ]}
                                />
                                <Pie
                                  data={buyingPieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={110}
                                  innerRadius={50}
                                  paddingAngle={2}
                                  label={({ name, value, isNew }) => `${isNew ? '★ ' : ''}${name} ${value}%`}
                                  labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                                >
                                  {buyingPieData.map((entry, index) => {
                                    const isNew = entry.isNew;
                                    const fill = entry.isOthers ? '#475569' : BUYING_PIE_COLORS[index % BUYING_PIE_COLORS.length];
                                    const stroke = isNew ? '#fff' : 'transparent';
                                    const strokeWidth = isNew ? 2 : 0;
                                    return <Cell key={`buying-cell-${index}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                                  })}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 板塊資金流向熱力圖 */}
                    {industryFlowData && industryFlowData.length > 0 && (
                      <TreemapFlowChart
                        industryFlowData={industryFlowData}
                        activeHoldings={activeHoldings}
                        comparisonLabel={comparisonLabel}
                        selectedDate={selectedDate}
                        getStockIndustry={getStockIndustry}
                      />
                    )}

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
                              <th>排名</th><th>代號</th><th>名稱</th><th>權重 (%)</th><th>張數</th><th>狀態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedHoldings.map((hold, idx) => {
                              const sharesLotNum = Math.round(hold.shares / 1000);
                              const diffLotNum = Math.round((hold.diffShares || 0) / 1000);
                              const prevSharesLotNum = sharesLotNum - diffLotNum;

                              const sharesLotStr = sharesLotNum.toLocaleString();
                              const prevSharesLotStr = prevSharesLotNum.toLocaleString();
                              const diffLotStr = diffLotNum > 0 ? `+${diffLotNum.toLocaleString()}` : diffLotNum.toLocaleString();

                              const prevShares = (hold.shares || 0) - (hold.diffShares || 0);
                              const computedPct = prevShares > 0 ? parseFloat((((hold.diffShares || 0) / prevShares) * 100).toFixed(2)) : 0;
                              const finalPct = hold.diffSharesPercent !== undefined ? hold.diffSharesPercent : computedPct;
                              const pctStr = finalPct > 0 ? `+${finalPct}%` : `${finalPct}%`;

                              return (
                                <tr key={hold.stockCode} className="clickable-row" onClick={() => setChartModalData({code: hold.stockCode, name: hold.stockName})}>
                                  <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                  <td style={{ fontWeight: 600, color: '#94a3b8' }}>{hold.stockCode}</td>
                                  <td style={{ fontWeight: 500 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <span>{hold.stockName}</span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                        <span style={{
                                          display: 'inline-block',
                                          fontSize: '0.65rem',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          color: 'var(--text-secondary)',
                                          border: '1px solid var(--border-light)',
                                          fontWeight: 600
                                        }}>
                                          {getStockIndustry(hold.stockCode, hold.stockName)}
                                        </span>
                                        {(STOCK_CONCEPTS_MAP[hold.stockCode.trim()] || []).map(concept => (
                                          <span key={concept} style={{
                                            display: 'inline-block',
                                            fontSize: '0.65rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(96, 165, 250, 0.1)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(96, 165, 250, 0.2)',
                                            fontWeight: 600
                                          }}>
                                            {concept}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                  <td>{hold.weight}%</td>
                                  <td className="shares-cell">
                                    {diffLotNum !== 0 ? (
                                      <div className="shares-change-row">
                                        <span>
                                          <span style={{ color: 'var(--text-secondary)' }}>{prevSharesLotStr}</span>
                                          <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>➔</span>
                                          <span style={{ fontWeight: 600 }}>{sharesLotStr}</span>
                                        </span>
                                        <span className={`shares-diff-badge ${diffLotNum > 0 ? 'text-success' : 'text-danger'}`}>
                                          ({diffLotStr}) ({pctStr})
                                        </span>
                                        {(hold.diffShares || 0) > 0 && totalBuyingValue > 0 && holdingBuyingValues[hold.stockCode] && (
                                          <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600, marginTop: '2px', width: '100%' }}>
                                            佔今日買進總額 {((holdingBuyingValues[hold.stockCode] / totalBuyingValue) * 100).toFixed(1)}%
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ fontWeight: 600 }}>{sharesLotStr}</span>
                                    )}
                                  </td>
                                  <td>
                                    {hold.isNew && <span className="badge new">{'\u2605'} 新進榜</span>}
                                    {hold.isSoldOut && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>已出清</span>}
                                  </td>
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
              <>
                {/* ── 跨 ETF 產業資金吸收版圖 ── */}
                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#a78bfa' }}>跨 ETF 產業資金吸收版圖</h3>
                    <div style={{ height: '300px', flex: 1 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-light)' }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(val) => [`${val}%`, '產業累計權重']} />
                          <Pie
                            data={aggregatedIndustryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={40}
                            paddingAngle={2}
                            label={({ name, value }) => `${name} ${value}%`}
                            labelStyle={{ fontSize: '11px', fontWeight: 600 }}
                            labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                          >
                            {aggregatedIndustryData.map((_, index) => {
                              const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#64748b', '#94a3b8'];
                              return <Cell key={`cell-agg-ind-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#a78bfa' }}>產業資金吸收明細</h3>
                    <div className="table-container" style={{ flex: 1, maxHeight: '300px', overflowY: 'auto', marginTop: 0 }}>
                      <table style={{ fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '0.6rem' }}>板塊名稱</th>
                            <th style={{ padding: '0.6rem' }}>累計加總權重</th>
                            <th style={{ padding: '0.6rem' }}>佔比比重</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const totalWeightSum = aggregatedIndustryData.reduce((s, x) => s + x.value, 0);
                            return aggregatedIndustryData.map((item, index) => (
                              <tr key={item.name}>
                                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '0.6rem', fontWeight: 700, color: '#a78bfa' }}>{item.value.toFixed(2)}%</td>
                                <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>
                                  {totalWeightSum > 0 ? `${((item.value / totalWeightSum) * 100).toFixed(1)}%` : '0%'}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

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
                          <th className="cursor-pointer" onClick={() => setAggregatedSort('weight')}>累計權重 (%) {aggregatedSort === 'weight' && '↓'}</th>
                          <th className="cursor-pointer" onClick={() => setAggregatedSort('diffShares')}>總加碼張數 {aggregatedSort === 'diffShares' && '↓'}</th>
                          <th>涵蓋 ETF 數</th>
                          <th>各 ETF 持倉明細</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedData.slice(0, 50).map((item, idx) => (
                          <tr key={item.stockCode} className="clickable-row" onClick={() => setChartModalData({code: item.stockCode, name: item.stockName})}>
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
                              {item.totalDiffShares > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--tw-up)' }}>
                                    +{(item.totalDiffShares / 1000).toFixed(1).replace(/\.0$/, '')} 張
                                  </span>
                                  {item.totalBuyingValue > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>
                                      估計佔比: {(item.totalBuyingValue).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--border-light)' }}>-</span>
                              )}
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
                                      border: `1px solid ${meta?.color}40`,
                                      display: 'flex', alignItems: 'center', gap: '3px'
                                    }}>
                                      {e.etfCode} {e.weight.toFixed(2)}%
                                      {(e.diffShares || 0) > 0 && (
                                        <span style={{ color: 'var(--tw-up)' }}>+{((e.diffShares)/1000).toFixed(1).replace(/\.0$/,'')}</span>
                                      )}
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
            </>
          )}

            {/* ══════════ 雙檔 ETF 比對視圖 ══════════ */}
            {viewMode === 'compare' && (
              <>
                {/* ── 比對控制列與相似度指標 ── */}
                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                  {/* 左側：下拉選擇器 */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: '#ec4899', marginBottom: '0.5rem' }}>選擇對比標的</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>投資組合 A</label>
                      <select 
                        value={compareEtfA} 
                        onChange={e => {
                          const val = e.target.value;
                          setCompareEtfA(val);
                          if (val === compareEtfB) {
                            const remaining = ALL_ETF_CODES.filter(c => c !== val);
                            if (remaining.length > 0) setCompareEtfB(remaining[0]);
                          }
                        }}
                        style={{ width: '100%', borderColor: ETF_META[compareEtfA]?.color }}
                      >
                        {ALL_ETF_CODES.map(code => (
                          <option key={`opt-a-${code}`} value={code}>
                            {code} - {ETF_META[code]?.name.replace('主動', '')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>投資組合 B</label>
                      <select 
                        value={compareEtfB} 
                        onChange={e => {
                          const val = e.target.value;
                          setCompareEtfB(val);
                          if (val === compareEtfA) {
                            const remaining = ALL_ETF_CODES.filter(c => c !== val);
                            if (remaining.length > 0) setCompareEtfA(remaining[0]);
                          }
                        }}
                        style={{ width: '100%', borderColor: ETF_META[compareEtfB]?.color }}
                      >
                        {ALL_ETF_CODES.map(code => (
                          <option key={`opt-b-${code}`} value={code}>
                            {code} - {ETF_META[code]?.name.replace('主動', '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 右側：重疊度 circular progress */}
                  <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* SVG 圓環 */}
                    <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        {/* 軌道 */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        {/* 進度填充 */}
                        <circle 
                          cx="50" cy="50" r="42" fill="none" 
                          stroke="url(#gradient-compare)" strokeWidth="8" 
                          strokeDasharray={2 * Math.PI * 42}
                          strokeDashoffset={2 * Math.PI * 42 * (1 - etfCompareResults.overlapPct / 100)}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
                        />
                        {/* 漸變色定義 */}
                        <defs>
                          <linearGradient id="gradient-compare" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                          {etfCompareResults.overlapPct}%
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>重疊度</span>
                      </div>
                    </div>

                    {/* 指標與數據 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: '160px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>相似持股比例：<span style={{ color: '#ec4899' }}>{etfCompareResults.overlapPct}%</span></h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>雙檔持股共同佔比之交集加總</span>
                      </div>
                      <div style={{ height: '1px', background: 'var(--border-light)' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>共同持有</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#c4b5fd' }}>{etfCompareResults.commonHoldings.length} 檔</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>相異佔比</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{(100 - etfCompareResults.overlapPct).toFixed(2)}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: ETF_META[compareEtfA]?.color }}>A 檔獨有</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: ETF_META[compareEtfA]?.color }}>{etfCompareResults.uniqueA.length} 檔</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: ETF_META[compareEtfB]?.color }}>B 檔獨有</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: ETF_META[compareEtfB]?.color }}>{etfCompareResults.uniqueB.length} 檔</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 持股比對明細表格 ── */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>雙檔持股交叉對比清單</h3>
                    
                    {/* Tab 切換器 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button 
                          onClick={() => setCompareTab('common')} 
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: compareTab === 'common' ? 'rgba(236,72,153,0.2)' : 'transparent', color: compareTab === 'common' ? '#ec4899' : 'var(--text-secondary)', fontWeight: 600 }}
                        >
                          共同持股 ({etfCompareResults.commonHoldings.length})
                        </button>
                        <button 
                          onClick={() => setCompareTab('uniqueA')} 
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: compareTab === 'uniqueA' ? `${ETF_META[compareEtfA]?.color}25` : 'transparent', color: compareTab === 'uniqueA' ? ETF_META[compareEtfA]?.color : 'var(--text-secondary)', fontWeight: 600 }}
                        >
                          {compareEtfA} 獨有 ({etfCompareResults.uniqueA.length})
                        </button>
                        <button 
                          onClick={() => setCompareTab('uniqueB')} 
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', border: 'none', background: compareTab === 'uniqueB' ? `${ETF_META[compareEtfB]?.color}25` : 'transparent', color: compareTab === 'uniqueB' ? ETF_META[compareEtfB]?.color : 'var(--text-secondary)', fontWeight: 600 }}
                        >
                          {compareEtfB} 獨有 ({etfCompareResults.uniqueB.length})
                        </button>
                      </div>

                      {/* 共同持股之列表與圖表視圖切換器 */}
                      {compareTab === 'common' && etfCompareResults.commonHoldings.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                          <button 
                            onClick={() => setCompareCommonView('list')}
                            style={{ 
                              padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', border: 'none', 
                              background: compareCommonView === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent', 
                              color: compareCommonView === 'list' ? '#fff' : 'var(--text-secondary)',
                              fontWeight: compareCommonView === 'list' ? 700 : 500,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            列表
                          </button>
                          <button 
                            onClick={() => setCompareCommonView('chart')}
                            style={{ 
                              padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', border: 'none', 
                              background: compareCommonView === 'chart' ? 'rgba(255,255,255,0.08)' : 'transparent', 
                              color: compareCommonView === 'chart' ? '#fff' : 'var(--text-secondary)',
                              fontWeight: compareCommonView === 'chart' ? 700 : 500,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            圖表
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 表格明細 */}
                  <div className="table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                    {compareTab === 'common' && compareCommonView === 'list' && (
                      <table>
                        <thead>
                          <tr>
                            <th>排名</th><th>代號</th><th>個股名稱</th>
                            <th style={{ color: ETF_META[compareEtfA]?.color }}>{compareEtfA} 權重</th>
                            <th style={{ color: ETF_META[compareEtfB]?.color }}>{compareEtfB} 權重</th>
                            <th>權重差值 (A - B)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etfCompareResults.commonHoldings.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>雙檔無任何共同持股</td></tr>
                          ) : (
                            etfCompareResults.commonHoldings.map((hold, idx) => {
                              const diff = hold.diffWeight;
                              const highlightColor = diff > 0 ? ETF_META[compareEtfA]?.color : (diff < 0 ? ETF_META[compareEtfB]?.color : 'var(--text-secondary)');
                              const pctA = Math.min((hold.weightA / 12) * 100, 100);
                              const pctB = Math.min((hold.weightB / 12) * 100, 100);
                              const colorA = ETF_META[compareEtfA]?.color || '#3b82f6';
                              const colorB = ETF_META[compareEtfB]?.color || '#10b981';
                              return (
                                <tr key={`common-${hold.stockCode}`} className="clickable-row" onClick={() => setChartModalData({code: hold.stockCode, name: hold.stockName})}>
                                  <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                  <td style={{ fontWeight: 600, color: '#94a3b8' }}>{hold.stockCode}</td>
                                  <td style={{ fontWeight: 500 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <span>{hold.stockName}</span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                        <span style={{
                                          display: 'inline-block',
                                          fontSize: '0.65rem',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          color: 'var(--text-secondary)',
                                          border: '1px solid var(--border-light)',
                                          fontWeight: 600
                                        }}>
                                          {getStockIndustry(hold.stockCode, hold.stockName)}
                                        </span>
                                        {(STOCK_CONCEPTS_MAP[hold.stockCode.trim()] || []).map(concept => (
                                          <span key={concept} style={{
                                            display: 'inline-block',
                                            fontSize: '0.65rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(96, 165, 250, 0.1)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(96, 165, 250, 0.2)',
                                            fontWeight: 600
                                          }}>
                                            {concept}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ 
                                    fontWeight: 600,
                                    background: `linear-gradient(to right, ${colorA}18 0%, ${colorA}18 ${pctA}%, transparent ${pctA}%, transparent 100%)`,
                                    transition: 'background 0.3s ease'
                                  }}>{hold.weightA.toFixed(2)}%</td>
                                  <td style={{ 
                                    fontWeight: 600,
                                    background: `linear-gradient(to right, ${colorB}18 0%, ${colorB}18 ${pctB}%, transparent ${pctB}%, transparent 100%)`,
                                    transition: 'background 0.3s ease'
                                  }}>{hold.weightB.toFixed(2)}%</td>
                                  <td style={{ fontWeight: 700, color: highlightColor }}>
                                    {diff > 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}

                    {compareTab === 'common' && compareCommonView === 'chart' && (() => {
                      const chartHeight = Math.max(etfCompareResults.commonHoldings.length * 36 + 60, 350);
                      return (
                        <div style={{ padding: '1rem 0' }}>
                          {etfCompareResults.commonHoldings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>雙檔無任何共同持股</div>
                          ) : (
                            <>
                              {/* 自訂高質感圖例 */}
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: ETF_META[compareEtfA]?.color }} />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {compareEtfA} {ETF_META[compareEtfA]?.name.replace('主動', '')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: ETF_META[compareEtfB]?.color }} />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {compareEtfB} {ETF_META[compareEtfB]?.name.replace('主動', '')}
                                  </span>
                                </div>
                              </div>

                              {/* 雙柱水平條形圖 */}
                              <div style={{ width: '100%', height: `${chartHeight}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    layout="vertical"
                                    data={etfCompareResults.commonHoldings}
                                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                                  >
                                    <XAxis 
                                      type="number" 
                                      tickFormatter={(val) => `${val}%`}
                                      stroke="var(--text-secondary)"
                                      fontSize={11}
                                    />
                                    <YAxis 
                                      type="category" 
                                      dataKey="stockName" 
                                      stroke="var(--text-secondary)"
                                      fontSize={11}
                                      width={80}
                                    />
                                    <Tooltip
                                      cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                                      wrapperStyle={{ outline: 'none' }}
                                      contentStyle={{ background: 'transparent', border: 'none' }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="glass-panel" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', backdropFilter: 'blur(10px)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}>
                                              <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.9rem', color: '#fff' }}>
                                                {data.stockName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({data.stockCode})</span>
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: ETF_META[compareEtfA]?.color }}>
                                                  <span>{compareEtfA} 權重:</span>
                                                  <span style={{ fontWeight: 700 }}>{data.weightA.toFixed(2)}%</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: ETF_META[compareEtfB]?.color }}>
                                                  <span>{compareEtfB} 權重:</span>
                                                  <span style={{ fontWeight: 700 }}>{data.weightB.toFixed(2)}%</span>
                                                </div>
                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: data.diffWeight > 0 ? ETF_META[compareEtfA]?.color : (data.diffWeight < 0 ? ETF_META[compareEtfB]?.color : '#fff') }}>
                                                  <span>權重差值:</span>
                                                  <span style={{ fontWeight: 700 }}>
                                                    {data.diffWeight > 0 ? `+${data.diffWeight.toFixed(2)}%` : `${data.diffWeight.toFixed(2)}%`}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar 
                                      dataKey="weightA" 
                                      name={compareEtfA} 
                                      fill={ETF_META[compareEtfA]?.color} 
                                      radius={[0, 4, 4, 0]}
                                      barSize={12}
                                    />
                                    <Bar 
                                      dataKey="weightB" 
                                      name={compareEtfB} 
                                      fill={ETF_META[compareEtfB]?.color} 
                                      radius={[0, 4, 4, 0]}
                                      barSize={12}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                * 顯示所有共同持股，依據雙方權重之和排序
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {compareTab === 'uniqueA' && (
                      <table>
                        <thead>
                          <tr>
                            <th>排名</th><th>代號</th><th>個股名稱</th>
                            <th style={{ color: ETF_META[compareEtfA]?.color }}>持股權重</th>
                            <th>產業板塊</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etfCompareResults.uniqueA.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>該 ETF 無獨有持股</td></tr>
                          ) : (
                            etfCompareResults.uniqueA.map((hold, idx) => (
                              <tr key={`uniqueA-${hold.stockCode}`} className="clickable-row" onClick={() => setChartModalData({code: hold.stockCode, name: hold.stockName})}>
                                <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, color: '#94a3b8' }}>{hold.stockCode}</td>
                                <td style={{ fontWeight: 500 }}>{hold.stockName}</td>
                                <td style={{ fontWeight: 700, color: ETF_META[compareEtfA]?.color }}>{hold.weight.toFixed(2)}%</td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      fontSize: '0.65rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-light)',
                                      fontWeight: 600
                                    }}>
                                      {getStockIndustry(hold.stockCode, hold.stockName)}
                                    </span>
                                    {(STOCK_CONCEPTS_MAP[hold.stockCode.trim()] || []).map(concept => (
                                      <span key={concept} style={{
                                        display: 'inline-block',
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(96, 165, 250, 0.1)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(96, 165, 250, 0.2)',
                                        fontWeight: 600
                                      }}>
                                        {concept}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}

                    {compareTab === 'uniqueB' && (
                      <table>
                        <thead>
                          <tr>
                            <th>排名</th><th>代號</th><th>個股名稱</th>
                            <th style={{ color: ETF_META[compareEtfB]?.color }}>持股權重</th>
                            <th>產業板塊</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etfCompareResults.uniqueB.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>該 ETF 無獨有持股</td></tr>
                          ) : (
                            etfCompareResults.uniqueB.map((hold, idx) => (
                              <tr key={`uniqueB-${hold.stockCode}`} className="clickable-row" onClick={() => setChartModalData({code: hold.stockCode, name: hold.stockName})}>
                                <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, color: '#94a3b8' }}>{hold.stockCode}</td>
                                <td style={{ fontWeight: 500 }}>{hold.stockName}</td>
                                <td style={{ fontWeight: 700, color: ETF_META[compareEtfB]?.color }}>{hold.weight.toFixed(2)}%</td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      fontSize: '0.65rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-light)',
                                      fontWeight: 600
                                    }}>
                                      {getStockIndustry(hold.stockCode, hold.stockName)}
                                    </span>
                                    {(STOCK_CONCEPTS_MAP[hold.stockCode.trim()] || []).map(concept => (
                                      <span key={concept} style={{
                                        display: 'inline-block',
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(96, 165, 250, 0.1)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(96, 165, 250, 0.2)',
                                        fontWeight: 600
                                      }}>
                                        {concept}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}


          </>
        } />
      </Routes>

      {/* K線圖懸浮視窗 */}
      {chartModalData && (
        <StockChartModal
          stockCode={chartModalData.code}
          stockName={chartModalData.name}
          onClose={() => setChartModalData(null)}
        />
      )}
    </div>
  );
}

export default App;
