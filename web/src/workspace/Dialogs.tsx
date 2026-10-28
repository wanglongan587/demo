import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { pageTitles, useUI } from '../store/workspace'
import type { Dialog, Page } from '../store/workspace'
import type { Workspace } from './data'
import { Btn, Icon, IconButton, StatusIcon } from './ui'
import { download, resourceKinds, statuses } from './types'
import type { Environment, ResourceKind, Status } from './types'
import { Input } from '../components/ui/input'

const titles: Record<Dialog['type'], string> = {
  task: '任务',
  project: '项目',
  schedule: '定时任务',
  workflow: '工作流',
  resource: '团队资源',
  node: '配置 Agent 节点',
  run: '演示运行',
  settings: '设置与偏好',
  search: '搜索工作空间',
  delete: '删除记录',
  permission: '任务权限',
  runtime: '运行环境',
}
export function Dialogs({ ws }: { ws: Workspace }) {
  const dialog = useUI((s) => s.dialog)
  if (!dialog) return null
  return (
    <WorkspaceDialog
      key={`${dialog.type}-${dialog.record?.id || 'new'}`}
      dialog={dialog}
      ws={ws}
    />
  )
}

function Field({
  name,
  label,
  children,
  value = '',
  required = false,
  type = 'text',
  maxLength = 200,
}: {
  name: string
  label: string
  children?: ReactNode
  value?: string
  required?: boolean
  type?: string
  maxLength?: number
}) {
  return (
    <div>
      <label htmlFor={`field-${name}`}>{label}</label>
      {children ||
        (type === 'textarea' ? (
          <textarea
            id={`field-${name}`}
            name={name}
            defaultValue={value}
            required={required}
            maxLength={maxLength}
          />
        ) : (
          <Input
            id={`field-${name}`}
            name={name}
            type={type}
            defaultValue={value}
            required={required}
            maxLength={maxLength}
          />
        ))}
    </div>
  )
}
function EnvironmentField({ value = 'local' }: { value?: string }) {
  return (
    <Field name="env" label="执行环境">
      <select id="field-env" name="env" defaultValue={value}>
        <option value="local">本地工作空间</option>
        <option value="cloud">云端沙箱</option>
      </select>
    </Field>
  )
}

function WorkspaceDialog({ dialog, ws }: { dialog: Dialog; ws: Workspace }) {
  const ui = useUI(),
    ref = useRef<HTMLDialogElement>(null),
    [error, setError] = useState(''),
    [submitting, setSubmitting] = useState(false)
  const pending = ws.busy || submitting
  const { type } = dialog
  // Keep the original revision with the form draft. A refetch must not silently authorize overwriting newer data.
  const [original] = useState(dialog.record)
  const defaults = (original?.data || {}) as unknown as Record<string, string>
  const settings = ws.list('settings')[0]
  const [settingsOriginal] = useState(settings)
  const names = [
    ...new Set([
      defaults.agent || ui.agent,
      ...ws
        .list('resources')
        .filter((r) => r.data.kind === 'agents')
        .map((r) => r.data.name),
    ]),
  ]
  useEffect(() => {
    const element = ref.current,
      previous = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => {
      element?.close()
      previous?.focus()
    }
  }, [])
  function close() {
    if (!pending) ui.set({ dialog: null })
  }
  const title = [
    'task',
    'project',
    'schedule',
    'workflow',
    'resource',
  ].includes(type)
    ? `${original ? '编辑' : '新建'}${titles[type]}`
    : titles[type]
  async function submit(form: HTMLFormElement) {
    if (pending) return
    setError('')
    setSubmitting(true)
    const formData = new FormData(form),
      field = (name: string) => String(formData.get(name) || '').trim()
    try {
      if (type === 'task') {
        const task = original?.collection === 'tasks' ? original : undefined
        const result = await ws.save(
          'tasks',
          {
            title: field('title'),
            description: field('description'),
            projectId: field('projectId'),
            env: field('env') as Environment,
            status: field('status') as Status,
            agent: field('agent'),
            messages: task?.data.messages || [],
          },
          task,
        )
        ui.navigate('detail', result.id)
      } else if (type === 'project') {
        if (
          ws
            .list('projects')
            .some(
              (p) =>
                p.id !== original?.id &&
                p.data.name.toLocaleLowerCase() ===
                  field('name').toLocaleLowerCase(),
            )
        )
          throw new Error('已有同名项目，请换一个名称。')
        const result = await ws.save(
          'projects',
          {
            name: field('name'),
            description: field('description'),
            env: field('env') as Environment,
          },
          original?.collection === 'projects' ? original : undefined,
        )
        ui.navigate('projects')
        ui.set({ projectId: result.id })
      } else if (type === 'schedule') {
        const old = original?.collection === 'schedules' ? original : undefined
        await ws.save(
          'schedules',
          {
            title: field('title'),
            prompt: field('prompt'),
            time: field('time'),
            frequency: field('frequency'),
            env: field('env') as Environment,
            enabled: old?.data.enabled ?? true,
          },
          old,
        )
        ui.navigate('automations')
      } else if (type === 'workflow' || type === 'node') {
        const old = original?.collection === 'workflows' ? original : undefined
        const result = await ws.save(
          'workflows',
          {
            name: type === 'node' ? old!.data.name : field('name'),
            description:
              type === 'node' ? old!.data.description : field('description'),
            role: field('role'),
            agent: field('agent'),
            extra: old?.data.extra || false,
          },
          old,
        )
        ui.navigate('workflow', result.id)
      } else if (type === 'resource') {
        const old = original?.collection === 'resources' ? original : undefined
        await ws.save(
          'resources',
          {
            name: field('name'),
            description: field('description'),
            meta: field('meta'),
            kind: (old?.data.kind || ui.resourceKind) as ResourceKind,
            installed: old?.data.installed || false,
          },
          old,
        )
        ui.navigate('resources')
      } else if (type === 'run' && original?.collection === 'workflows') {
        const w = original.data,
          input = field('input')
        await ws.save('runs', {
          title: w.name,
          workflowId: original.id,
          input,
          output: `① 开始 · 接收输入：${input}\n② Agent · 载入 ${w.agent} 与角色指令（模拟）\n${w.extra ? '③ 条件分支 · 输入非空，继续输出\n' : ''}${w.extra ? '④' : '③'} 输出 · 演示预览完成。实际报告需要连接 AI 服务后生成。`,
        })
        ui.set({ dialog: null })
      } else if (type === 'settings') {
        const result = await ws.save(
          'settings',
          {
            name: field('name'),
            theme: field('theme') as 'light' | 'dark',
            agent: field('agent'),
            env: field('env') as Environment,
            projectId: field('projectId'),
          },
          settingsOriginal,
        )
        ui.set({
          agent: result.data.agent,
          projectId: result.data.projectId,
          env: result.data.env,
          dialog: null,
        })
      } else if (type === 'delete' && original) {
        if (
          original.collection === 'projects' &&
          ws.list('tasks').some((t) => t.data.projectId === original.id)
        )
          throw new Error(
            '此项目仍有关联任务。请先编辑任务，将它们移到其他项目或取消关联，再删除项目。',
          )
        await ws.remove(original)
        ui.set({ dialog: null })
        if (ui.activeId === original.id)
          ui.navigate(original.collection === 'tasks' ? 'tasks' : 'workflows')
      }
      ui.set({ toast: type === 'delete' ? '已删除' : '已保存到服务端' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }
  const agentField = (
    <Field name="agent" label="智能体">
      <select
        name="agent"
        id="field-agent"
        defaultValue={defaults.agent || settings?.data.agent || ui.agent}
      >
        {names.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </Field>
  )
  const projectField = (
    <Field name="projectId" label="项目">
      <select
        name="projectId"
        id="field-projectId"
        defaultValue={
          defaults.projectId ??
          (type === 'settings' ? settings?.data.projectId : ui.projectId)
        }
      >
        <option value="">未关联项目</option>
        {ws.list('projects').map((p) => (
          <option key={p.id} value={p.id}>
            {p.data.name}
          </option>
        ))}
      </select>
    </Field>
  )
  return (
    <dialog
      ref={ref}
      className={`modal ${type === 'settings' ? 'settings-modal' : type === 'search' ? 'command-modal' : ''}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const bounds = ref.current.getBoundingClientRect()
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            close()
        }
      }}
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <IconButton
          name="x"
          label="关闭对话框"
          disabled={pending}
          onClick={close}
        />
      </div>
      {type === 'search' ? (
        <Search ws={ws} />
      ) : type === 'permission' ? (
        <>
          <p className="description">
            这是演示任务配置，不会执行文件修改或命令。
          </p>
          {['需要确认', '只读模式', '完全访问'].map((p) => (
            <button
              className="command-result"
              key={p}
              onClick={() => ui.set({ permission: p, dialog: null })}
            >
              <Icon name="shield" />
              <span className="grow">{p}</span>
              {p === ui.permission && <Icon name="check" />}
            </button>
          ))}
        </>
      ) : type === 'runtime' ? (
        <>
          <p className="description">{defaults.name} · 演示环境配置</p>
          <div className="setting-row">
            <div>
              <h3>尚未连接执行服务</h3>
              <p>本 demo 提供配置与数据管理，不运行模型、终端或云端沙箱。</p>
            </div>
            <span className="pill">未连接</span>
          </div>
          <Btn
            onClick={() =>
              ui.set({ dialog: { type: 'resource', record: original } })
            }
          >
            编辑环境说明
          </Btn>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(e.currentTarget)
          }}
        >
          <fieldset disabled={pending}>
            {type === 'task' && (
              <>
                <Field
                  name="title"
                  label="任务名称"
                  required
                  value={defaults.title}
                  maxLength={100}
                />
                <Field
                  name="description"
                  label="任务描述"
                  type="textarea"
                  value={defaults.description}
                  maxLength={10000}
                />
                <div className="form-row">
                  {projectField}
                  <EnvironmentField value={defaults.env || ui.env} />
                </div>
                <div className="form-row">
                  {agentField}
                  <Field name="status" label="状态">
                    <select
                      name="status"
                      id="field-status"
                      defaultValue={defaults.status || dialog.status || 'todo'}
                    >
                      {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            )}
            {type === 'project' && (
              <>
                <p className="description">
                  项目用于分组和上下文管理，不会读取本地目录或拉取仓库。
                </p>
                <Field
                  name="name"
                  label="项目名称"
                  required
                  value={defaults.name}
                  maxLength={80}
                />
                <Field
                  name="description"
                  label="项目描述"
                  value={defaults.description}
                />
                <EnvironmentField value={defaults.env} />
              </>
            )}
            {type === 'schedule' && (
              <>
                <p className="description">
                  保存定时配置；本演示不会后台执行。
                </p>
                <Field
                  name="title"
                  label="任务名称"
                  required
                  value={defaults.title}
                  maxLength={100}
                />
                <Field
                  name="prompt"
                  label="执行指令"
                  required
                  type="textarea"
                  value={defaults.prompt}
                  maxLength={10000}
                />
                <div className="form-row">
                  <Field name="frequency" label="重复">
                    <select
                      name="frequency"
                      id="field-frequency"
                      defaultValue={defaults.frequency || '每天'}
                    >
                      {['每天', '工作日', '每周一', '每周五'].map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    name="time"
                    label="时间 · Asia/Shanghai"
                    required
                    type="time"
                    value={defaults.time || '09:00'}
                  />
                </div>
                <EnvironmentField value={defaults.env || ui.env} />
              </>
            )}
            {(type === 'workflow' || type === 'node') && (
              <>
                {type === 'workflow' && (
                  <>
                    <Field
                      name="name"
                      label="工作流名称"
                      required
                      value={defaults.name}
                      maxLength={100}
                    />
                    <Field
                      name="description"
                      label="描述"
                      type="textarea"
                      value={defaults.description}
                      maxLength={1000}
                    />
                  </>
                )}
                {agentField}
                <Field
                  name="role"
                  label="角色与指令"
                  required
                  type="textarea"
                  value={
                    defaults.role ||
                    '请根据输入的任务内容制定方案，并给出清晰的输出结果。'
                  }
                  maxLength={10000}
                />
              </>
            )}
            {type === 'resource' && (
              <>
                <p className="description">
                  {
                    resourceKinds[
                      (defaults.kind || ui.resourceKind) as ResourceKind
                    ]
                  }
                  演示目录；配置不会安装软件或连接真实服务。
                </p>
                <Field
                  name="name"
                  label="名称"
                  required
                  value={defaults.name}
                  maxLength={100}
                />
                <Field
                  name="description"
                  label="描述"
                  type="textarea"
                  value={defaults.description}
                  maxLength={1000}
                />
                <Field
                  name="meta"
                  label="分工 / 能力说明"
                  value={defaults.meta}
                />
              </>
            )}
            {type === 'run' && (
              <>
                <p className="description">
                  预览节点流转，Agent
                  节点使用示例输出，不调用真实模型。预览记录会保存到服务端。
                </p>
                <Field
                  name="input"
                  label="工作流输入"
                  required
                  type="textarea"
                  maxLength={10000}
                />
              </>
            )}
            {type === 'settings' && (
              <>
                <Field
                  name="name"
                  label="工作空间名称"
                  required
                  value={settings?.data.name || 'Ora 工作空间'}
                />
                <div className="form-row">
                  <Field name="theme" label="外观主题">
                    <select
                      name="theme"
                      id="field-theme"
                      defaultValue={settings?.data.theme || 'light'}
                    >
                      <option value="light">浅色</option>
                      <option value="dark">深色</option>
                    </select>
                  </Field>
                  {agentField}
                </div>
                <div className="form-row">
                  {projectField}
                  <EnvironmentField value={settings?.data.env || 'local'} />
                </div>
                <div className="setting-row">
                  <div>
                    <h3>工作空间数据</h3>
                    <p>保存在服务端 SQLite，所有打开此 demo 的浏览器共享。</p>
                  </div>
                  <Btn
                    type="button"
                    onClick={() => download('ora-workspace.json', ws.data)}
                  >
                    <Icon name="download" />
                    导出数据
                  </Btn>
                </div>
                <p className="panel-note">
                  AI
                  模型、本地终端、云端沙箱和调度器未连接。主题和默认配置保存后生效。
                </p>
              </>
            )}
            {type === 'delete' && (
              <p className="description">
                确定删除「{defaults.name || defaults.title || '这条记录'}
                」？删除后无法撤销。
                {original?.collection === 'workflows' &&
                  '已有运行预览记录会保留在导出数据中。'}
              </p>
            )}
          </fieldset>
          {error && (
            <div className="form-error" role="alert">
              {error}
              {error.includes('其他页面') && (
                <button
                  type="button"
                  onClick={() => {
                    const fresh = ws.data?.find(
                      (r) =>
                        r.id === original?.id &&
                        r.collection === original?.collection,
                    )
                    ui.set({ dialog: null })
                    setTimeout(
                      () =>
                        useUI
                          .getState()
                          .set({ dialog: { ...dialog, record: fresh } }),
                      0,
                    )
                  }}
                >
                  放弃当前输入并重新打开最新内容
                </button>
              )}
            </div>
          )}
          <div className="modal-footer">
            <Btn type="button" disabled={pending} onClick={close}>
              取消
            </Btn>
            <Btn
              type="submit"
              className={type === 'delete' ? 'danger' : 'primary'}
              disabled={pending}
            >
              {pending
                ? '正在保存…'
                : type === 'delete'
                  ? '确认删除'
                  : type === 'run'
                    ? '运行演示'
                    : '保存'}
            </Btn>
          </div>
        </form>
      )}
    </dialog>
  )
}

function Search({ ws }: { ws: Workspace }) {
  const [query, setQuery] = useState(''),
    ui = useUI(),
    container = useRef<HTMLDivElement>(null)
  const matches = (value: string) =>
    value.toLowerCase().includes(query.toLowerCase())
  const pages = Object.entries(pageTitles).filter(
    ([k, v]) => !['detail', 'workflow'].includes(k) && matches(v),
  )
  const projects = ws.list('projects').filter((p) => matches(p.data.name)),
    tasks = ws.list('tasks').filter((t) => matches(t.data.title))
  return (
    <div
      ref={container}
      onKeyDown={(e) => {
        const buttons = Array.from(
          container.current?.querySelectorAll<HTMLButtonElement>(
            '.command-result',
          ) || [],
        )
        if (['ArrowUp', 'ArrowDown'].includes(e.key) && buttons.length) {
          e.preventDefault()
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          )
          buttons[
            (current + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) %
              buttons.length
          ]?.focus()
        }
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          buttons[0]?.click()
        }
      }}
    >
      <div className="command-search">
        <Icon name="search" />
        <input
          aria-label="搜索工作空间"
          autoFocus
          value={query}
          placeholder="搜索任务、项目与功能…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="command-results">
        {pages.map(([key, label]) => (
          <button
            key={key}
            className="command-result"
            onClick={() => ui.navigate(key as Page)}
          >
            <Icon name="grid" />
            {label}
            <small>页面</small>
          </button>
        ))}
        {projects.map((p) => (
          <button
            key={p.id}
            className="command-result"
            onClick={() => {
              ui.navigate('tasks')
              ui.set({ query: p.data.name, projectId: p.id })
            }}
          >
            <Icon name="folder" />
            {p.data.name}
            <small>项目</small>
          </button>
        ))}
        {tasks.map((t) => (
          <button
            key={t.id}
            className="command-result"
            onClick={() => ui.navigate('detail', t.id)}
          >
            <StatusIcon status={t.data.status} />
            <span className="truncate">{t.data.title}</span>
            <small>任务</small>
          </button>
        ))}
        {!pages.length && !projects.length && !tasks.length && (
          <p className="no-results">没有找到匹配结果。</p>
        )}
      </div>
      <div className="command-hint">↑ ↓ 选择 · Enter 打开 · Esc 关闭</div>
    </div>
  )
}
