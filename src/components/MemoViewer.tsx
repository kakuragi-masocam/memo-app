'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Memo, MemoSummary, MEMO_CATEGORIES } from '@/types/memo'
import { useSummarize } from '@/hooks/useSummarize'
import {
  canSummarize,
  isSummaryStale,
  MIN_SUMMARY_LENGTH,
} from '@/utils/summary'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
)

interface MemoViewerProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onSaveSummary: (id: string, summary: MemoSummary) => void
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MemoViewer({
  memo,
  onClose,
  onEdit,
  onDelete,
  onSaveSummary,
}: MemoViewerProps) {
  const isOpen = memo !== null
  const { status, errorMessage, summarize } = useSummarize(memo, onSaveSummary)

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!memo) return null

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const isLoading = status === 'loading'
  const isStale = isSummaryStale(memo)
  const summarizable = canSummarize(memo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="memo-viewer-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-viewer-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="memo-viewer"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2
              id="memo-viewer-title"
              className="text-xl font-semibold text-gray-900 mb-2 break-words"
            >
              {memo.title}
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {MEMO_CATEGORIES[
                  memo.category as keyof typeof MEMO_CATEGORIES
                ] || memo.category}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(memo.updatedAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="memo-viewer-close-btn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI 요약 */}
          <section
            className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4"
            aria-label="AI 요약"
            data-testid="memo-summary"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-purple-900">
                  ✨ AI 요약
                </h3>
                {memo.summary && isStale && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                    data-testid="memo-summary-stale"
                  >
                    원문이 변경되었습니다
                  </span>
                )}
              </div>
              <button
                onClick={summarize}
                disabled={isLoading || !summarizable}
                className="px-3 py-1 text-xs font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="memo-summary-btn"
              >
                {isLoading
                  ? '요약 중...'
                  : memo.summary
                    ? '재생성'
                    : '요약하기'}
              </button>
            </div>
            {memo.summary ? (
              <>
                <p
                  className="text-sm text-gray-800 whitespace-pre-wrap"
                  data-testid="memo-summary-text"
                >
                  {memo.summary.text}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {formatDate(memo.summary.generatedAt)}에 생성
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {summarizable
                  ? '버튼을 눌러 메모를 AI로 요약해 보세요.'
                  : `본문이 ${MIN_SUMMARY_LENGTH}자 이상일 때 요약할 수 있습니다.`}
              </p>
            )}
            {status === 'error' && (
              <p
                role="alert"
                className="mt-2 text-sm text-red-600"
                data-testid="memo-summary-error"
              >
                {errorMessage} 다시 시도해 주세요.
              </p>
            )}
          </section>
          <div data-color-mode="light" data-testid="memo-viewer-content">
            <MarkdownPreview
              source={memo.content}
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
          {memo.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-4">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            data-testid="memo-viewer-delete-btn"
          >
            삭제
          </button>
          <button
            onClick={() => onEdit(memo)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="memo-viewer-edit-btn"
          >
            편집
          </button>
        </div>
      </div>
    </div>
  )
}
