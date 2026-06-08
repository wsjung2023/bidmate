const RECO_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수 🟢🟢',
  BUY: '매수 🟢',
  NEUTRAL: '중립 🟡',
  PASS: '보류 ⚪',
  AVOID: '기피 🔴',
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — skipping notification')
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      console.error('Telegram API error:', body)
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}

type AlertData = {
  address: string
  listingType: string
  propertyType: string
  minimumBid: number
  score: number
  recommendation: string
  reportUrl: string
}

export function formatListingAlert(data: AlertData): string {
  const bidBillion = (data.minimumBid / 100_000_000).toFixed(1)
  const typeLabel = { AUCTION: '경매', PUBLIC_SALE: '공매', LODGING_LEASE: '숙박임차' }[data.listingType] ?? data.listingType
  const recoLabel = RECO_LABEL[data.recommendation] ?? data.recommendation

  return [
    `🏠 *새 투자 매물 발견*`,
    ``,
    `📍 ${data.address}`,
    `🏷️ ${typeLabel} | ${data.propertyType}`,
    `💰 최저입찰가: *${bidBillion}억원*`,
    `⭐ 종합 점수: *${data.score}점*`,
    `📊 투자 의견: ${recoLabel}`,
    ``,
    `[보고서 보기](${data.reportUrl})`,
  ].join('\n')
}

export async function notifyHighScoreListings(
  listings: AlertData[],
  chatId: string,
  minScore: number = 70,
): Promise<void> {
  const highScore = listings.filter((l) => l.score >= minScore)
  for (const listing of highScore) {
    const msg = formatListingAlert(listing)
    await sendTelegramMessage(chatId, msg)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
