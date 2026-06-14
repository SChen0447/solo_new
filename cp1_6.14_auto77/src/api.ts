import axios from 'axios'
import type { Book, SearchQuery, BacklogItem, NotifyRequest, NotifyResponse, SearchSuggestion } from './types'

const instance = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export const searchBooks = async (query: SearchQuery): Promise<Book[]> => {
  const params: Record<string, string> = {}
  if (query.keyword) params.keyword = query.keyword
  if (query.category) params.category = query.category
  if (query.status) params.status = query.status
  const res = await instance.get<Book[]>('/books/search', { params })
  return res.data
}

export const fetchSuggestions = async (keyword: string): Promise<SearchSuggestion[]> => {
  const res = await instance.get<SearchSuggestion[]>('/books/suggestions', {
    params: { keyword },
  })
  return res.data
}

export const fetchCategories = async (): Promise<string[]> => {
  const res = await instance.get<string[]>('/books/categories')
  return res.data
}

export const fetchBookById = async (id: string): Promise<Book> => {
  const res = await instance.get<Book>(`/books/${id}`)
  return res.data
}

export const requestNotify = async (data: NotifyRequest): Promise<NotifyResponse> => {
  const res = await instance.post<NotifyResponse>('/notify', data)
  return res.data
}

export const fetchBacklog = async (): Promise<BacklogItem[]> => {
  const res = await instance.get<BacklogItem[]>('/backlog')
  return res.data
}

export const addToBacklog = async (bookId: string, bookTitle: string): Promise<BacklogItem> => {
  const res = await instance.post<BacklogItem>('/backlog', { bookId, bookTitle })
  return res.data
}

export const deleteBacklogItem = async (id: string): Promise<void> => {
  await instance.delete(`/backlog/${id}`)
}
