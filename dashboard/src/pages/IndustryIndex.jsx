import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, ChevronRight, Search, Tag } from 'lucide-react';

// ── 分類定義（未來新增類別只需在此加一筆）────────────────────
const CATEGORIES = [
  { id: 'all',           label: '全部文章',      emoji: '📋' },
  { id: 'semiconductor', label: '半導體與晶片',   emoji: '💾' },
  { id: 'ai_infra',      label: 'AI 基礎設施',   emoji: '🤖' },
  { id: 'macro',         label: '總體經濟',       emoji: '📈' },
  { id: 'software',      label: '軟體與平台',     emoji: '⚙️' },
];

// ── 文章清單（未來新增文章只需在此加一筆）──────────────────────
const ARTICLES = [
  {
    id: 'bmc',
    category: 'semiconductor',
    title: 'BMC 與信驊 (ASPEED) 股王解析',
    subtitle: '萬金股王基本面：伺服器的隱形大腦',
    desc: '從帶內/帶外管理架構切入，解析信驊 72% 全球市占率的護城河，以及 AI 機櫃時代創造的 81 倍晶片需求乘數效應。',
    tags: ['信驊', 'BMC', 'IC 設計', 'AI 伺服器', 'SWOT'],
    accentColor: '#06B6D4',
    date: '2026-04-28',
  },
  {
    id: 'delta',
    category: 'ai_infra',
    title: '電源王者台達電(2308)產業深度解析',
    subtitle: '全球電源與散熱霸主：從氣冷到液冷的維度打擊',
    desc: '深度解析高壓直流 (HVDC)、液冷 Sidecar 佈局，與外資投顧上修至 3,000 元的底層邏輯。',
    tags: ['台達電', '電源供應', '液冷散熱', 'AI 機櫃'],
    accentColor: '#22D3EE',
    date: '2026-05-18',
  },
  {
    id: 'globalwafers',
    category: 'semiconductor',
    title: '矽晶圓巨頭環球晶(6488)產業深度解析',
    subtitle: '半導體上游霸主：長約護城河與先進製程紅利',
    desc: '解析環球晶在全球矽晶圓版圖的戰略地位、LTA 長約保護傘，與受惠於先進製程的成長動能。',
    tags: ['環球晶', '矽晶圓', '半導體', '長約'],
    accentColor: '#F59E0B',
    date: '2026-05-18',
  },
  {
    id: 'bizlink',
    category: 'ai_infra',
    title: '線束龍頭貿聯-KY(3665)產業深度解析',
    subtitle: 'AI 伺服器的高速神經網路',
    desc: '從電動車跨足 AI，解析貿聯在伺服器高速傳輸線束的寡占地位與強勁爆發力。',
    tags: ['貿聯-KY', '高速線束', 'AI 伺服器'],
    accentColor: '#A78BFA',
    date: '2026-05-18',
  },
  // 未來在此新增更多文章：
  // { id: 'xxx', category: 'ai_infra', title: '...', ... }
];

// ── 類別色彩對應 ──────────────────────────────────────────────
const CAT_COLOR = {
  semiconductor: '#22D3EE',
  ai_infra:      '#A78BFA',
  macro:         '#34D399',
  software:      '#F59E0B',
  all:           '#60A5FA',
};

export default function IndustryIndex() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 篩選邏輯
  const filtered = ARTICLES.filter(a => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)) || a.desc.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '4rem' }}>

      {/* Section Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          marginBottom: '0.4rem',
        }}>
          產業深度分析
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          從產業結構、競爭格局到財務數據，透過互動圖表深入理解投資邏輯。
        </p>
      </div>

      {/* 搜尋列 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '0.6rem 1rem', marginBottom: '1.5rem',
      }}>
        <Search size={16} color="#475569" />
        <input
          type="text"
          placeholder="搜尋文章標題、標籤..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#F1F5F9', fontSize: '0.9rem',
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        )}
      </div>

      {/* 分類 Tab 列 */}
      <div style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem',
        paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all' ? ARTICLES.length : ARTICLES.filter(a => a.category === cat.id).length;
          if (count === 0 && cat.id !== 'all') return null; // 沒文章就不顯示分類
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '0.4rem 0.9rem', borderRadius: '8px',
                fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.15s',
                background: isActive ? `${CAT_COLOR[cat.id]}18` : 'rgba(255,255,255,0.04)',
                border: isActive ? `1px solid ${CAT_COLOR[cat.id]}60` : '1px solid rgba(255,255,255,0.07)',
                color: isActive ? CAT_COLOR[cat.id] : '#64748B',
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span style={{
                background: isActive ? `${CAT_COLOR[cat.id]}28` : 'rgba(255,255,255,0.07)',
                color: isActive ? CAT_COLOR[cat.id] : '#475569',
                borderRadius: '999px', padding: '0 6px', fontSize: '0.72rem', fontWeight: 700,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* 文章列表 */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(article => {
            const catInfo = CATEGORIES.find(c => c.id === article.category);
            return (
              <button
                key={article.id}
                onClick={() => navigate(`/industry/${article.id}`)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `4px solid ${article.accentColor}`,
                  borderRadius: '12px', padding: '1.4rem 1.6rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(30,41,59,0.7)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.borderColor = article.accentColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(17,24,39,0.6)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderLeftColor = article.accentColor;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    {/* 分類標籤 + 文章標籤 */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.7rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* 分類 badge */}
                      <span style={{
                        fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                        background: `${CAT_COLOR[article.category]}18`,
                        color: CAT_COLOR[article.category],
                        border: `1px solid ${CAT_COLOR[article.category]}40`,
                        display: 'flex', alignItems: 'center', gap: '3px',
                      }}>
                        <Tag size={9} /> {catInfo?.label}
                      </span>
                      {/* 文章標籤 */}
                      {article.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4,
                          background: `${article.accentColor}10`, color: article.accentColor,
                          border: `1px solid ${article.accentColor}30`, fontWeight: 600,
                        }}>{tag}</span>
                      ))}
                    </div>

                    {/* 標題 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <BookOpen size={16} color={article.accentColor} />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{article.title}</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.4rem' }}>{article.subtitle}</p>
                    <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{article.desc}</p>
                    <p style={{ fontSize: '0.72rem', color: '#334155', marginTop: '0.65rem' }}>發布：{article.date}</p>
                  </div>
                  <ChevronRight size={18} color="#334155" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#334155' }}>
          <Search size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <p style={{ fontSize: '0.9rem' }}>沒有符合條件的文章</p>
          <button onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            清除篩選
          </button>
        </div>
      )}

      {/* 佔位：更多文章即將推出 */}
      <div style={{
        marginTop: '1.25rem', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '12px',
        padding: '1.25rem', textAlign: 'center', color: '#334155',
      }}>
        <TrendingUp size={20} style={{ margin: '0 auto 0.4rem', opacity: 0.35, display: 'block' }} />
        <p style={{ fontSize: '0.82rem' }}>更多產業分析即將推出</p>
      </div>

    </div>
  );
}
