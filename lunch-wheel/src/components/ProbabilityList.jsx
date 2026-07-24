import StateMessage from './StateMessage'

export default function ProbabilityList({ items, weather, reduceRecent }) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)

  let body
  if (!items.length) {
    body = (
      <StateMessage
        compact
        title="추첨할 메뉴가 없습니다"
        description="제외 메뉴를 해제하거나 새 메뉴를 추가해주세요."
      />
    )
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
                {item.recentPenalty ? <small>최근 결과 감산</small> : null}
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
          ? `날씨 가중치${reduceRecent ? ' · 최근 결과 감산' : ''} 반영 · 활성 메뉴 ${items.length}개 중 상위 8개`
          : items.length
            ? `${reduceRecent ? '최근 결과 감산 반영' : '기본 확률'} · 활성 메뉴 ${items.length}개 중 상위 8개`
            : '현재 날씨와 제외 목록을 기준으로 계산한 상위 메뉴입니다.'}
      </p>
      {body}
    </section>
  )
}
