'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Memo, MemoFormData, MemoSummary } from '@/types/memo'
import {
  getMemos as getMemosAction,
  createMemo as createMemoAction,
  updateMemo as updateMemoAction,
  deleteMemo as deleteMemoAction,
  saveSummary as saveSummaryAction,
  clearAllMemos as clearAllMemosAction,
} from '@/app/actions/memos'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 서버에서 메모 목록 다시 로드 (초기 로드 및 실패 시 롤백용)
  const reloadMemos = useCallback(async (): Promise<void> => {
    try {
      setMemos(await getMemosAction())
      setError(null)
    } catch (err) {
      console.error('Failed to load memos:', err)
      setError('메모를 불러오지 못했습니다.')
    }
  }, [])

  // 메모 로드
  useEffect(() => {
    setLoading(true)
    reloadMemos().finally(() => setLoading(false))
  }, [reloadMemos])

  // 실패 시 서버 상태로 롤백
  const handleFailure = useCallback(
    async (message: string, err: unknown): Promise<void> => {
      console.error(message, err)
      await reloadMemos()
      setError(message)
    },
    [reloadMemos]
  )

  // 메모 생성 (낙관적 업데이트)
  const createMemo = useCallback(
    (formData: MemoFormData): Memo => {
      const now = new Date().toISOString()
      const newMemo: Memo = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      }

      setMemos(prev => [newMemo, ...prev])
      createMemoAction(newMemo.id, formData).catch(err =>
        handleFailure('메모를 저장하지 못했습니다.', err)
      )

      return newMemo
    },
    [handleFailure]
  )

  // 메모 업데이트 (낙관적 업데이트)
  const updateMemo = useCallback(
    (id: string, formData: MemoFormData): void => {
      const updatedAt = new Date().toISOString()
      setMemos(prev =>
        prev.map(memo =>
          memo.id === id ? { ...memo, ...formData, updatedAt } : memo
        )
      )
      updateMemoAction(id, formData).catch(err =>
        handleFailure('메모를 수정하지 못했습니다.', err)
      )
    },
    [handleFailure]
  )

  // 요약 저장 (updatedAt은 변경하지 않음)
  const saveSummary = useCallback(
    (id: string, summary: MemoSummary): void => {
      setMemos(prev =>
        prev.map(memo => (memo.id === id ? { ...memo, summary } : memo))
      )
      saveSummaryAction(id, summary).catch(err =>
        handleFailure('요약을 저장하지 못했습니다.', err)
      )
    },
    [handleFailure]
  )

  // 메모 삭제 (낙관적 업데이트)
  const deleteMemo = useCallback(
    (id: string): void => {
      setMemos(prev => prev.filter(memo => memo.id !== id))
      deleteMemoAction(id).catch(err =>
        handleFailure('메모를 삭제하지 못했습니다.', err)
      )
    },
    [handleFailure]
  )

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback((): void => {
    setMemos([])
    setSearchQuery('')
    setSelectedCategory('all')
    clearAllMemosAction().catch(err =>
      handleFailure('메모를 모두 삭제하지 못했습니다.', err)
    )
  }, [handleFailure])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    saveSummary,
    getMemoById,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
  }
}
