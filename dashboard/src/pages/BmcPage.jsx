import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, BarController,
  Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend);

// ── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#f87171', fontSize: '0.85rem' }}>
        圖表錯誤：{this.state.error?.message}
      </div>
    );
    return this.props.children;
  }
}

// ── 共用 styles ──────────────────────────────────────────────
const glassCard = {
  background: 'rgba(30,41,59,0.65)', backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
  borderRadius: '1.5rem', padding: '2rem',
};
const gradientText = (from, to) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', display: 'inline-block',
});
const bodyText = { color: '#CBD5E1', lineHeight: 1.75, marginBottom: '1rem' };
const caption = { textAlign: 'center', fontSize: '0.75rem', color: '#475569', marginTop: '0.75rem' };

// ── Flow Box 元件 ────────────────────────────────────────────
function FlowBox({ children, variant = 'neutral' }) {
  const base = {
    background: variant === 'danger' ? 'rgba(239,68,68,0.1)' : variant === 'success' ? 'rgba(6,182,212,0.1)' : '#1E293B',
    border: `1px solid ${variant === 'danger' ? '#EF4444' : variant === 'success' ? '#06B6D4' : '#475569'}`,
    color: variant === 'danger' ? '#FCA5A5' : variant === 'success' ? '#67E8F9' : '#F1F5F9',
    padding: '10px 14px', borderRadius: 8, textAlign: 'center',
    fontWeight: 600, width: '100%', maxWidth: 280, margin: '0 auto', fontSize: '0.875rem',
  };
  return <div style={base}>{children}</div>;
}
function Arrow() {
  return <div style={{ textAlign: 'center', color: '#64748B', fontSize: '1.3rem', margin: '3px 0' }}>↓</div>;
}

// ── SWOT 資料 ────────────────────────────────────────────────
const SWOT_DATA = {
  S: {
    label: '優勢', sub: 'Strengths', color: '#22D3EE', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.4)',
    preview: '70%市佔 / 韌體轉換成本 / PEG極低',
    items: [
      { title: '本益成長比 (PEG) 合理', desc: '雖本益比高達 60 倍，但因營收成長率破 106%，PEG 僅 0.41，估值具備強力基本面支撐。' },
      { title: '極高轉換成本', desc: 'OCP OpenBMC 預設標準，代工廠與 CSP 若換晶片需重寫韌體，SIT 測試重工風險極大。' },
      { title: '輕資產高毛利', desc: '維持 64%~67% 極高毛利率，無晶圓廠模式完美規避製造端折舊風險。' },
    ],
  },
  W: {
    label: '劣勢', sub: 'Weaknesses', color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)',
    preview: '單一產業依賴 / 籌碼少易劇震',
    items: [
      { title: '產業高度集中', desc: '營收幾乎 100% 依賴伺服器，極度受制於超大規模 CSP 的資本支出 (CapEx) 週期。' },
      { title: '籌碼面劇震', desc: '股本僅約 3.8 億台幣，市值與股本不對稱，外資法人資金進出易造成股價極端波動。' },
    ],
  },
  O: {
    label: '機會', sub: 'Opportunities', color: '#A78BFA', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)',
    preview: 'NVL72機櫃化 / DC-SCM / 液冷監控',
    items: [
      { title: 'NVL72 乘數效應', desc: 'AI 機櫃解構，造就單櫃需要高達 81 顆以上的 BMC/BIC/RoT 晶片，資本支出效率大幅優化。' },
      { title: 'DC-SCM 模組化', desc: '開放運算計畫標準化讓 BMC 獨立成卡，加速晶片迭代與跨平台部署能力。' },
      { title: '矽級信任根 (SiRoT)', desc: '惡意攻擊迫使硬體加密成為標配，提升 AST2700 高階晶片的 ASP（平均客單價）。' },
    ],
  },
  T: {
    label: '威脅', sub: 'Threats', color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)',
    preview: 'CSP自研(Titan/Nitro) / DPU打擊',
    items: [
      { title: 'CSP 自研晶片', desc: 'Google Titan、AWS Nitro 等追求極致 Zero Trust，有動機整合底層管理功能。' },
      { title: 'DPU 降維打擊', desc: 'NVIDIA BlueField 等資料處理單元若補足帶外管理功能，可能蠶食獨立 BMC 市場。' },
      { title: '競爭者反攻', desc: '新唐 (Nuvoton) 固守企業級市場，加上中國本土 RISC-V 晶片在政策保護下的崛起威脅。' },
    ],
  },
};

// ── BMC Multiplier Chart ─────────────────────────────────────
const rackChartData = {
  labels: ['傳統伺服器\n(1-2 CPU)', 'NVIDIA\nHGX H100', 'NVIDIA\nNVL36 機櫃', 'NVIDIA\nNVL72 機櫃'],
  datasets: [{
    label: '單系統/機櫃 BMC 預估總數',
    data: [1, 12, 45, 81],
    backgroundColor: '#F59E0B', borderColor: '#D97706', borderWidth: 1, borderRadius: 4,
  }],
};
const rackChartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { color: '#F8FAFC' } },
    tooltip: { callbacks: { title: (ctx) => { const l = ctx[0].chart.data.labels[ctx[0].dataIndex]; return Array.isArray(l) ? l.join(' ') : l; } } },
  },
  scales: {
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '管理晶片數量 (顆)', color: '#94A3B8' } },
    x: { grid: { display: false } },
  },
};

// ── SWOT 象限矩陣 ─────────────────────────────────────────
function SwotMatrix() {
  const [active, setActive] = useState(null);
  const data = active ? SWOT_DATA[active] : null;

  return (
    <div>
      <h3 style={{ fontSize: '1.6rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        五、信驊 (ASPEED) 互動式 SWOT 象限矩陣
      </h3>
      <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>點擊任一象限，即可深入探索「萬金股王」的基本面與隱形威脅數據。</p>

      {/* 象限格子 */}
      {!active && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {Object.entries(SWOT_DATA).map(([key, d]) => (
            <div
              key={key}
              onClick={() => setActive(key)}
              style={{
                background: d.bg, border: `2px solid ${d.border}`, borderRadius: '1rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '2rem 1.5rem', cursor: 'pointer', position: 'relative',
                minHeight: 160, transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 20px ${d.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ position: 'absolute', top: 10, left: (key === 'S' || key === 'O') ? 14 : 'auto', right: (key === 'W' || key === 'T') ? 14 : 'auto', fontSize: '2.5rem', fontWeight: 900, color: d.color, opacity: 0.15 }}>{key}</span>
              <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: d.color, margin: 0 }}>{d.label}</h4>
              <p style={{ fontSize: '0.8rem', color: d.color, opacity: 0.7, margin: '0.4rem 0 0.5rem' }}>{d.sub}</p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>{d.preview}</p>
            </div>
          ))}
        </div>
      )}

      {/* 詳細資訊（取代格子，不疊加） */}
      {data && (
        <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '1rem', border: `1px solid ${data.border}`, padding: '1.75rem' }}>
          {/* 切換列 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {Object.entries(SWOT_DATA).map(([key, d]) => (
              <button key={key} onClick={() => setActive(key)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${d.border}`, background: active === key ? d.bg : 'transparent', color: d.color,
              }}>{d.label}</button>
            ))}
            <button onClick={() => setActive(null)} style={{
              marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', cursor: 'pointer',
            }}>← 返回象限</button>
          </div>
          <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: data.color, marginBottom: '1.25rem', borderBottom: `1px solid ${data.border}`, paddingBottom: '0.75rem' }}>
            {data.label} — {data.sub}
          </h4>
          {data.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.color, flexShrink: 0, marginTop: 7 }} />
              <div>
                <strong style={{ color: data.color, display: 'block', marginBottom: '0.3rem' }}>{item.title}</strong>
                <span style={{ color: '#CBD5E1', fontSize: '0.9rem', lineHeight: 1.7 }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主元件 ───────────────────────────────────────────────────
export default function BmcPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
        <div style={{ display: 'inline-block', marginBottom: '1rem', padding: '3px 14px', borderRadius: 999, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#22D3EE', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em' }}>
          INDUSTRY DEEP DIVE REPORT
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '1rem' }}>
          萬金股王基本面：<span style={gradientText('#67E8F9', '#06B6D4')}>信驊(ASPEED)</span> 與 BMC 革命
        </h2>
        <p style={{ color: '#94A3B8', lineHeight: 1.75, maxWidth: 760, margin: '0 auto', fontSize: '0.95rem' }}>
          從「帶內」到「帶外」的管理革命，解析 AI 機櫃時代如何創造 81 倍晶片需求，以及台股 BMC 供應鏈的底層運作邏輯。
        </p>
      </div>

      {/* ── Section 1: In-Band vs Out-of-Band ── */}
      <div style={glassCard}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', ...gradientText('#67E8F9', '#06B6D4'), borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          一、硬體架構：如果沒有 BMC，伺服器怎麼溝通？
        </h3>
        <p style={bodyText}>
          要理解 BMC 的偉大，必須先看「沒有它」的世界。在傳統架構中，所有硬體感測資料都依賴作業系統 (OS) 處理，稱為
          <strong style={{ color: '#F87171' }}>「帶內管理 (In-Band)」</strong>。一旦 OS 崩潰，伺服器變成昂貴廢鐵。導入 BMC 後，開啟了獨立的
          <strong style={{ color: '#22D3EE' }}>「帶外管理 (Out-of-Band)」</strong>通道。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {/* In-Band */}
          <div style={{ background: '#0F172A', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(239,68,68,0.3)' }}>
            <h4 style={{ textAlign: 'center', fontWeight: 700, color: '#F87171', marginBottom: '1.25rem', fontSize: '1rem' }}>❌ 沒有 BMC（帶內管理 In-Band）</h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <FlowBox>主機板感測器（溫度/風扇/電壓）</FlowBox>
              <Arrow /><span style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>透過 I2C/SMBus</span>
              <FlowBox>南橋晶片（PCH）</FlowBox>
              <Arrow />
              <FlowBox variant="danger">
                主處理器（CPU）與作業系統（OS）
                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: 4, color: '#FCA5A5' }}>致命單點故障！當機即失聯</div>
              </FlowBox>
              <Arrow /><FlowBox>共用實體網卡（NIC）</FlowBox>
              <Arrow /><FlowBox style={{ opacity: 0.6 }}>網管人員監控面板</FlowBox>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#94A3B8', background: 'rgba(239,68,68,0.05)', padding: '0.75rem', borderRadius: 8 }}>
              <strong>災難情境：</strong>Kernel Panic 後 OS 無法回應，網管須推著 Crash Cart 親自進機房手動重開機。
            </div>
          </div>

          {/* Out-of-Band */}
          <div style={{ background: '#0F172A', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(6,182,212,0.3)' }}>
            <h4 style={{ textAlign: 'center', fontWeight: 700, color: '#22D3EE', marginBottom: '1.25rem', fontSize: '1rem' }}>✅ 有 BMC（帶外管理 Out-of-Band）</h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <FlowBox>主機板感測器（溫度/風扇/電壓）</FlowBox>
              <Arrow /><span style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>獨立線路攔截</span>
              <FlowBox variant="success">
                BMC 晶片（如 信驊 AST2700）
                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: 4, color: '#A5F3FC' }}>自帶獨立 OS/RAM，與主 CPU 完全隔離</div>
              </FlowBox>
              <Arrow /><FlowBox>專屬獨立網卡（OOB NIC）</FlowBox>
              <Arrow /><span style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>透過 IPMI / Redfish API</span>
              <FlowBox style={{ opacity: 0.6 }}>網管人員監控面板</FlowBox>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#94A3B8', background: 'rgba(6,182,212,0.05)', padding: '0.75rem', borderRadius: 8 }}>
              <strong>無人機房實現：</strong>透過 ipmitool 下達 power cycle，無論主機死機多嚴重，BMC 皆能強制重啟並遠端掛載 ISO。
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2 & 3 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Section 2: 百佳泰 */}
        <div style={glassCard}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', ...gradientText('#C4B5FD', '#8B5CF6') }}>
            二、實務痛點：百佳泰 SIT 測試與 IPMI 應用
          </h3>
          <p style={{ ...bodyText, fontSize: '0.875rem' }}>
            BMC 雖強大，但開發與整合極其困難。根據「百佳泰 (Allion Labs)」的系統整合測試 (SIT) 統計，伺服器新進客戶高達
            <strong style={{ color: '#F8FAFC' }}> 40% 的 Bug 來自 BMC 相關功能</strong>。
          </p>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1rem' }}>
            {[
              { icon: '⚠️', title: '掛載異常', desc: '遠端掛載虛擬 ISO 映像檔安裝 OS 時中斷。' },
              { icon: '⚠️', title: '日誌缺失', desc: 'System Event Log (SEL) 漏記關鍵硬體錯誤。' },
              { icon: '⚠️', title: '資安漏洞', desc: '未修改預設密碼，或 IPMI (UDP 623 port) 暴露。' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: i < 2 ? '0.75rem' : 0, fontSize: '0.84rem' }}>
                <span>{item.icon}</span>
                <span><strong style={{ color: '#F8FAFC' }}>{item.title}：</strong><span style={{ color: '#94A3B8' }}>{item.desc}</span></span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B' }}>這也是 OEM 廠不敢輕易換供應商的根本原因——轉換成本與重新解 Bug 的代價過高。</p>
        </div>

        {/* Section 3: 台股供應鏈 */}
        <div style={glassCard}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', ...gradientText('#C4B5FD', '#8B5CF6') }}>
            三、台股 BMC 供應鏈戰略版圖
          </h3>
          <p style={{ ...bodyText, fontSize: '0.875rem' }}>
            在「開放運算計畫 (OCP)」推動 DC-SCM 模組化的趨勢下，台廠生態系佔據了全球咽喉點。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { color: '#22D3EE', name: '信驊 (5274) — 硬體與 SoC 龍頭', desc: '市佔 70%，OpenBMC 預設標準。AST2700 (12nm) 整合 RISC-V 核心處理底層安全溝通。' },
              { color: '#60A5FA', name: '新唐 (4919) — 企業級與特規專案', desc: '全球第二大，深耕 Microsoft "Hydra" 專案與傳統 Dell 企業級伺服器市場。' },
              { color: '#A78BFA', name: '系微 (6231) — 韌體與資安防線', desc: 'BIOS 巨頭，Supervyse OPF 韌體與信驊硬體深度綁定，提供 PFR 韌體復原工具。' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.875rem', border: `1px solid ${item.color}30` }}>
                <div style={{ fontWeight: 700, color: item.color, marginBottom: '0.3rem', fontSize: '0.9rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4: 81x Multiplier Chart ── */}
      <div style={glassCard}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', ...gradientText('#FDE68A', '#D97706') }}>
          四、高估值密碼：AI 伺服器的 81 倍乘數效應
        </h3>
        <p style={{ ...bodyText, fontSize: '0.875rem' }}>
          為什麼信驊享有極高本益比？因為「資本支出效率 (Capex Efficiency)」反轉。過往 10 萬美元才產生 1 顆 BMC 需求；在 Blackwell NVL72 世代，造價數百萬的機櫃被切分為 18 個運算匣與 9 個交換匣，降至每 3.7 萬美元就需要 1 顆，整櫃晶片用量呈幾何級數暴增。
        </p>
        <ErrorBoundary>
          <div style={{ height: 380 }}>
            <Bar data={rackChartData} options={rackChartOptions} />
          </div>
        </ErrorBoundary>
        <p style={caption}>NVIDIA 各世代架構對 BMC 與相關管理晶片之需求量對比</p>
      </div>

      {/* ── Section 5: SWOT ── */}
      <div style={glassCard}>
        <SwotMatrix />
      </div>

    </div>
  );
}
