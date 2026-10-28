export interface Todo {
  id: number
  title: string
  done: boolean
  createdAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error((await res.text()) || `请求失败：${res.status}`)
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  listTodos: () => request<Todo[]>('/todos'),
  createTodo: (title: string) => request<Todo>('/todos', { method: 'POST', body: JSON.stringify({ title }) }),
  updateTodo: (id: number, done: boolean) => request<Todo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  deleteTodo: (id: number) => request<void>(`/todos/${id}`, { method: 'DELETE' }),
}
