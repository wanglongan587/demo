import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useFilter, type Filter } from '@/store/filter'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'done', label: '已完成' },
]

export default function App() {
  const queryClient = useQueryClient()
  const { filter, setFilter } = useFilter()
  const [title, setTitle] = useState('')

  const todos = useQuery({ queryKey: ['todos'], queryFn: api.listTodos })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['todos'] })
  const create = useMutation({ mutationFn: api.createTodo, onSuccess: () => (setTitle(''), refresh()) })
  const update = useMutation({ mutationFn: ({ id, done }: { id: number; done: boolean }) => api.updateTodo(id, done), onSuccess: refresh })
  const remove = useMutation({ mutationFn: api.deleteTodo, onSuccess: refresh })

  const visible = (todos.data ?? []).filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
  const left = (todos.data ?? []).filter((t) => !t.done).length

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim()) create.mutate(title.trim())
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ora Demo</CardTitle>
          <CardDescription>待办清单示例：Go + SQLite 后端，React Query 拉取数据，zustand 保存筛选状态。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={submit} className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="要做什么？" />
            <Button type="submit" disabled={create.isPending}>添加</Button>
          </form>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>剩余 {left} 项</span>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <Button key={f.value} size="sm" variant={filter === f.value ? 'secondary' : 'ghost'} onClick={() => setFilter(f.value)}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {todos.isPending && <p className="text-sm text-muted-foreground">加载中…</p>}
          {todos.isError && <p className="text-sm text-destructive">加载失败：{todos.error.message}</p>}
          {todos.isSuccess && !visible.length && <p className="text-sm text-muted-foreground">暂无事项</p>}

          <ul className="flex flex-col divide-y">
            {visible.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <Checkbox checked={t.done} onCheckedChange={(done) => update.mutate({ id: t.id, done })} />
                <span className={t.done ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>{t.title}</span>
                <Button size="icon-sm" variant="ghost" aria-label="删除" onClick={() => remove.mutate(t.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}
