import { test, expect, Page } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// 서버와 동일하게 .env.local을 읽어 키 존재 여부를 판단한다.
loadEnvConfig(process.cwd())

// 실제 Gemini API를 호출하는 테스트이므로 chromium에서만 실행하고, 키가 없으면 건너뛴다.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  '실제 API 호출 테스트는 chromium에서만 실행'
)
test.skip(!process.env.GEMINI_API_KEY, 'GEMINI_API_KEY가 설정되지 않음')

const SEED_TITLE = '프로젝트 회의 준비'

async function openMemo(page: Page, title: string) {
  await page.getByTestId('memo-card').filter({ hasText: title }).click()
  await expect(page.getByTestId('memo-viewer')).toBeVisible()
}

async function generateSummary(page: Page) {
  await page.getByTestId('memo-summary-btn').click()
  await expect(page.getByTestId('memo-summary-text')).toBeVisible({
    timeout: 30000,
  })
}

test.describe('메모 AI 요약', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('memo-card').first()).toBeVisible()
  })

  test('요약을 생성하고 다시 열어도 유지된다', async ({ page }) => {
    await openMemo(page, SEED_TITLE)
    await generateSummary(page)

    const text = (
      await page.getByTestId('memo-summary-text').innerText()
    ).trim()
    expect(text.length).toBeGreaterThan(0)
    await expect(page.getByTestId('memo-summary-stale')).toHaveCount(0)

    await page.getByTestId('memo-viewer-close-btn').click()
    await openMemo(page, SEED_TITLE)
    await expect(page.getByTestId('memo-summary-text')).toHaveText(text)

    await page.reload()
    await openMemo(page, SEED_TITLE)
    await expect(page.getByTestId('memo-summary-text')).toHaveText(text)
  })

  test('메모를 수정하면 오래됨 표시가 뜨고 재생성하면 사라진다', async ({
    page,
  }) => {
    await openMemo(page, SEED_TITLE)
    await generateSummary(page)

    await page.getByTestId('memo-viewer-edit-btn').click()
    await page
      .locator('#content')
      .fill(
        '수정된 본문입니다. 요약이 오래되었는지 확인하기 위해 내용을 충분히 길게 바꿉니다. 다음 주 일정과 준비물을 다시 정리합니다.'
      )
    await page.getByRole('button', { name: '수정하기' }).click()

    await openMemo(page, SEED_TITLE)
    await expect(page.getByTestId('memo-summary-stale')).toBeVisible()

    await page.getByTestId('memo-summary-btn').click()
    await expect(page.getByTestId('memo-summary-btn')).toHaveText('재생성', {
      timeout: 30000,
    })
    await expect(page.getByTestId('memo-summary-stale')).toHaveCount(0)
  })

  test('본문이 짧은 메모는 요약 버튼이 비활성화된다', async ({ page }) => {
    await page.getByRole('button', { name: '새 메모' }).click()
    await page.locator('#title').fill('짧은 메모')
    await page.locator('#content').fill('짧은 내용')
    await page.getByRole('button', { name: '저장하기' }).click()

    await openMemo(page, '짧은 메모')
    await expect(page.getByTestId('memo-summary-btn')).toBeDisabled()
  })
})
