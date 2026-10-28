export type Environment = 'local' | 'cloud'
export type Status = 'todo' | 'running' | 'review' | 'done'
export type ResourceKind =
  | 'agents'
  | 'teams'
  | 'skills'
  | 'plugins'
  | 'runtimes'
export interface Message {
  role: 'user' | 'assistant'
  text: string
  agent?: string
  files?: string[]
}
export interface Task {
  title: string
  description: string
  projectId: string
  env: Environment
  status: Status
  agent: string
  messages: Message[]
}
export interface Project {
  name: string
  description: string
  env: Environment
}
export interface Schedule {
  title: string
  prompt: string
  time: string
  frequency: string
  env: Environment
  enabled: boolean
}
export interface Workflow {
  name: string
  description: string
  role: string
  agent: string
  extra: boolean
}
export interface Resource {
  name: string
  description: string
  kind: ResourceKind
  meta: string
  installed: boolean
}
export interface Notification {
  title: string
  text: string
  taskId: string
  read: boolean
}
export interface Settings {
  name: string
  theme: 'light' | 'dark'
  agent: string
  env: Environment
  projectId: string
}
export interface Run {
  title: string
  workflowId: string
  input: string
  output: string
}
export interface Collections {
  tasks: Task
  projects: Project
  schedules: Schedule
  workflows: Workflow
  resources: Resource
  notifications: Notification
  settings: Settings
  runs: Run
}
export type Collection = keyof Collections
export interface RecordOf<K extends Collection> {
  id: string
  collection: K
  data: Collections[K]
  revision: number
  updatedAt: string
}
export type AnyRecord = { [K in Collection]: RecordOf<K> }[Collection]
export const statuses: Record<Status, string> = {
  todo: '待办',
  running: '进行中',
  review: '待审查',
  done: '已完成',
}
export const resourceKinds: Record<ResourceKind, string> = {
  agents: '智能体',
  teams: '小队',
  skills: '技能',
  plugins: '插件',
  runtimes: '运行环境',
}
export const environmentName = (env: Environment) =>
  env === 'local' ? '本地' : '云端'
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60000),
  )
  return minutes < 1
    ? '刚刚'
    : minutes < 60
      ? `${minutes} 分钟前`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} 小时前`
        : new Date(value).toLocaleDateString('zh-CN')
}
