import { relativeTime } from './types'
import { useRef, useState } from 'react'
import { useUI } from '../store/workspace'
import type { Workspace } from './data'
import { Btn, Empty, Icon, IconButton, PageHead, Pill, StatusIcon } from './ui'
import { environmentName, statuses } from './types'
import type { Message, RecordOf, Status } from './types'

export function TaskRows({
  tasks,
  ws,
}: {
  tasks: RecordOf<'tasks'>[]
  ws: Workspace
}) {
  const ui = useUI()
  return tasks.length ? (
    tasks.map((t) => (
      <button
        className="task-row"
        key={t.id}
        onClick={() => ui.navigate('detail', t.id)}
      >
        <StatusIcon status={t.data.status} />
        <span className="grow">
          <span className="task-title truncate">{t.data.title}</span>
          <span className="task-meta">
            <Icon name="folder" />
            {ws.list('projects').find((p) => p.id === t.data.projectId)?.data
              .name || '未关联项目'}
            <span>·</span>
            {environmentName(t.data.env)}
            <span>·</span>
            {t.data.agent}
          </span>
        </span>
        <Pill status={t.data.status} />
        <span className="time">{relativeTime(t.updatedAt)}</span>
      </button>
    ))
  ) : (
    <Empty>这里还没有任务。创建一个任务，开始新的工作。</Empty>
  )
}

export function Home({ ws }: { ws: Workspace }) {
  const ui = useUI(),
    [filter, setFilter] = useState('all'),
    tasks = ws.list('tasks')
  return (
    <section className="home">
      <div className="greeting">
        <div className="intro-top">
          <Icon name="ora" />
          <span>你的想法，下一步就能实现</span>
        </div>
        <h1>今天，我们一起构建什么？</h1>
        <p>从本地代码到云端协作，让每一个想法走向完成。</p>
      </div>
      <Composer ws={ws} />
      <div className="quick-actions">
        <button
          className="quick-action"
          onClick={() =>
            ui.set({
              draft: '理解这个项目的目录结构，梳理核心模块与开发流程。',
            })
          }
        >
          <Icon name="code" />
          <span>探索项目结构</span>
          <span>↗</span>
        </button>
        <button
          className="quick-action"
          onClick={() =>
            ui.set({
              draft: '审查最近的代码变更，找出潜在问题并给出改进建议。',
            })
          }
        >
          <Icon name="branch" />
          <span>审查代码变更</span>
          <span>↗</span>
        </button>
        <button
          className="quick-action"
          onClick={() => ui.navigate('workflows')}
        >
          <Icon name="workflow" />
          <span>创建自动化工作流</span>
          <span>↗</span>
        </button>
      </div>
      <div className="recent">
        <div className="section-heading">
          <h2>继续上次的工作</h2>
          <button className="ghost" onClick={() => ui.navigate('tasks')}>
            查看全部 <Icon name="arrowRight" />
          </button>
        </div>
        <div className="tabs">
          {[
            ['all', '全部任务'],
            ['running', '进行中'],
            ['review', '待审查'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="tab-count">
                {
                  tasks.filter((t) => key === 'all' || t.data.status === key)
                    .length
                }
              </span>
            </button>
          ))}
          <span className="agents-strip" style={{ marginLeft: 'auto' }}>
            ◎　✳　▣
          </span>
        </div>
        <TaskRows
          ws={ws}
          tasks={tasks
            .filter((t) => filter === 'all' || t.data.status === filter)
            .slice(0, 5)}
        />
      </div>
      <div className="home-footer">
        <Icon name="shield" />
        <span>本地与云端，共享一个工作空间</span>
        <span>·</span>
        <span>演示数据已保存到服务端</span>
      </div>
    </section>
  )
}

export function Tasks({ ws }: { ws: Workspace }) {
  const ui = useUI()
  const tasks = ws
    .list('tasks')
    .filter(
      (t) =>
        (ui.status === 'all' || t.data.status === ui.status) &&
        `${t.data.title} ${t.data.agent} ${ws.list('projects').find((p) => p.id === t.data.projectId)?.data.name || ''}`
          .toLowerCase()
          .includes(ui.query.toLowerCase()),
    )
  return (
    <section className="page">
      <PageHead
        title="所有任务"
        description="从一个想法到一次交付，所有进展尽在这里。"
      >
        <Btn
          className="primary"
          onClick={() => ui.set({ dialog: { type: 'task' } })}
        >
          <Icon name="plus" />
          新建任务
        </Btn>
      </PageHead>
      <div className="page-tools">
        <div className="search-field">
          <Icon name="search" />
          <input
            aria-label="搜索任务"
            placeholder="搜索任务…"
            value={ui.query}
            onChange={(e) => ui.set({ query: e.target.value })}
          />
        </div>
        <select
          className="filter-select"
          aria-label="筛选状态"
          value={ui.status}
          onChange={(e) => ui.set({ status: e.target.value })}
        >
          <option value="all">所有状态</option>
          {Object.entries(statuses).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="view-toggle">
          <IconButton
            name="grid"
            label="看板视图"
            aria-pressed={ui.view === 'board'}
            onClick={() => ui.set({ view: 'board' })}
          />
          <IconButton
            name="list"
            label="列表视图"
            aria-pressed={ui.view === 'list'}
            onClick={() => ui.set({ view: 'list' })}
          />
        </div>
      </div>
      {ui.view === 'list' ? (
        <TaskRows tasks={tasks} ws={ws} />
      ) : (
        <div className="board">
          {Object.entries(statuses).map(([key, label]) => (
            <div key={key} className="board-column">
              <div className="column-head">
                <StatusIcon status={key as Status} />
                <span>{label}</span>
                <span className="muted">
                  {tasks.filter((t) => t.data.status === key).length}
                </span>
                <IconButton
                  name="plus"
                  label={`新建${label}任务`}
                  onClick={() =>
                    ui.set({ dialog: { type: 'task', status: key as Status } })
                  }
                />
              </div>
              {tasks
                .filter((t) => t.data.status === key)
                .map((t) => (
                  <button
                    key={t.id}
                    className="task-card"
                    onClick={() => ui.navigate('detail', t.id)}
                  >
                    <span className="card-id">
                      ORA-{t.id.slice(0, 6).toUpperCase()}
                    </span>
                    <p>{t.data.title}</p>
                    <span className="row between">
                      <span className="task-meta">
                        <Icon
                          name={t.data.env === 'cloud' ? 'cloud' : 'monitor'}
                        />
                        {ws
                          .list('projects')
                          .find((p) => p.id === t.data.projectId)?.data.name ||
                          '未关联项目'}
                      </span>
                      <span className="agent-mini">◎</span>
                    </span>
                  </button>
                ))}
              {!tasks.some((t) => t.data.status === key) && (
                <Empty>暂无任务</Empty>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function Composer({
  ws,
  task,
}: {
  ws: Workspace
  task?: RecordOf<'tasks'>
}) {
  const ui = useUI(),
    fileInput = useRef<HTMLInputElement>(null),
    [error, setError] = useState('')
  const projectId =
    task?.data.projectId ??
    (ws.list('projects').some((p) => p.id === ui.projectId)
      ? ui.projectId
      : ws.list('projects')[0]?.id || '')
  const agent = task?.data.agent || ui.agent,
    env = task?.data.env || ui.env
  const agentNames = [
    ...new Set([
      agent,
      ...ws
        .list('resources')
        .filter((r) => r.data.kind === 'agents')
        .map((r) => r.data.name),
    ]),
  ]
  async function updateContext(value: { agent?: string; projectId?: string }) {
    try {
      if (task) await ws.save('tasks', { ...task.data, ...value }, task)
      else await ws.selectContext(value)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  async function send() {
    if (!ui.draft.trim() || ws.busy) return
    setError('')
    const text = ui.draft.trim(),
      files = ui.attachments
    const messages: Message[] = [
      ...(task?.data.messages || []),
      { role: 'user', text, files },
      {
        role: 'assistant',
        agent,
        text: `已记录你的需求。\n\n当前选择：${environmentName(env)}工作空间 · ${agent}。${files.length ? `\n已保存 ${files.length} 个附件名称，未上传或读取内容。` : ''}\n\n这是演示响应，未调用真实 AI 模型或执行代码。你可以继续补充要求、修改任务状态，或编排工作流。`,
      },
    ]
    try {
      const saved = await ws.save(
        'tasks',
        {
          ...(task?.data || {
            title: text.slice(0, 100),
            description: text,
            projectId,
            env,
            agent,
            status: 'todo',
          }),
          messages,
        },
        task,
      )
      ui.navigate('detail', saved.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="attachments">
          {ui.attachments.map((name, i) => (
            <span className="attachment" key={`${name}-${i}`}>
              <Icon name="file" />
              {name}
              <button
                type="button"
                aria-label={`移除 ${name}`}
                onClick={() =>
                  ui.set({
                    attachments: ui.attachments.filter((_, j) => i !== j),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <textarea
          aria-label="任务描述"
          placeholder={
            task
              ? '继续对话，或提出新的想法…'
              : '描述一个任务，让 Ora 帮你一起完成。'
          }
          value={ui.draft}
          maxLength={20000}
          onChange={(e) => ui.set({ draft: e.target.value })}
          rows={task ? 2 : 3}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <div className="composer-toolbar">
          <IconButton
            name="plus"
            label="添加附件"
            onClick={() => fileInput.current?.click()}
          />
          <Icon name="folder" />
          <select
            className="select-plain project-choice"
            aria-label="选择项目"
            value={projectId}
            disabled={ws.busy}
            onChange={(e) => updateContext({ projectId: e.target.value })}
          >
            <option value="">未关联项目</option>
            {ws.list('projects').map((p) => (
              <option key={p.id} value={p.id}>
                {p.data.name}
              </option>
            ))}
          </select>
          <div className="model-choice">
            <span className="agent-mini">◎</span>
            <select
              className="select-plain"
              aria-label="选择智能体"
              value={agent}
              disabled={ws.busy}
              onChange={(e) => updateContext({ agent: e.target.value })}
            >
              {agentNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <button
              className="send"
              type="submit"
              aria-label="发送任务"
              disabled={!ui.draft.trim() || ws.busy}
            >
              <Icon name="arrow" />
            </button>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="file-input"
          onChange={(e) => {
            ui.set({
              attachments: [
                ...ui.attachments,
                ...Array.from(e.target.files || []).map((f) => f.name),
              ],
              toast: '仅保存附件名称，不上传或读取文件内容。',
            })
            e.target.value = ''
          }}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="context-bar">
        <button
          className="row"
          onClick={() => ui.set({ dialog: { type: 'permission' } })}
        >
          <Icon name="shield" />
          {ui.permission}
          <Icon name="down" />
        </button>
        <span className="row">
          <Icon name={env === 'local' ? 'monitor' : 'cloud'} />
          {environmentName(env)}工作空间
        </span>
        <span className="row branch">
          <Icon name="branch" />
          main
        </span>
        {task && <span>演示模式 · 未连接模型</span>}
      </div>
    </>
  )
}

export function Detail({ ws }: { ws: Workspace }) {
  const ui = useUI(),
    task = ws.list('tasks').find((t) => t.id === ui.activeId)
  if (!task)
    return (
      <section className="page">
        <Empty>任务已删除。</Empty>
        <Btn onClick={() => ui.navigate('tasks')}>返回任务列表</Btn>
      </section>
    )
  const t = task.data,
    project = ws.list('projects').find((p) => p.id === t.projectId)
  const messages: Message[] = t.messages.length
    ? t.messages
    : [
        { role: 'user', text: t.description || t.title },
        {
          role: 'assistant',
          text: '这是任务的示例会话。你可以继续对话，修改任务属性，查看文件与变更示例。尚未连接 AI 模型。',
        },
      ]
  return (
    <section className="detail">
      <div className="detail-top">
        <div className="row between">
          <span className="task-meta">
            <Icon name="folder" />
            {project?.data.name || '未关联项目'} / ORA-
            {task.id.slice(0, 6).toUpperCase()}
          </span>
          <button
            className="ghost"
            onClick={() =>
              ui.set({ panel: ui.panel === 'details' ? null : 'details' })
            }
          >
            <Icon name="panel" />
            任务详情
          </button>
        </div>
        <h1>{t.title}</h1>
        <div className="row">
          <Pill status={t.status} />
          <span className="task-meta">
            {environmentName(t.env)} · {t.agent}
          </span>
          <span className="badge" style={{ marginLeft: 'auto' }}>
            演示会话
          </span>
          <IconButton
            name="edit"
            label="编辑任务"
            onClick={() => ui.set({ dialog: { type: 'task', record: task } })}
          />
          <IconButton
            name="trash"
            label="删除任务"
            onClick={() => ui.set({ dialog: { type: 'delete', record: task } })}
          />
        </div>
      </div>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-label">
              <span className="agent-mini">
                {m.role === 'user' ? '你' : '◎'}
              </span>
              {m.role === 'user' ? '你' : m.agent || t.agent}
              <small>{m.role === 'assistant' ? '演示响应' : '任务消息'}</small>
            </div>
            <div className="bubble">{m.text}</div>
            {m.files?.map((f, j) => (
              <span key={j} className="attachment">
                <Icon name="file" />
                {f}
              </span>
            ))}
          </div>
        ))}
        <div className="execution-card">
          <div className="row">
            <Icon name="shield" />
            任务上下文已保留<span className="pill">服务端保存</span>
          </div>
          <p>
            演示不读取项目代码，也不执行终端命令。消息与附件名称会持久保存。
          </p>
        </div>
      </div>
      <Composer ws={ws} task={task} />
    </section>
  )
}
