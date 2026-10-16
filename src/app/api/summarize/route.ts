import { MAX_SUMMARY_INPUT_LENGTH, MIN_SUMMARY_LENGTH } from '@/utils/summary'

const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const REQUEST_TIMEOUT_MS = 15000
const RETRY_DELAYS_MS = [1000, 2000]
const RETRYABLE_STATUSES = [429, 503]

interface SummarizeRequestBody {
  title?: unknown
  content?: unknown
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status })

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 일시적 과부하(429, 503)는 짧게 대기한 뒤 재시도한다.
async function fetchWithRetry(url: string, init: RequestInit) {
  let response = await fetch(url, init)
  for (const delay of RETRY_DELAYS_MS) {
    if (!RETRYABLE_STATUSES.includes(response.status)) break
    await sleep(delay)
    response = await fetch(url, init)
  }
  return response
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured')
    return errorResponse('서버에 AI 요약 설정이 되어 있지 않습니다.', 500)
  }

  let body: SummarizeRequestBody
  try {
    body = await request.json()
  } catch {
    return errorResponse('잘못된 요청입니다.', 400)
  }

  const title = typeof body.title === 'string' ? body.title : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (content.length < MIN_SUMMARY_LENGTH) {
    return errorResponse(
      `요약하려면 본문이 ${MIN_SUMMARY_LENGTH}자 이상이어야 합니다.`,
      400
    )
  }
  if (title.length + content.length > MAX_SUMMARY_INPUT_LENGTH) {
    return errorResponse('메모가 너무 길어 요약할 수 없습니다.', 413)
  }

  try {
    const response = await fetchWithRetry(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: '사용자가 제공하는 메모를 한국어로 2~3문장으로 간결하게 요약하라. 요약문만 출력하고, 머리말이나 목록 기호, 마크다운 서식은 사용하지 않는다.',
            },
          ],
        },
        contents: [
          {
            parts: [{ text: `제목: ${title}\n\n본문:\n${content}` }],
          },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.status === 429 || response.status === 503) {
      return errorResponse(
        'AI 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.',
        response.status
      )
    }
    if (!response.ok) {
      console.error('Gemini API error status:', response.status)
      return errorResponse('AI 요약 요청에 실패했습니다.', 502)
    }

    const data: GeminiResponse = await response.json()
    const summary = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text ?? '')
      .join('')
      .trim()

    if (!summary) {
      return errorResponse('AI가 요약 결과를 반환하지 않았습니다.', 502)
    }

    return Response.json({ summary })
  } catch (error) {
    console.error('Gemini API request failed:', error)
    return errorResponse('AI 요약 요청에 실패했습니다.', 502)
  }
}
