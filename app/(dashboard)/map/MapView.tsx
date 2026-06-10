'use client'

import { useState } from 'react'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import Link from 'next/link'
import { PROPERTY_ICONS, PROPERTY_TYPE_LABEL, LISTING_TYPE_LABEL } from '@/lib/labels'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

export type MapListing = {
  id: string
  address: string
  propertyType: string
  listingType: string
  minimumBid: bigint
  appraisalValue: bigint
  area: number | null
  auctionDate: Date | null
  auctionCount: number
  court: string | null
  latitude: number | null
  longitude: number | null
  score: number | null
}

function MarkerCard({
  listing,
  selected,
  onClick,
}: {
  listing: MapListing
  selected: boolean
  onClick: () => void
}) {
  const score = listing.score
  const accent =
    score == null ? '#94A3B8' : score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const icon = PROPERTY_ICONS[listing.propertyType] ?? '📍'
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)

  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', userSelect: 'none', transform: 'translateY(-100%)', marginBottom: 8 }}
    >
      <div
        style={{
          background: selected ? accent : 'white',
          border: `2.5px solid ${accent}`,
          borderRadius: 12,
          padding: '5px 9px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          boxShadow: selected ? `0 4px 20px ${accent}40` : '0 2px 8px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          position: 'relative',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: selected ? 'white' : '#1E293B',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {priceEok}억
        </span>
        {score != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'white',
              background: selected ? 'rgba(255,255,255,0.3)' : accent,
              borderRadius: 20,
              padding: '1px 5px',
            }}
          >
            {score}
          </span>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 10,
            height: 10,
            background: selected ? accent : 'white',
            borderRight: `2.5px solid ${accent}`,
            borderBottom: `2.5px solid ${accent}`,
          }}
        />
      </div>
    </div>
  )
}

function ListingPanel({ listing, onClose }: { listing: MapListing; onClose: () => void }) {
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
  const appraisalEok = (Number(listing.appraisalValue) / 1e8).toFixed(1)
  const appraisalNum = Number(listing.appraisalValue)
  const discount =
    appraisalNum > 0
      ? Math.round(((appraisalNum - Number(listing.minimumBid)) / appraisalNum) * 100)
      : 0
  const icon = PROPERTY_ICONS[listing.propertyType] ?? '📍'

  return (
    <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10">
      <div className="bg-gradient-to-r from-indigo-50 to-white px-4 py-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800 mb-3 leading-snug">{listing.address}</p>

        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{priceEok}억</p>
            <p className="text-xs text-slate-400 mt-1">감정가 {appraisalEok}억</p>
          </div>
          <div className="text-right">
            {discount > 0 && (
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                {discount}% 할인
              </span>
            )}
            <div className="mt-1">
              <ScoreBadge score={listing.score} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
          {listing.area && <span>{listing.area.toFixed(0)}m²</span>}
          {listing.auctionCount > 0 && (
            <span className="text-orange-500">{listing.auctionCount}회 유찰</span>
          )}
          {listing.court && <span>{listing.court}</span>}
        </div>

        <Link
          href={`/listings/${listing.id}`}
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          상세 보기 →
        </Link>
      </div>
    </div>
  )
}

export function MapView({ listings }: { listings: MapListing[] }) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? '',
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const mappableListings = listings.filter((l) => l.latitude != null && l.longitude != null)
  const selectedListing = listings.find((l) => l.id === selectedId) ?? null

  const center =
    mappableListings.length > 0
      ? {
          lat: mappableListings.reduce((s, l) => s + l.latitude!, 0) / mappableListings.length,
          lng: mappableListings.reduce((s, l) => s + l.longitude!, 0) / mappableListings.length,
        }
      : { lat: 36.5, lng: 127.9 }

  const filteredListings = searchQuery
    ? listings.filter((l) => l.address.toLowerCase().includes(searchQuery.toLowerCase()))
    : listings

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-100 rounded-2xl">
        <p className="text-slate-500 text-sm">지도를 불러올 수 없습니다. API 키를 확인하세요.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        <div className="sticky top-0 bg-slate-50 pb-2 z-10">
          <input
            type="text"
            placeholder="주소 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1 px-1">{filteredListings.length}건</p>
        </div>

        {filteredListings.map((listing) => {
          const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
          const appraisalNum = Number(listing.appraisalValue)
          const discount =
            appraisalNum > 0
              ? Math.round(((appraisalNum - Number(listing.minimumBid)) / appraisalNum) * 100)
              : 0
          const isSelected = listing.id === selectedId
          const icon = PROPERTY_ICONS[listing.propertyType] ?? '📍'

          return (
            <button
              key={listing.id}
              onClick={() => setSelectedId(isSelected ? null : listing.id)}
              className={`w-full text-left bg-white rounded-2xl border-2 p-3 transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-400 shadow-md bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs text-slate-500">
                    {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                  </span>
                </div>
                <ScoreBadge score={listing.score} />
              </div>
              <p className="text-xs font-medium text-slate-700 line-clamp-1 mb-1.5">
                {listing.address}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{priceEok}억</span>
                {discount > 0 && (
                  <span className="text-xs font-bold text-indigo-600">{discount}% 할인</span>
                )}
              </div>
            </button>
          )
        })}

        {filteredListings.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">검색 결과 없음</p>
        )}
      </div>

      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-200">
        {loading ? (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <div className="text-slate-400 text-sm flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              지도 로딩 중...
            </div>
          </div>
        ) : (
          <Map center={center} style={{ width: '100%', height: '100%' }} level={8}>
            {mappableListings.map((listing) => (
              <CustomOverlayMap
                key={listing.id}
                position={{ lat: listing.latitude!, lng: listing.longitude! }}
                yAnchor={1.25}
              >
                <MarkerCard
                  listing={listing}
                  selected={listing.id === selectedId}
                  onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)}
                />
              </CustomOverlayMap>
            ))}
          </Map>
        )}

        {selectedListing && (
          <ListingPanel listing={selectedListing} onClose={() => setSelectedId(null)} />
        )}

        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200">
            📍 {mappableListings.length}개 지도 표시
          </div>
        </div>
      </div>
    </div>
  )
}
