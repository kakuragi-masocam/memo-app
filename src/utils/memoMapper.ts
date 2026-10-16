import { Memo, MemoFormData, MemoSummary } from '@/types/memo'

export interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  summary_text: string | null
  summary_generated_at: string | null
  summary_source_hash: string | null
}

export const rowToMemo = (row: MemoRow): Memo => {
  const memo: Memo = {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  if (
    row.summary_text !== null &&
    row.summary_generated_at !== null &&
    row.summary_source_hash !== null
  ) {
    memo.summary = {
      text: row.summary_text,
      generatedAt: row.summary_generated_at,
      sourceHash: row.summary_source_hash,
    }
  }

  return memo
}

export const formDataToRow = (formData: MemoFormData) => ({
  title: formData.title,
  content: formData.content,
  category: formData.category,
  tags: formData.tags,
})

export const summaryToRow = (summary: MemoSummary) => ({
  summary_text: summary.text,
  summary_generated_at: summary.generatedAt,
  summary_source_hash: summary.sourceHash,
})
