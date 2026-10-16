'use client'

import { useCallback, useMemo, useState } from 'react'
import { useMemos } from '@/hooks/useMemos'
import { Memo, MemoFormData } from '@/types/memo'
import MemoList from '@/components/MemoList'
import MemoForm from '@/components/MemoForm'
import MemoViewer from '@/components/MemoViewer'

export default function Home() {
  const {
    memos,
    allMemos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,
    createMemo,
    updateMemo,
    deleteMemo,
    saveSummary,
    searchMemos,
    filterByCategory,
  } = useMemos()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [viewingMemoId, setViewingMemoId] = useState<string | null>(null)

  // 요약 저장 등 메모 변경이 상세보기에 반영되도록 id로 최신 메모를 조회
  const viewingMemo = useMemo(
    () => allMemos.find(memo => memo.id === viewingMemoId) ?? null,
    [allMemos, viewingMemoId]
  )

  const handleCreateMemo = (formData: MemoFormData) => {
    createMemo(formData)
    setIsFormOpen(false)
  }

  const handleUpdateMemo = (formData: MemoFormData) => {
    if (editingMemo) {
      updateMemo(editingMemo.id, formData)
      setEditingMemo(null)
    }
  }

  const handleViewMemo = useCallback((memo: Memo) => {
    setViewingMemoId(memo.id)
  }, [])

  const handleCloseViewer = useCallback(() => {
    setViewingMemoId(null)
  }, [])

  const handleEditMemo = (memo: Memo) => {
    setViewingMemoId(null)
    setEditingMemo(memo)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingMemo(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">📝 메모 앱</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                새 메모
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div
            role="alert"
            data-testid="memo-error"
            className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <MemoList
          memos={memos}
          loading={loading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={searchMemos}
          onCategoryChange={filterByCategory}
          onEditMemo={handleEditMemo}
          onDeleteMemo={deleteMemo}
          onViewMemo={handleViewMemo}
          stats={stats}
        />
      </main>

      {/* 상세 보기 모달 */}
      <MemoViewer
        memo={viewingMemo}
        onClose={handleCloseViewer}
        onEdit={handleEditMemo}
        onDelete={deleteMemo}
        onSaveSummary={saveSummary}
      />

      {/* 모달 폼 */}
      <MemoForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
        editingMemo={editingMemo}
      />
    </div>
  )
}
