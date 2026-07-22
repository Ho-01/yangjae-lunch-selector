export default function ProbabilityList({ items, weather }) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)

  let body
  if (!items.length) {
    body = <div className="empty-hint">활성 메뉴가 없습니다.</div>
  } else {
    const ranked = items
      .map((item) => ({ ...item, pct: (item.weight / total) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8)
    const max = ranked[0]?.pct || 1

    body = (
      <div className="prob-box">
        {ranked.map((item, index) => (
          <div className="prob-row" key={item.id}>
            <span className="rank-mark">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <div className="prob-label">
                <strong>{item.name}</strong>
              </div>
              <div className="bar">
                <i style={{ width: `${((item.pct / max) * 100).toFixed(1)}%` }} />
              </div>
            </div>
            <div className="pct">{item.pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="card side-card">
      <h2>현재 당첨 확률</h2>
      <p className="desc">
        {weather
          ? `날씨 가중치 반영 · 활성 메뉴 ${items.length}개 중 상위 8개`
          : items.length
            ? `기본 확률 · 활성 메뉴 ${items.length}개 중 상위 8개`
            : '현재 날씨와 제외 목록을 기준으로 계산한 상위 메뉴입니다.'}
      </p>
      {body}
    </section>
  )
}
