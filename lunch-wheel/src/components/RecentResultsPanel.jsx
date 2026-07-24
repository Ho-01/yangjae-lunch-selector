import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import StateMessage from './StateMessage'

function modeLabel(mode) {
  if (mode === 'nearby') return '내 주변'
  if (mode === 'room') return '같이 고르기'
  return '팀 메뉴'
}

export default function RecentResultsPanel({
  results,
  reduceRecent,
  disabled,
  onToggleReduce,
  onClear,
}) {
  return (
    <section className="card side-card recent-results-card">
      <div className="recent-results-head">
        <div>
          <h2>최근 결과</h2>
          <p className="desc">최근 10개 결과는 이 기기에만 저장됩니다.</p>
        </div>
        <label className="switch-control recent-switch">
          <Switch
            className="app-switch"
            checked={reduceRecent}
            disabled={disabled}
            onCheckedChange={onToggleReduce}
            aria-label="최근 메뉴 덜 나오게"
          />
          <strong>최근 메뉴 덜 나오게</strong>
        </label>
      </div>
      {!results.length ? (
        <StateMessage
          compact
          title="아직 결과가 없습니다"
          description="룰렛을 돌리면 최근 선택이 여기에 기록됩니다."
        />
      ) : (
        <>
          <ol className="recent-results-list">
            {results.map((result) => (
              <li key={result.id}>
                <div>
                  <strong>{result.name}</strong>
                  <span>{modeLabel(result.mode)}</span>
                </div>
                <time dateTime={result.createdAt}>
                  {new Date(result.createdAt).toLocaleString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ol>
          <Button type="button" className="btn ghost recent-clear" onClick={onClear}>
            기록 전체 삭제
          </Button>
        </>
      )}
    </section>
  )
}
