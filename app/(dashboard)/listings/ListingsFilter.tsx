'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function ListingsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/listings?${params.toString()}`)
  }, [router, searchParams])

  const q = searchParams.get('q') ?? ''
  const type = searchParams.get('type') ?? ''
  const propertyType = searchParams.get('propertyType') ?? ''
  const score = searchParams.get('score') ?? ''
  const sort = searchParams.get('sort') ?? ''

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
      {/* 키워드 검색 */}
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue={q}
          placeholder="주소 검색 (예: 강원도, 제주)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') update('q', (e.target as HTMLInputElement).value.trim())
          }}
          onBlur={(e) => update('q', e.target.value.trim())}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 필터 행 */}
      <div className="flex flex-wrap gap-2">
        {/* 매물 유형 */}
        <select
          value={type}
          onChange={(e) => update('type', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">전체 유형</option>
          <option value="AUCTION">경매</option>
          <option value="PUBLIC_SALE">공매</option>
          <option value="LODGING_LEASE">숙박임차</option>
        </select>

        {/* 물건 종류 */}
        <select
          value={propertyType}
          onChange={(e) => update('propertyType', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">전체 종류</option>
          <option value="HOTEL">호텔</option>
          <option value="PENSION">펜션</option>
          <option value="GUESTHOUSE">게스트하우스</option>
          <option value="MOTEL">모텔</option>
          <option value="RESORT">리조트</option>
          <option value="BUILDING">건물</option>
          <option value="LAND">토지</option>
          <option value="OTHER">기타</option>
        </select>

        {/* AI 점수 */}
        <select
          value={score}
          onChange={(e) => update('score', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">전체 점수</option>
          <option value="analyzed">분석 완료만</option>
          <option value="high">고점수 (70+)</option>
          <option value="mid">중점수 (50-69)</option>
          <option value="low">저점수 (50 미만)</option>
          <option value="none">미분석</option>
        </select>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => update('sort', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">점수 높은 순</option>
          <option value="recent">최신 순</option>
          <option value="bid_asc">입찰가 낮은 순</option>
          <option value="bid_desc">입찰가 높은 순</option>
          <option value="discount">할인율 높은 순</option>
        </select>

        {/* 초기화 */}
        {(q || type || propertyType || score || sort) && (
          <button
            onClick={() => router.push('/listings')}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  )
}
