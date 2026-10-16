import { Memo } from '@/types/memo'

export const MIN_SUMMARY_LENGTH = 50
export const MAX_SUMMARY_INPUT_LENGTH = 20000

// 요약 대상(제목 + 본문)의 동기 해시 (djb2)
export const computeSourceHash = (title: string, content: string): string => {
  const source = `${title}\n${content}`
  let hash = 5381
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}

export const isSummaryStale = (memo: Memo): boolean =>
  memo.summary !== undefined &&
  memo.summary.sourceHash !== computeSourceHash(memo.title, memo.content)

export const canSummarize = (memo: Memo): boolean =>
  memo.content.trim().length >= MIN_SUMMARY_LENGTH
