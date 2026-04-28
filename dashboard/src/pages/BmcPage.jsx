import React from 'react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  LineController, BarController,
} from 'chart.js';
import { Doughnut, Bar, Chart } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  LineController, BarController,
);

// ── Error Boundary：防止圖表渲染失敗導致整頁空白 ────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.875rem' }}>
          <strong>圖表渲染錯誤：</strong> {this.state.error?.message || '未知錯誤'}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── 共用 style 物件 ──────────────────────────────────────────
const S = {
  gradientText: {
    background: 'linear-gradient(to right, #06B6D4, #8B5CF6)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    display: 'inline-block',
  },
  glassCard: {
    background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
    borderRadius: '1rem', padding: '2rem',
  },
  sectionTitle: (color = '#22D3EE') => ({
    fontSize: '1.35rem', fontWeight: 700, color,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '0.6rem', marginBottom: '1.5rem',
  }),
  statBox: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem',
    padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center', flex: 1,
  },
  bodyText: { color: '#D1D5DB', lineHeight: 1.75, marginBottom: '1.5rem' },
  caption: { textAlign: 'center', fontSize: '0.8rem', color: '#6B7280', marginTop: '1rem' },
};

// ── Chart.js 預設 ───────────────────────────────────────────
ChartJS.defaults.color = '#94A3B8';

// ── 工具函式 ────────────────────────────────────────────────
const processLabel = (label) => {
  if (label.length <= 16) return label;
  const chunks = [];
  for (let i = 0; i < label.length; i += 16) chunks.push(label.substring(i, i + 16));
  return chunks;
};
const commonTooltip = {
  callbacks: {
    title: (items) => {
      const label = items[0].chart.data.labels[items[0].dataIndex];
      return Array.isArray(label) ? label.join(' ') : label;
    }
  }
};

// ── 圖表設定 ────────────────────────────────────────────────
const marketShareData = {
  labels: ['信驊科技 (ASPEED)', '新唐科技 (Nuvoton)', '其他廠商 (Others)'].map(processLabel),
  datasets: [{
    data: [72, 18, 10],
    backgroundColor: ['#06B6D4', '#3B82F6', '#475569'],
    borderColor: '#0F172A', borderWidth: 4, hoverOffset: 10,
  }]
};
const marketShareOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { padding: 20, color: '#F8FAFC' } },
    tooltip: commonTooltip,
  },
  cutout: '65%',
};

const financialData = {
  labels: ['2019', '2020', '2021', '2022', '2023', '2024(預測)'].map(processLabel),
  datasets: [
    {
      type: 'line', label: '毛利率 (%)',
      data: [63.5, 63.8, 65.1, 65.0, 64.5, 65.2],
      borderColor: '#8B5CF6', backgroundColor: '#8B5CF6',
      borderWidth: 3, tension: 0.3, yAxisID: 'y1', pointRadius: 5,
    },
    {
      type: 'bar', label: '預估營收指數 (示意基準)',
      data: [100, 130, 150, 210, 145, 230],
      backgroundColor: 'rgba(6,182,212,0.5)', borderColor: '#06B6D4',
      borderWidth: 1, yAxisID: 'y', borderRadius: 4,
    }
  ]
};
const financialOptions = {
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { tooltip: commonTooltip, legend: { labels: { color: '#F8FAFC' } } },
  scales: {
    y: {
      type: 'linear', display: true, position: 'left',
      grid: { color: 'rgba(255,255,255,0.05)' },
      title: { display: true, text: '營收增長趨勢', color: '#94A3B8' },
    },
    y1: {
      type: 'linear', display: true, position: 'right',
      min: 50, max: 75, grid: { drawOnChartArea: false },
      title: { display: true, text: '毛利率 (%)', color: '#8B5CF6' },
    },
    x: { grid: { display: false } },
  }
};

const aiMultiplierData = {
  labels: ['傳統通用型伺服器', '高階 AI 伺服器 (推論/中階)', '頂級 AI 伺服器叢集 (訓練/高階)'].map(processLabel),
  datasets: [
    { label: '主機板核心 BMC', data: [1, 1, 1], backgroundColor: '#3B82F6' },
    { label: '加速卡/基板擴充 BMC', data: [0, 1, 2], backgroundColor: '#06B6D4' },
    { label: '邊緣橋接/安全控制晶片(PFR等)', data: [0, 1, 2], backgroundColor: '#8B5CF6' },
  ]
};
const aiMultiplierOptions = {
  maintainAspectRatio: false,
  plugins: { tooltip: commonTooltip, legend: { position: 'top', labels: { color: '#F8FAFC' } } },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: {
      stacked: true, grid: { color: 'rgba(255,255,255,0.05)' },
      title: { display: true, text: '管理晶片需求數量 (單位/台)', color: '#94A3B8' },
      ticks: { stepSize: 1 },
    }
  }
};

// ── BMC 架構圖元件 ────────────────────────────────────────
function BmcDiagram() {
  const nodeStyle = (extra = {}) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 80, height: 80, borderRadius: '50%',
    background: '#1E293B', border: '2px solid #3B82F6',
    position: 'absolute', zIndex: 10, ...extra,
  });
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 十字線 */}
      {['0deg','45deg','90deg','135deg'].map(r => (
        <div key={r} style={{ position: 'absolute', width: '100%', height: 1, background: '#3B82F6', opacity: 0.2, transform: `rotate(${r})` }} />
      ))}
      <div style={nodeStyle({ top: 0, left: '50%', transform: 'translateX(-50%)' })}>
        <span style={{ fontSize: '1.5rem' }}>❄️</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>風扇/散熱</span>
      </div>
      <div style={nodeStyle({ bottom: 0, left: '50%', transform: 'translateX(-50%)' })}>
        <span style={{ fontSize: '1.5rem' }}>⚡</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>電源/電壓</span>
      </div>
      <div style={nodeStyle({ left: 0, top: '50%', transform: 'translateY(-50%)' })}>
        <span style={{ fontSize: '1.5rem' }}>💻</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>主處理器</span>
      </div>
      <div style={nodeStyle({ right: 0, top: '50%', transform: 'translateY(-50%)' })}>
        <span style={{ fontSize: '1.5rem' }}>💾</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>記憶體儲存</span>
      </div>
      {/* 中心 BMC */}
      <div style={{ ...nodeStyle(), position: 'relative', width: 110, height: 110, border: '3px solid #8B5CF6', background: '#0F172A' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#A78BFA' }}>BMC</span>
        <span style={{ fontSize: '0.65rem', textAlign: 'center', color: '#94A3B8', marginTop: 4 }}>遠端管理<br />核心樞紐</span>
      </div>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────
export default function BmcPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
          <span style={S.gradientText}>伺服器的隱形大腦</span>
        </h2>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '1rem' }}>
          深度解析 BMC 與信驊 (ASPEED) 股王稱號的底層邏輯
        </h3>
        <p style={{ color: '#94A3B8', lineHeight: 1.75, maxWidth: 700, margin: '0 auto' }}>
          在 AI 與雲端運算爆發的時代，伺服器內建的遠端管理晶片 (BMC) 成為不可或缺的基礎設施。信驊科技憑藉什麼優勢，能以小巧的晶片撐起台灣台股最高的市值單價？
        </p>
      </div>

      {/* Section 1: What is BMC */}
      <ErrorBoundary>
      <div style={S.glassCard}>
        <h4 style={S.sectionTitle('#22D3EE')}>1. 什麼是 BMC (Baseboard Management Controller)?</h4>
        <p style={S.bodyText}>
          BMC 是一顆獨立於伺服器主 CPU 之外的微控制器。它的核心作用是「遠端監控與管理」。即使伺服器當機、作業系統崩潰或處於關機狀態，只要有接上電源，網管人員就能透過 BMC 遠端重開機、監控溫度、電壓、風扇轉速，並進行系統更新。這大幅降低了資料中心人員進入實體機房的維護成本。
        </p>
        <BmcDiagram />
        <p style={S.caption}>▲ 圖示：BMC 獨立運作並監控伺服器各大核心元件</p>
      </div>
      </ErrorBoundary>

      {/* Section 2: Market dominance */}
      <ErrorBoundary>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ ...S.glassCard, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={S.sectionTitle('#A78BFA')}>2. 寡占市場：信驊的全球霸主地位</h4>
            <p style={S.bodyText}>
              信驊 (ASPEED) 在全球伺服器 BMC 市場擁有超過七成的市占率，幾乎壟斷了白牌伺服器與大型雲端服務供應商 (CSP) 的供應鏈。其最大競爭對手為新唐 (Nuvoton)，但信驊憑藉長期的韌體相容性累積與客戶黏著度，築起了極高的護城河。
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <div style={S.statBox}>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#22D3EE' }}>72%</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 4 }}>全球 BMC 市占率 (預估)</div>
            </div>
            <div style={S.statBox}>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#A78BFA' }}>~65%</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 4 }}>維持超高毛利率</div>
            </div>
          </div>
        </div>
        <div style={S.glassCard}>
          <div style={{ height: 350 }}>
            <Doughnut data={marketShareData} options={marketShareOptions} />
          </div>
          <p style={S.caption}>▲ 數據顯示信驊在市場中的絕對領先優勢</p>
        </div>
      </div>
      </ErrorBoundary>

      {/* Section 3: Financial moat */}
      <ErrorBoundary>
      <div style={S.glassCard}>
        <h4 style={S.sectionTitle('#22D3EE')}>3. 財務護城河：為何享有千金股王估值？</h4>
        <p style={S.bodyText}>
          信驊之所以能成為台股股王，並享有極高的本益比，在於其「輕資產、高毛利、高成長」的 IC 設計特性。由於 BMC 韌體開發門檻高，客戶一旦採用便極難更換 (Switching Cost 巨大)。這使得信驊能維持極其穩定的高毛利率，並隨著全球雲端伺服器建置量穩定成長。
        </p>
        <div style={{ height: 380 }}>
          <Chart type='bar' data={financialData} options={financialOptions} />
        </div>
        <p style={S.caption}>▲ 營收規模雖受庫存週期波動，但毛利率長期穩居高檔</p>
      </div>
      </ErrorBoundary>

      {/* Section 4: AI multiplier */}
      <ErrorBoundary>
      <div style={S.glassCard}>
        <h4 style={S.sectionTitle('#A78BFA')}>4. AI 伺服器爆發帶來的「乘數效應」</h4>
        <p style={S.bodyText}>
          傳統伺服器通常只需要一顆 BMC。但在 AI 伺服器（如搭載 Nvidia H100/B200 的 HGX 架構）中，由於運算架構極度複雜且昂貴，需要更細緻的監控。除了主機板外，加速卡基板、甚至每顆高階 GPU 周邊都可能配置額外的擴充管理晶片或 mini-BMC。這導致單一 AI 伺服器機櫃對 BMC 及相關橋接晶片的需求量，是傳統伺服器的 2 到 4 倍。
        </p>
        <div style={{ height: 350 }}>
          <Bar data={aiMultiplierData} options={aiMultiplierOptions} />
        </div>
        <p style={S.caption}>▲ AI 伺服器架構複雜度提升，帶動單機 BMC 及管理晶片搭載量翻倍成長</p>
      </div>
      </ErrorBoundary>

      {/* Section 5: Tech roadmap */}
      <div style={S.glassCard}>
        <h4 style={S.sectionTitle('#22D3EE')}>5. 技術藍圖與未來展望</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            {
              label: '過往主力', labelColor: '#3B82F6',
              title: 'AST2500', titleColor: '#F1F5F9',
              desc: '奠定霸主地位的成熟產品，廣泛應用於前幾代企業級與資料中心伺服器。',
              border: '#374151', glow: 'none',
            },
            {
              label: '現役主力', labelColor: '#06B6D4',
              title: 'AST2600', titleColor: '#22D3EE',
              desc: '目前出貨大宗，效能提升，支援雙核心架構與更進階的安全加密技術 (Root of Trust)。',
              border: '#06B6D4', glow: '0 0 15px rgba(6,182,212,0.3)',
            },
            {
              label: '次世代 / AI', labelColor: '#8B5CF6',
              title: 'AST2700 世代', titleColor: '#A78BFA',
              desc: '採用 12nm 先進製程，算力大幅躍升。專為複雜的 AI 伺服器與次世代高速傳輸介面打造。',
              border: '#7C3AED', glow: '0 0 15px rgba(139,92,246,0.3)',
            },
          ].map((item, i) => (
            <div key={i} style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${item.border}`, boxShadow: item.glow, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -12, left: 20, background: item.labelColor, color: '#fff', fontSize: '0.7rem', padding: '2px 10px', borderRadius: 4, fontWeight: 700 }}>{item.label}</span>
              <h5 style={{ fontSize: '1.15rem', fontWeight: 700, color: item.titleColor, marginBottom: '0.5rem', marginTop: '0.5rem' }}>{item.title}</h5>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.75rem' }}>綜合結論：強者恆強的格局</h5>
          <p style={{ fontSize: '0.9rem', color: '#D1D5DB', lineHeight: 1.75 }}>
            信驊之所以具備股王資格，並非單靠短期的話題炒作，而是建立在<strong>絕對市占率</strong>、<strong>高進入壁壘（韌體與客戶生態系）</strong>、以及<strong>受惠於雲端與 AI 硬體升級的長期趨勢</strong>之上。只要資料中心的規模持續擴張，伺服器對於底層安全與遠端管理的需求就不會停止，作為全球伺服器隱形大腦的領導者，其估值溢價將有強韌的基本面支撐。
          </p>
        </div>
      </div>

    </div>
  );
}
