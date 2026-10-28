import { create } from 'zustand'
import type {
  AnyRecord,
  Environment,
  ResourceKind,
  Status,
} from '../workspace/types'

export const pageTitles = {
  home: '工作空间',
  tasks: '所有任务',
  detail: '任务',
  projects: '项目',
  inbox: '收件箱',
  automations: '定时任务',
  workflows: '工作流',
  workflow: '工作流编辑器',
  resources: 'AI 团队',
  analytics: '会话分析',
}
export type Page = keyof typeof pageTitles
export type Dialog = {
  type:
    | 'task'
    | 'project'
    | 'schedule'
    | 'workflow'
    | 'resource'
    | 'node'
    | 'run'
    | 'settings'
    | 'search'
    | 'delete'
    | 'permission'
    | 'runtime'
  record?: AnyRecord
  status?: Status
}
interface UI {
  page: Page
  activeId: string
  dialog: Dialog | null
  panel: 'files' | 'changes' | 'details' | null
  resourceKind: ResourceKind
  query: string
  status: string
  view: 'board' | 'list'
  env: Environment
  projectId: string
  agent: string
  draft: string
  attachments: string[]
  permission: string
  collapsed: boolean
  mobile: boolean
  toast: string
  set: (value: Partial<Omit<UI, 'set' | 'navigate'>>) => void
  navigate: (page: Page, id?: string) => void
}
export const useUI = create<UI>((set) => ({
  page: 'home',
  activeId: '',
  dialog: null,
  panel: null,
  resourceKind: 'agents',
  query: '',
  status: 'all',
  view: 'board',
  env: 'local',
  projectId: '',
  agent: 'Codex',
  draft: '',
  attachments: [],
  permission: '需要确认',
  collapsed: false,
  mobile: false,
  toast: '',
  set,
  navigate: (page, activeId = '') =>
    set({
      page,
      activeId,
      mobile: false,
      dialog: null,
      query: '',
      status: 'all',
      panel: null,
      draft: '',
      attachments: [],
    }),
}))
