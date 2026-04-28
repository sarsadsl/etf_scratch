import { BookOpen, TrendingUp, ChevronRight } from 'lucide-react';

// 文章清單（未來持續新增）
const ARTICLES = [
  {
    id: 'bmc',
    title: 'BMC 與信驊 (ASPEED) 股王解析',
    subtitle: '伺服器的隱形大腦',
    desc: '深度解析 Baseboard Management Controller 的技術架構，以及信驊科技如何憑藉 72% 全球市占率成為台股股王。',
    tags: ['半導體', 'IC 設計', 'AI 伺服器', '台股'],
    color: '#06B6D4',
    date: '2026-04-28',
  },
  // 未來在此新增更多文章
];

export default function IndustryIndex({ onSelectArticle }) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '4rem' }}>

      {/* Section Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          marginBottom: '0.5rem',
        }}>
          產業深度分析
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          從產業結構、競爭格局到財務數據，透過互動圖表深入理解投資邏輯。
        </p>
      </div>

      {/* 文章卡片列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {ARTICLES.map(article => (
          <button
            key={article.id}
            onClick={() => onSelectArticle(article.id)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(20px)',
              border: `1px solid rgba(255,255,255,0.1)`,
              borderLeft: `4px solid ${article.color}`,
              borderRadius: '12px', padding: '1.5rem 1.75rem',
              transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = article.color;
              e.currentTarget.style.background = 'rgba(30,41,59,0.7)';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.background = 'rgba(17,24,39,0.6)';
              e.currentTarget.style.borderLeftColor = article.color;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                {/* 分類標籤 */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {article.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                      background: `${article.color}18`, color: article.color,
                      border: `1px solid ${article.color}40`, fontWeight: 600,
                    }}>{tag}</span>
                  ))}
                </div>
                {/* 標題 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <BookOpen size={18} color={article.color} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {article.title}
                  </h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {article.subtitle}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.65 }}>
                  {article.desc}
                </p>
                {/* 日期 */}
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.75rem' }}>
                  發布日期：{article.date}
                </p>
              </div>
              {/* 箭頭 */}
              <div style={{ display: 'flex', alignItems: 'center', color: '#475569', flexShrink: 0, paddingTop: '0.25rem' }}>
                <ChevronRight size={20} />
              </div>
            </div>
          </button>
        ))}

        {/* 佔位：更多文章即將推出 */}
        <div style={{
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px',
          padding: '1.5rem', textAlign: 'center', color: '#475569',
        }}>
          <TrendingUp size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>更多產業分析即將推出...</p>
        </div>
      </div>
    </div>
  );
}
