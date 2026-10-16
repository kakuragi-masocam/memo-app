'use server'

import { Memo, MemoFormData, MemoSummary } from '@/types/memo'
import {
  formDataToRow,
  MemoRow,
  rowToMemo,
  summaryToRow,
} from '@/utils/memoMapper'
import { createSupabaseServerClient } from '@/utils/supabase/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const assertValidId = (id: string): void => {
  if (!UUID_PATTERN.test(id)) {
    throw new Error('잘못된 메모 ID입니다.')
  }
}

const assertValidFormData = (formData: MemoFormData): void => {
  if (!formData.title.trim()) {
    throw new Error('제목은 비워둘 수 없습니다.')
  }
}

export async function getMemos(): Promise<Memo[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load memos:', error)
    throw new Error('메모를 불러오지 못했습니다.')
  }

  return (data as MemoRow[]).map(rowToMemo)
}

export async function createMemo(
  id: string,
  formData: MemoFormData
): Promise<Memo> {
  assertValidId(id)
  assertValidFormData(formData)

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('memos')
    .insert({ id, ...formDataToRow(formData) })
    .select('*')
    .single()

  if (error) {
    console.error('Failed to create memo:', error)
    throw new Error('메모를 저장하지 못했습니다.')
  }

  return rowToMemo(data as MemoRow)
}

export async function updateMemo(
  id: string,
  formData: MemoFormData
): Promise<Memo> {
  assertValidId(id)
  assertValidFormData(formData)

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('memos')
    .update({
      ...formDataToRow(formData),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Failed to update memo:', error)
    throw new Error('메모를 수정하지 못했습니다.')
  }

  return rowToMemo(data as MemoRow)
}

export async function deleteMemo(id: string): Promise<void> {
  assertValidId(id)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('memos').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete memo:', error)
    throw new Error('메모를 삭제하지 못했습니다.')
  }
}

// 요약 저장 (updated_at은 변경하지 않음)
export async function saveSummary(
  id: string,
  summary: MemoSummary
): Promise<void> {
  assertValidId(id)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('memos')
    .update(summaryToRow(summary))
    .eq('id', id)

  if (error) {
    console.error('Failed to save summary:', error)
    throw new Error('요약을 저장하지 못했습니다.')
  }
}

export async function clearAllMemos(): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('memos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    console.error('Failed to clear memos:', error)
    throw new Error('메모를 모두 삭제하지 못했습니다.')
  }
}
