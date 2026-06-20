'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  calcForBid,
  calcMaxBid,
  buildSimulation,
  verdict,
  type BidCalculatorInput,
} from '@/lib/finance/bid-calculator'

export type SavedCalc = {
  id: string
  label: string | null
  bidPrice: string
  maxBid: string
  roi: number
  winRate: number
  createdAt: string
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const pct = (n: number) => `${(n * 100).toFixed(2)}%`
const eok = (n: number) => `${(n / 100_000_000).toFixed(2)}억원`
const pctValue = (d: number) => Math.round(d * 10000) / 100

function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
    </label>
  )
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          value={pctValue(value)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="w-full border rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
      </div>
    </label>
  )
}

export function BidCalculator({
  listingId,
  initialInputs,
  savedCalculations,
}: {
  listingId: string
  initialInputs: BidCalculatorInput
  savedCalculations: SavedCalc[]
}) {
  const [inputs, setInputs] = useState<BidCalculatorInput>(initialInputs)
  const [bidOverride, setBidOverride] = useState<number | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const set = (patch: Partial<BidCalculatorInput>) => setInputs((prev) => ({ ...prev, ...patch }))

  const maxBid = useMemo(() => calcMaxBid(inputs), [inputs])
  const effectiveBid = bidOverride ?? Math.round(maxBid)
  const atBid = useMemo(() => calcForBid(inputs, effectiveBid), [inputs, effectiveBid])
  const simulation = useMemo(() => buildSimulation(inputs), [inputs])

  const margin = maxBid - inputs.minimumBid // 최저가 대비 여유/부족
  const profitable = atBid.roi >= inputs.targetRoi

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/listings/${listingId}/bid-calculations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inputs, bidPrice: effectiveBid }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? '저장 실패')
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const simRows: { label: string; render: (i: number) => string; color?: (i: number) => string }[] = [
    { label: '낙찰가율', render: (i) => pct(simulation[i].winRate) },
    { label: '입찰가', render: (i) => won(simulation[i].bidPrice) },
    { label: '입찰보증금', render: (i) => won(simulation[i].deposit) },
    { label: '대출금', render: (i) => won(simulation[i].loanAmount) },
    { label: '취득비용', render: (i) => won(simulation[i].acquisitionCost) },
    { label: '보유비용', render: (i) => won(simulation[i].holdingCost) },
    { label: '양도비용', render: (i) => won(simulation[i].transferCost) },
    { label: '매매차익', render: (i) => won(simulation[i].saleProfit) },
    { label: '양도세', render: () => won(inputs.transferTax) },
    {
      label: '세후손익',
      render: (i) => won(simulation[i].netProfit),
      color: (i) => (simulation[i].netProfit >= 0 ? 'text-green-600' : 'text-red-500'),
    },
    { label: '투자금', render: (i) => won(simulation[i].investment) },
    {
      label: '수익률',
      render: (i) => pct(simulation[i].roi),
      color: (i) => (simulation[i].roi >= inputs.targetRoi ? 'text-green-600' : simulation[i].roi >= 0 ? 'text-gray-700' : 'text-red-500'),
    },
    { label: '판정', render: (i) => simulation[i].verdict },
  ]

  return (
    <div className="bg-white rounded-xl border p-6 mb-4">
      <h2 className="text-base font-semibold text-gray-900 mb-1">적정 입찰가 계산기</h2>
      <p className="text-xs text-gray-400 mb-5">
        낙찰 후 재매각(flip) 기준. 입력값을 바꾸면 즉시 재계산됩니다.
      </p>

      {/* 결론 카드 */}
      <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-5 mb-6">
        <p className="text-xs text-gray-500 mb-1">목표수익률 {pct(inputs.targetRoi)} 기준 최대입찰가</p>
        <p className="text-3xl font-bold text-blue-700">{won(maxBid)}원</p>
        <p className="text-sm text-gray-500 mt-0.5">{eok(maxBid)}</p>
        <p className={`text-sm font-medium mt-2 ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          최저가 대비 {margin >= 0 ? '여유' : '부족'} {won(Math.abs(margin))}원
          {margin < 0 && ' — 목표수익률 달성 어려움'}
        </p>
      </div>

      {/* 선택 입찰가 + 결과 */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">평가 입찰가</span>
            <button
              type="button"
              onClick={() => setBidOverride(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              목표가로 리셋
            </button>
          </div>
          <input
            type="number"
            value={effectiveBid}
            onChange={(e) => setBidOverride(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">감정가 대비 낙찰가율 {pct(atBid.winRate)}</p>
        </div>

        <div className="rounded-lg border p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <span className="text-gray-500">예상 대출금</span>
          <span className="text-right text-gray-900">{won(atBid.loanAmount)}</span>
          <span className="text-gray-500">필요 투자금</span>
          <span className="text-right text-gray-900">{won(atBid.investment)}</span>
          <span className="text-gray-500">세후손익</span>
          <span className={`text-right font-medium ${atBid.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {won(atBid.netProfit)}
          </span>
          <span className="text-gray-500">예상 수익률</span>
          <span className={`text-right font-bold ${profitable ? 'text-green-600' : 'text-red-500'}`}>
            {pct(atBid.roi)}
          </span>
          <span className="text-gray-500">판정</span>
          <span className={`text-right font-medium ${profitable ? 'text-green-600' : 'text-gray-700'}`}>
            {verdict(atBid.roi, inputs.targetRoi)}
          </span>
        </div>
      </div>

      {/* 주요 입력 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <MoneyField label="감정가" value={inputs.appraisalValue} onChange={(v) => set({ appraisalValue: v })} hint={eok(inputs.appraisalValue)} />
        <MoneyField label="최저가" value={inputs.minimumBid} onChange={(v) => set({ minimumBid: v })} hint={eok(inputs.minimumBid)} />
        <MoneyField label="희망매도가" value={inputs.targetSalePrice} onChange={(v) => set({ targetSalePrice: v })} hint={eok(inputs.targetSalePrice)} />
        <PercentField label="목표 수익률" value={inputs.targetRoi} onChange={(v) => set({ targetRoi: v })} />
        <PercentField label="대출비율" value={inputs.loanRatio} onChange={(v) => set({ loanRatio: v })} />
        <PercentField label="대출금리(연)" value={inputs.loanRate} onChange={(v) => set({ loanRate: v })} />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        {showAdvanced ? '▾ 고급 설정 숨기기' : '▸ 고급 설정 (세금·비용·시뮬레이션)'}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <MoneyField label="이자기간(개월)" value={inputs.loanMonths} onChange={(v) => set({ loanMonths: v })} />
          <PercentField label="보증금률" value={inputs.depositRate} onChange={(v) => set({ depositRate: v })} />
          <PercentField label="중도상환수수료율" value={inputs.prepaymentFeeRate} onChange={(v) => set({ prepaymentFeeRate: v })} />
          <MoneyField label="대출 기타부대비용" value={inputs.loanExtraCost} onChange={(v) => set({ loanExtraCost: v })} />
          <PercentField label="취득세율" value={inputs.acquisitionTaxRate} onChange={(v) => set({ acquisitionTaxRate: v })} />
          <MoneyField label="법무비" value={inputs.legalFee} onChange={(v) => set({ legalFee: v })} />
          <MoneyField label="법원수수료" value={inputs.courtFee} onChange={(v) => set({ courtFee: v })} />
          <MoneyField label="미납관리비" value={inputs.unpaidMgmtFee} onChange={(v) => set({ unpaidMgmtFee: v })} />
          <MoneyField label="보관관리비" value={inputs.storageMgmtFee} onChange={(v) => set({ storageMgmtFee: v })} />
          <MoneyField label="명도비/이사비" value={inputs.evictionCost} onChange={(v) => set({ evictionCost: v })} />
          <MoneyField label="수리비" value={inputs.repairCost} onChange={(v) => set({ repairCost: v })} />
          <MoneyField label="기타 보유비" value={inputs.otherHoldingCost1} onChange={(v) => set({ otherHoldingCost1: v })} />
          <MoneyField label="기타 보유비2" value={inputs.otherHoldingCost2} onChange={(v) => set({ otherHoldingCost2: v })} />
          <PercentField label="중개수수료율" value={inputs.brokerageRate} onChange={(v) => set({ brokerageRate: v })} />
          <MoneyField label="양도세/기타세금" value={inputs.transferTax} onChange={(v) => set({ transferTax: v })} />
          <PercentField label="기준 낙찰가율" value={inputs.baseWinRate} onChange={(v) => set({ baseWinRate: v })} />
          <PercentField label="시뮬레이션 변동단위" value={inputs.stepUnit} onChange={(v) => set({ stepUnit: v })} />
        </div>
      )}

      {/* 시뮬레이션 표 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">낙찰가율별 시뮬레이션</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {simRows.map((row, ri) => (
                <tr key={row.label} className={ri === 0 ? 'bg-gray-100' : 'border-b'}>
                  <td className="px-2 py-1.5 font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-inherit">
                    {row.label}
                  </td>
                  {simulation.map((_, ci) => (
                    <td
                      key={ci}
                      className={`px-2 py-1.5 text-right whitespace-nowrap ${ci === 3 ? 'bg-blue-50/60 font-medium' : ''} ${row.color?.(ci) ?? 'text-gray-700'}`}
                    >
                      {row.render(ci)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 저장 */}
      <div className="flex items-center gap-3 border-t pt-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '저장 중...' : '이 계산 저장'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ 저장되었습니다</span>}
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>

      {savedCalculations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">저장된 계산</h3>
          <ul className="divide-y border rounded-lg">
            {savedCalculations.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-600">
                  {new Date(c.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                  {c.label && ` · ${c.label}`}
                </span>
                <span className="text-gray-900">
                  입찰가 {won(Number(c.bidPrice))}원
                  <span className={`ml-2 font-medium ${c.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pct(c.roi)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
