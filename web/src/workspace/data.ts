import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AnyRecord, Collection, Collections, RecordOf } from './types'
import { useUI } from '../store/workspace'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok)
    throw new Error(
      (await response.text()).trim() || `请求失败：${response.status}`,
    )
  return response.status === 204 ? (undefined as T) : response.json()
}

export function useWorkspace() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['workspace'],
    queryFn: () => request<AnyRecord[]>('/workspace'),
  })
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string
      method: string
      body?: unknown
    }) =>
      request<AnyRecord>(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: ['workspace'] }),
  })
  const list = <K extends Collection>(kind: K) =>
    (query.data || []).filter((r) => r.collection === kind) as RecordOf<K>[]
  const save = async <K extends Collection>(
    kind: K,
    data: Collections[K],
    original?: RecordOf<K>,
  ) => {
    const result = await mutation.mutateAsync({
      path: `/records/${kind}${original ? '/' + encodeURIComponent(original.id) : ''}`,
      method: original ? 'PUT' : 'POST',
      body: { data, ...(original ? { revision: original.revision } : {}) },
    })
    return result as RecordOf<K>
  }
  const remove = (record: AnyRecord) =>
    mutation.mutateAsync({
      path: `/records/${record.collection}/${encodeURIComponent(record.id)}?revision=${record.revision}`,
      method: 'DELETE',
    })
  const selectContext = async (
    value: Partial<
      Pick<Collections['settings'], 'agent' | 'env' | 'projectId'>
    >,
  ) => {
    const current = list('settings')[0]
    await save(
      'settings',
      {
        ...(current?.data || {
          name: 'Ora 工作空间',
          theme: 'light',
          agent: 'Codex',
          env: 'local',
          projectId: '',
        }),
        ...value,
      },
      current,
    )
    useUI.getState().set(value)
  }
  return {
    ...query,
    list,
    save,
    remove,
    selectContext,
    busy: mutation.isPending,
  }
}
export type Workspace = ReturnType<typeof useWorkspace>
