import { prisma } from '@/lib/db/prisma'
import { ListingType, PropertyType } from '@prisma/client'

const BASE_URL = 'https://www.courtauction.go.kr/pgj'
const HEADERS = {
  'accept': 'application/json',
  'content-type': 'application/json;charset=UTF-8',
  'referer': 'https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'submissionid': 'mf_wfm_mainFrame_sbm_selectGdsDtlSrch',
  'sc-userid': 'SYSTEM',
  'origin': 'https://www.courtauction.go.kr',
}

// 숙박시설 관련 용도 코드
const LODGING_CATEGORIES = [
  { lclsUtilCd: '20000', mclsUtilCd: '21100', sclsUtilCd: '21112', label: '숙박시설' },
  { lclsUtilCd: '20000', mclsUtilCd: '21100', sclsUtilCd: '21120', label: '관광휴게시설' },
  { lclsUtilCd: '20000', mclsUtilCd: '21030', sclsUtilCd: '21033', label: '단독주택(펜션류)' },
]

interface CourtAuctionItem {
  docid: string
  saNo: string
  srnSaNo: string
  jiwonNm: string
  jpDeptNm: string
  gamevalAmt: string
  minmaePrice: string
  yuchalCnt: string
  maeGiil: string
  maeHh1: string
  maePlace: string
  printSt: string
  hjguSido: string
  hjguSigu: string
  hjguDong: string
  buldNm: string
  buldList: string
  pjbBuldList: string
  areaList: string
  minArea: string
  maxArea: string
  dspslUsgNm: string
  wgs84Xcordi: string
  wgs84Ycordi: string
  notifyMinmaePriceRate1: string
  ipchalGbncd: string
  spJogCd: string
  mulBigo: string
}

function toDate(yyyymmdd: string): Date | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null
  const y = parseInt(yyyymmdd.slice(0, 4))
  const m = parseInt(yyyymmdd.slice(4, 6)) - 1
  const d = parseInt(yyyymmdd.slice(6, 8))
  return new Date(y, m, d)
}

function parseArea(pjbBuldList: string): number | null {
  const match = pjbBuldList?.match(/([\d.]+)\s*㎡/)
  return match ? parseFloat(match[1]) : null
}

function parseBuildYear(pjbBuldList: string): number | null {
  // 건축연도는 상세 페이지에서 가져와야 하므로 null 반환
  return null
}

function mapPropertyType(dspslUsgNm: string, sclsUtilCd: string): PropertyType {
  if (sclsUtilCd === '21112') return PropertyType.HOTEL
  if (sclsUtilCd === '21120') return PropertyType.RESORT
  const nm = dspslUsgNm ?? ''
  if (nm.includes('펜션') || nm.includes('민박')) return PropertyType.PENSION
  if (nm.includes('게스트')) return PropertyType.GUESTHOUSE
  if (nm.includes('모텔') || nm.includes('여관') || nm.includes('여인숙')) return PropertyType.MOTEL
  if (nm.includes('호텔')) return PropertyType.HOTEL
  if (nm.includes('리조트') || nm.includes('콘도')) return PropertyType.RESORT
  return PropertyType.OTHER
}

async function searchPage(
  category: typeof LODGING_CATEGORIES[0],
  pageNo: number,
  bidBgngYmd: string,
  bidEndYmd: string,
): Promise<{ items: CourtAuctionItem[]; totalCnt: number }> {
  const body = {
    dma_pageInfo: {
      pageNo,
      pageSize: 20,
      bfPageNo: '',
      startRowNo: '',
      totalCnt: '',
      totalYn: 'Y',
      groupTotalCount: '',
    },
    dma_srchGdsDtlSrchInfo: {
      rletDspslSpcCondCd: '',
      bidDvsCd: '',
      mvprpRletDvsCd: '00031R',
      cortAuctnSrchCondCd: '0004601',
      rprsAdongSdCd: '',
      rprsAdongSggCd: '',
      rprsAdongEmdCd: '',
      rdnmSdCd: '',
      rdnmSggCd: '',
      rdnmNo: '',
      mvprpDspslPlcAdongSdCd: '',
      mvprpDspslPlcAdongSggCd: '',
      mvprpDspslPlcAdongEmdCd: '',
      rdDspslPlcAdongSdCd: '',
      rdDspslPlcAdongSggCd: '',
      rdDspslPlcAdongEmdCd: '',
      cortOfcCd: '',
      jdbnCd: '',
      execrOfcDvsCd: '',
      lclDspslGdsLstUsgCd: category.lclsUtilCd,
      mclDspslGdsLstUsgCd: category.mclsUtilCd,
      sclDspslGdsLstUsgCd: category.sclsUtilCd,
      cortAuctnMbrsId: '',
      aeeEvlAmtMin: '',
      aeeEvlAmtMax: '',
      lwsDspslPrcRateMin: '',
      lwsDspslPrcRateMax: '',
      flbdNcntMin: '',
      flbdNcntMax: '',
      objctArDtsMin: '',
      objctArDtsMax: '',
      mvprpArtclKndCd: '',
      mvprpArtclNm: '',
      mvprpAtchmPlcTypCd: '',
      notifyLoc: 'off',
      lafjOrderBy: '',
      pgmId: 'PGJ151F01',
      csNo: '',
      cortStDvs: '1',
      statNum: 1,
      bidBgngYmd,
      bidEndYmd,
      dspslDxdyYmd: '',
      fstDspslHm: '',
      scndDspslHm: '',
      thrdDspslHm: '',
      fothDspslHm: '',
      dspslPlcNm: '',
      lwsDspslPrcMin: '',
      lwsDspslPrcMax: '',
      grbxTypCd: '',
      gdsVendNm: '',
      fuelKndCd: '',
      carMdyrMax: '',
      carMdyrMin: '',
      carMdlNm: '',
      sideDvsCd: '',
    },
  }

  const res = await fetch(`${BASE_URL}/pgjsearch/searchControllerMain.on`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const data = json.data
  return {
    items: data.dlt_srchResult ?? [],
    totalCnt: parseInt(data.dma_pageInfo?.totalCnt ?? '0') || 0,
  }
}

export async function collectCourtAuction(): Promise<{ collected: number; skipped: number; errors: number }> {
  const today = new Date()
  const future = new Date(today)
  future.setDate(future.getDate() + 90)

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

  const bidBgngYmd = fmt(today)
  const bidEndYmd = fmt(future)

  let collected = 0
  let skipped = 0
  let errors = 0

  for (const category of LODGING_CATEGORIES) {
    try {
      // 첫 페이지로 전체 건수 파악
      const firstPage = await searchPage(category, 1, bidBgngYmd, bidEndYmd)
      const totalPages = Math.ceil(firstPage.totalCnt / 20)

      console.log(`[court-auction] ${category.label}: 총 ${firstPage.totalCnt}건, ${totalPages}페이지`)

      const allItems: CourtAuctionItem[] = [...firstPage.items]

      // 나머지 페이지 수집
      for (let page = 2; page <= Math.min(totalPages, 50); page++) {
        await new Promise((r) => setTimeout(r, 1000)) // 1초 간격 (서버 부담 방지)
        const pageResult = await searchPage(category, page, bidBgngYmd, bidEndYmd)
        allItems.push(...pageResult.items)
      }

      // DB 저장
      for (const item of allItems) {
        try {
          const externalId = item.docid
          const existing = await prisma.listing.findUnique({ where: { externalId } })
          if (existing) {
            skipped++
            continue
          }

          const appraisalValue = BigInt(item.gamevalAmt || '0')
          const minimumBid = BigInt(item.minmaePrice || '0')
          if (appraisalValue === 0n || minimumBid === 0n) {
            skipped++
            continue
          }

          const area = parseArea(item.pjbBuldList) ?? parseArea(item.areaList)
          const auctionDate = toDate(item.maeGiil)

          await prisma.listing.create({
            data: {
              externalId,
              source: 'court_auction',
              listingType: ListingType.AUCTION,
              propertyType: mapPropertyType(item.dspslUsgNm, category.sclsUtilCd),
              address: item.printSt || `${item.hjguSido} ${item.hjguSigu} ${item.hjguDong}`,
              addressDetail: item.buldNm ? `${item.buldNm} ${item.buldList}`.trim() : item.buldList,
              latitude: item.wgs84Ycordi ? parseFloat(item.wgs84Ycordi) : null,
              longitude: item.wgs84Xcordi ? parseFloat(item.wgs84Xcordi) : null,
              appraisalValue,
              minimumBid,
              area,
              floorInfo: item.buldList || null,
              auctionDate,
              auctionCount: parseInt(item.yuchalCnt || '0'),
              caseNumber: item.srnSaNo,
              court: item.jiwonNm,
              rawData: item as object,
            },
          })
          collected++
        } catch (e) {
          console.error(`[court-auction] 저장 실패 ${item.docid}:`, e)
          errors++
        }
      }
    } catch (e) {
      console.error(`[court-auction] ${category.label} 수집 실패:`, e)
      errors++
    }
  }

  return { collected, skipped, errors }
}
