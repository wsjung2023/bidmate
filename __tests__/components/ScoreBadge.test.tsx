import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

describe('ScoreBadge', () => {
  test('고점수(≥70) → high 레벨', () => {
    render(<ScoreBadge score={85} />)
    const badge = screen.getByText('85점')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-score-level', 'high')
  })

  test('중점수(50-69) → mid 레벨', () => {
    render(<ScoreBadge score={62} />)
    expect(screen.getByText('62점')).toHaveAttribute('data-score-level', 'mid')
  })

  test('저점수(<50) → low 레벨', () => {
    render(<ScoreBadge score={40} />)
    expect(screen.getByText('40점')).toHaveAttribute('data-score-level', 'low')
  })

  test('미분석(null) → none 레벨 + 미분석 텍스트', () => {
    render(<ScoreBadge score={null} />)
    const badge = screen.getByText('미분석')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-score-level', 'none')
  })
})
