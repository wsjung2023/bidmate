export function ScoreBadge({ score, size = 'sm' }: { score: number | null; size?: 'sm' | 'lg' }) {
  const base = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'

  if (score === null) {
    return (
      <span data-score-level="none" className={`${base} font-medium text-slate-400 bg-slate-100 rounded-full`}>
        미분석
      </span>
    )
  }

  const level = score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low'
  const colorCls =
    level === 'high'
      ? 'bg-emerald-100 text-emerald-700'
      : level === 'mid'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-600'

  return (
    <span data-score-level={level} className={`${base} font-bold rounded-full ${colorCls}`}>
      {score}점
    </span>
  )
}
