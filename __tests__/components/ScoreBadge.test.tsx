import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

describe('ScoreBadge', () => {
  test('고점수(≥70) → 녹색 배지', () => {
    render(<ScoreBadge score={85} />)
    const badge = screen.getByText('85점')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('emerald')
  })

  test('중점수(50-69) → 주황 배지', () => {
    render(<ScoreBadge score={62} />)
    const badge = screen.getByText('62점')
    expect(badge.className).toContain('amber')
  })

  test('저점수(<50) → 빨간 배지', () => {
    render(<ScoreBadge score={40} />)
    expect(screen.getByText('40점').className).toContain('red')
  })

  test('미분석(null) → 회색 배지', () => {
    render(<ScoreBadge score={null} />)
    expect(screen.getByText('미분석')).toBeInTheDocument()
  })
})
