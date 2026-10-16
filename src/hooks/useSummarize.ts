'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Memo, MemoSummary } from '@/types/memo'
import { computeSourceHash } from '@/utils/summary'

type SummarizeStatus = 'idle' | 'loading' | 'error'

export const useSummarize = (
  memo: Memo | null,
  onSaveSummary: (id: string, summary: MemoSummary) => void
) => {
  const [status, setStatus] = useState<SummarizeStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const memoId = memo?.id

  // 메모가 바뀌거나 모달이 닫히면 진행 중 요청 취소 및 상태 초기화
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
      setStatus('idle')
      setErrorMessage('')
    }
  }, [memoId])

  const summarize = useCallback(async () => {
    if (!memo || abortRef.current) return

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memo.title, content: memo.content }),
        signal: controller.signal,
      })
      const data: { summary?: string; error?: string } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok || !data.summary) {
        throw new Error(data.error || 'AI 요약에 실패했습니다.')
      }

      onSaveSummary(memo.id, {
        text: data.summary,
        generatedAt: new Date().toISOString(),
        sourceHash: computeSourceHash(memo.title, memo.content),
      })
      setStatus('idle')
    } catch (error) {
      if (controller.signal.aborted) return
      setErrorMessage(
        error instanceof Error ? error.message : 'AI 요약에 실패했습니다.'
      )
      setStatus('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [memo, onSaveSummary])

  return { status, errorMessage, summarize }
}
