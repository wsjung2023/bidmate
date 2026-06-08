import { sendTelegramMessage, formatListingAlert } from '@/lib/notifications/telegram'

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ ok: true, result: { message_id: 1 } }),
}) as jest.Mock

describe('sendTelegramMessage', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    jest.clearAllMocks()
  })

  it('sends message via Telegram Bot API', async () => {
    await sendTelegramMessage('123456789', 'Hello from test')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"chat_id":"123456789"'),
      })
    )
  })

  it('does not throw when token is missing', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    await expect(sendTelegramMessage('123', 'test')).resolves.not.toThrow()
  })
})

describe('formatListingAlert', () => {
  it('formats a listing alert message', () => {
    const msg = formatListingAlert({
      address: '강원도 평창군',
      listingType: 'AUCTION',
      propertyType: 'PENSION',
      minimumBid: 595_000_000,
      score: 78,
      recommendation: 'BUY',
      reportUrl: 'http://localhost/reports/r-1',
    })
    expect(msg).toContain('강원도 평창군')
    expect(msg).toContain('78점')
    expect(msg).toContain('매수')
  })
})
