import { relativeTime } from './types'
import { useState } from 'react'
import { useUI } from '../store/workspace'
import type { Workspace } from './data'
import { Btn, Empty, Icon, IconButton, PageHead, Pill } from './ui'
import type { AnyRecord, ResourceKind } from './types'
import { download, environmentName, resourceKinds, statuses } from './types'

function RecordActions({
  record,
  type,
}: {
  record: AnyRecord
  type: 'project' | 'schedule' | 'workflow' | 'resource'
}) {
  const ui = useUI(),
    label =
      'name' in record.data
        ? record.data.name
        : 'title' in record.data
          ? record.data.title
          : '记录'
  return (
    <span className="row record-actions">
      <IconButton
        name="edit"
        label={`编辑${label}`}
        onClick={() => ui.set({ dialog: { type, record } })}
      />
      <IconButton
        name="trash"
        label={`删除${label}`}
        onClick={() => ui.set({ dialog: { type: 'delete', record } })}
      />
    </span>
  )
}

export function Pages({ ws }: { ws: Workspace }) {
  const ui = useUI()
  if (ui.page === 'workflow') return <WorkflowEditor ws={ws} />
  if (ui.page === 'analytics') return <Analytics ws={ws} />
  if (ui.page === 'resources') return <Resources ws={ws} />
  if (ui.page === 'inbox') return <Inbox ws={ws} />
  if (ui.page === 'projects')
    return (
      <section className="page">
        <PageHead
          title="你的项目"
          description="连接本地与云端，让上下文始终跟随工作。"
        >
          <Btn
            className="primary"
            onClick={() => ui.set({ dialog: { type: 'project' } })}
          >
            <Icon name="plus" />
            新建项目
          </Btn>
        </PageHead>
        <div className="card-grid two">
          {ws.list('projects').map((p) => (
            <article key={p.id} className="resource-card">
              <div className="row between full-width">
                <span className="resource-symbol">
                  <Icon name="folder" />
                </span>
                <RecordActions record={p} type="project" />
              </div>
              <button
                className="card-link"
                onClick={() => {
                  ui.navigate('tasks')
                  ui.set({ projectId: p.id, query: p.data.name })
                }}
              >
                <h3>{p.data.name}</h3>
              </button>
              <p>{p.data.description}</p>
              <span className="bottom">
                <span className="row">
                  <Icon name={p.data.env === 'local' ? 'monitor' : 'cloud'} />
                  {environmentName(p.data.env)}项目
                </span>
                <button
                  onClick={() => {
                    ui.navigate('tasks')
                    ui.set({ query: p.data.name })
                  }}
                >
                  {
                    ws.list('tasks').filter((t) => t.data.projectId === p.id)
                      .length
                  }{' '}
                  个任务 →
                </button>
              </span>
            </article>
          ))}
        </div>
        {!ws.list('projects').length && (
          <Empty>创建项目，为任务整理上下文。</Empty>
        )}
      </section>
    )
  if (ui.page === 'automations')
    return (
      <section className="page">
        <PageHead
          title="让日常工作，自动发生"
          description="将重复的事情交给 Ora，把时间留给更有价值的创造。"
        >
          <Btn
            className="primary"
            onClick={() => ui.set({ dialog: { type: 'schedule' } })}
          >
            <Icon name="plus" />
            新建定时任务
          </Btn>
        </PageHead>
        <div className="notice">
          <Icon name="clock" />
          配置已保存到服务端。当前演示不会后台调度或执行任务。
        </div>
        {ws.list('schedules').map((s) => (
          <div key={s.id} className="schedule-row">
            <span className="resource-symbol">
              <Icon name="clock" />
            </span>
            <div className="grow">
              <h3>{s.data.title}</h3>
              <p>
                {s.data.frequency} · {s.data.time} · Asia/Shanghai /{' '}
                {environmentName(s.data.env)}工作空间
              </p>
            </div>
            <span className={`pill ${s.data.enabled ? 'green' : ''}`}>
              {s.data.enabled ? '已启用配置' : '已暂停'}
            </span>
            <button
              className={`switch ${s.data.enabled ? 'on' : ''}`}
              role="switch"
              aria-checked={s.data.enabled}
              aria-label={`${s.data.enabled ? '暂停' : '启用'}${s.data.title}`}
              disabled={ws.busy}
              onClick={async () => {
                try {
                  await ws.save(
                    'schedules',
                    { ...s.data, enabled: !s.data.enabled },
                    s,
                  )
                } catch (error) {
                  ui.set({ toast: (error as Error).message })
                }
              }}
            />
            <RecordActions record={s} type="schedule" />
          </div>
        ))}
        {!ws.list('schedules').length && (
          <Empty>创建你的第一个定时任务配置。</Empty>
        )}
      </section>
    )
  return (
    <section className="page">
      <PageHead
        title="把好方法，变成工作流"
        description="串联智能体与工具，让复杂任务有条不紊。"
      >
        <Btn
          className="primary"
          onClick={() => ui.set({ dialog: { type: 'workflow' } })}
        >
          <Icon name="plus" />
          新建工作流
        </Btn>
      </PageHead>
      <div className="card-grid two">
        {ws.list('workflows').map((w) => (
          <article key={w.id} className="resource-card">
            <div className="row between full-width">
              <span className="resource-symbol">
                <Icon name="workflow" />
              </span>
              <RecordActions record={w} type="workflow" />
            </div>
            <button
              className="card-link"
              onClick={() => ui.navigate('workflow', w.id)}
            >
              <h3>{w.data.name}</h3>
            </button>
            <p>{w.data.description}</p>
            <span className="bottom">
              <span className="row">
                <Icon name="play" />
                开始 → Agent → 输出
              </span>
              <button onClick={() => ui.navigate('workflow', w.id)}>
                {w.data.extra ? 4 : 3} 个节点 · 编辑 →
              </button>
            </span>
          </article>
        ))}
      </div>
      {!ws.list('workflows').length && (
        <Empty>创建工作流，沉淀可复用的方法。</Empty>
      )}
      <div className="notice" style={{ marginTop: 25 }}>
        工作流配置与演示运行记录持久保存；运行预览由前端生成，不调用真实模型。
      </div>
    </section>
  )
}

function WorkflowEditor({ ws }: { ws: Workspace }) {
  const ui = useUI(),
    workflow = ws.list('workflows').find((w) => w.id === ui.activeId),
    [node, setNode] = useState('agent')
  if (!workflow)
    return (
      <section className="page">
        <Empty>工作流已删除。</Empty>
        <Btn onClick={() => ui.navigate('workflows')}>返回工作流</Btn>
      </section>
    )
  const w = workflow.data,
    runs = ws.list('runs').filter((r) => r.data.workflowId === workflow.id)
  return (
    <section className="page">
      <PageHead
        title={w.name}
        description="开始 → 处理 → 交付，一张画布管理完整流程。"
      >
        <div className="row">
          <Btn onClick={() => download('ora-workflow.json', workflow)}>
            <Icon name="download" />
            导出
          </Btn>
          <Btn
            className="primary"
            onClick={() =>
              ui.set({ dialog: { type: 'run', record: workflow } })
            }
          >
            <Icon name="play" />
            演示运行
          </Btn>
        </div>
      </PageHead>
      <div className="workflow-canvas">
        <span className="canvas-label">
          <span className="dot" />
          已保存到服务端 · {w.extra ? 4 : 3} 个节点
        </span>
        <div className="workflow-track">
          {[
            {
              id: 'start',
              icon: 'play' as const,
              title: '开始',
              text: '接收任务描述与输入内容',
            },
            {
              id: 'agent',
              icon: 'bot' as const,
              title: 'Agent 处理',
              text: `${w.agent}\n${w.role.slice(0, 60)}`,
            },
            ...(w.extra
              ? [
                  {
                    id: 'condition',
                    icon: 'branch' as const,
                    title: '条件分支',
                    text: '内容非空 → 继续输出\n否则 → 提示补充输入',
                  },
                ]
              : []),
            {
              id: 'output',
              icon: 'arrowRight' as const,
              title: '输出结果',
              text: '汇总结果并返回最终报告',
            },
          ].map((n, index) => (
            <div className="flow-segment" key={n.id}>
              {index > 0 && <div className="flow-connector" />}
              <button
                className={`flow-node ${node === n.id ? 'selected' : ''}`}
                onClick={() => {
                  setNode(n.id)
                  if (n.id === 'agent')
                    ui.set({ dialog: { type: 'node', record: workflow } })
                  else ui.set({ toast: n.text })
                }}
              >
                <span className="row">
                  <span className="resource-symbol">
                    <Icon name={n.icon} />
                  </span>
                  <h3>{n.title}</h3>
                </span>
                <p>{n.text}</p>
              </button>
            </div>
          ))}
        </div>
        <div className="canvas-tools">
          <button
            className="ghost"
            onClick={() =>
              ui.set({ dialog: { type: 'node', record: workflow } })
            }
          >
            <Icon name="settings" />
            配置 Agent
          </button>
          <button
            className="ghost"
            disabled={ws.busy}
            onClick={async () => {
              try {
                await ws.save('workflows', { ...w, extra: !w.extra }, workflow)
              } catch (error) {
                ui.set({ toast: (error as Error).message })
              }
            }}
          >
            <Icon name={w.extra ? 'x' : 'branch'} />
            {w.extra ? '移除' : '添加'}条件分支
          </button>
        </div>
      </div>
      <p className="panel-note">
        节点配置、导出与演示预览可使用。实际 Agent
        执行需要另行连接模型与运行服务。
      </p>
      <div className="section-heading">
        <h2>运行预览记录</h2>
        <span className="muted small">演示数据 · 服务端保存</span>
      </div>
      {runs.length ? (
        runs.map((r) => (
          <div className="flow-log" key={r.id}>
            <div className="row between">
              <strong>{r.data.title}</strong>
              <span className="row">
                <span className="muted small">{relativeTime(r.updatedAt)}</span>
                <IconButton
                  name="trash"
                  label="删除运行记录"
                  onClick={() =>
                    ui.set({ dialog: { type: 'delete', record: r } })
                  }
                />
              </span>
            </div>
            <p className="pre-wrap">{r.data.output}</p>
          </div>
        ))
      ) : (
        <Empty>还没有运行预览。输入一个任务，查看节点流转。</Empty>
      )}
    </section>
  )
}

function Resources({ ws }: { ws: Workspace }) {
  const ui = useUI(),
    kind = ui.resourceKind
  const items = ws
    .list('resources')
    .filter(
      (r) =>
        r.data.kind === kind &&
        `${r.data.name} ${r.data.description}`
          .toLowerCase()
          .includes(ui.query.toLowerCase()),
    )
  return (
    <section className="page">
      <PageHead
        title="为你的工作，找到合适的伙伴"
        description="智能体、技能与工具，在同一处协同。"
      >
        <Btn onClick={() => ui.set({ dialog: { type: 'resource' } })}>
          <Icon name="plus" />
          新建{resourceKinds[kind]}
        </Btn>
      </PageHead>
      <div className="tabs resource-tabs">
        {Object.entries(resourceKinds).map(([k, label]) => (
          <button
            key={k}
            className={`tab ${kind === k ? 'active' : ''}`}
            onClick={() =>
              ui.set({ resourceKind: k as ResourceKind, query: '' })
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="page-tools">
        <div className="search-field">
          <Icon name="search" />
          <input
            aria-label="搜索资源"
            placeholder={`搜索${resourceKinds[kind]}…`}
            value={ui.query}
            onChange={(e) => ui.set({ query: e.target.value })}
          />
        </div>
        <span className="muted small">演示目录 · 配置持久保存</span>
      </div>
      <div className="card-grid">
        {items.map((r) => (
          <article key={r.id} className="resource-card">
            <div className="row between full-width">
              <span className="resource-symbol">
                <Icon
                  name={
                    kind === 'teams'
                      ? 'users'
                      : kind === 'plugins'
                        ? 'plugin'
                        : kind === 'runtimes'
                          ? 'monitor'
                          : kind === 'skills'
                            ? 'book'
                            : 'bot'
                  }
                />
              </span>
              <RecordActions record={r} type="resource" />
            </div>
            <h3>{r.data.name}</h3>
            <p>{r.data.description}</p>
            <div className="bottom">
              <span>{r.data.meta}</span>
              {kind === 'plugins' ? (
                <Btn
                  disabled={ws.busy}
                  onClick={async () => {
                    try {
                      await ws.save(
                        'resources',
                        { ...r.data, installed: !r.data.installed },
                        r,
                      )
                      ui.set({
                        toast: r.data.installed
                          ? '已从演示目录移除'
                          : '已添加到演示目录，不会安装软件',
                      })
                    } catch (error) {
                      ui.set({ toast: (error as Error).message })
                    }
                  }}
                >
                  {r.data.installed ? '已添加' : '添加'}
                </Btn>
              ) : kind === 'runtimes' ? (
                <Btn
                  onClick={() =>
                    ui.set({ dialog: { type: 'runtime', record: r } })
                  }
                >
                  配置
                </Btn>
              ) : (
                <Btn
                  disabled={ws.busy}
                  onClick={async () => {
                    try {
                      if (kind === 'agents')
                        await ws.selectContext({ agent: r.data.name })
                      ui.navigate('home')
                      if (kind !== 'agents')
                        ui.set({
                          draft: `请按照「${r.data.name}」的方法，${r.data.meta}，帮助我完成以下任务：`,
                        })
                    } catch (error) {
                      ui.set({ toast: (error as Error).message })
                    }
                  }}
                >
                  {kind === 'agents' ? '使用' : '使用模板'}
                  <Icon name="arrowRight" />
                </Btn>
              )}
            </div>
          </article>
        ))}
      </div>
      {!items.length && <Empty>没有匹配的资源。</Empty>}
    </section>
  )
}

function Inbox({ ws }: { ws: Workspace }) {
  const ui = useUI()
  async function markAll() {
    try {
      for (const n of ws.list('notifications').filter((n) => !n.data.read))
        await ws.save('notifications', { ...n.data, read: true }, n)
      ui.set({ toast: '所有通知已标记为已读' })
    } catch (error) {
      ui.set({ toast: (error as Error).message })
    }
  }
  return (
    <section className="page">
      <PageHead title="收件箱" description="值得你关注的进展，不错过任何一步。">
        <Btn disabled={ws.busy} onClick={markAll}>
          <Icon name="check" />
          全部标记为已读
        </Btn>
      </PageHead>
      <div className="notice">工作空间示例通知；已读状态保存到服务端。</div>
      {ws.list('notifications').map((n) => (
        <div className={`inbox-row ${n.data.read ? '' : 'unread'}`} key={n.id}>
          <button
            className="row grow inbox-link"
            disabled={ws.busy}
            onClick={async () => {
              try {
                if (!n.data.read)
                  await ws.save('notifications', { ...n.data, read: true }, n)
                if (ws.list('tasks').some((t) => t.id === n.data.taskId))
                  ui.navigate('detail', n.data.taskId)
                else ui.navigate('projects')
              } catch (error) {
                ui.set({ toast: (error as Error).message })
              }
            }}
          >
            <span className="resource-symbol">
              <Icon name="inbox" />
            </span>
            <span className="grow">
              <h3>{n.data.title}</h3>
              <p>{n.data.text}</p>
            </span>
          </button>
          <IconButton
            name="trash"
            label={`删除通知${n.data.title}`}
            onClick={() => ui.set({ dialog: { type: 'delete', record: n } })}
          />
        </div>
      ))}
      {!ws.list('notifications').length && <Empty>收件箱已清空。</Empty>}
    </section>
  )
}

function Analytics({ ws }: { ws: Workspace }) {
  const tasks = ws.list('tasks'),
    total = tasks.length,
    completed = tasks.filter((t) => t.data.status === 'done').length,
    ui = useUI()
  return (
    <section className="page">
      <PageHead
        title="每一次进展，都有迹可循"
        description="从任务分布到执行记录，了解工作空间的运行情况。"
      >
        <Btn onClick={() => download('ora-workspace.json', ws.data)}>
          <Icon name="download" />
          导出记录
        </Btn>
      </PageHead>
      <div className="notice">
        根据服务端保存的任务计算，不代表真实模型用量或实际执行。
      </div>
      <div className="stats">
        <div className="stat">
          <span>任务总数</span>
          <strong>{total}</strong>
          <span>
            本地 {tasks.filter((t) => t.data.env === 'local').length} · 云端{' '}
            {tasks.filter((t) => t.data.env === 'cloud').length}
          </span>
        </div>
        <div className="stat">
          <span>已完成</span>
          <strong>{completed}</strong>
          <span className="pill green">
            完成率 {total ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
        <div className="stat">
          <span>待审查</span>
          <strong>
            {tasks.filter((t) => t.data.status === 'review').length}
          </strong>
          <span>等待你的下一步</span>
        </div>
      </div>
      <h3>任务状态分布</h3>
      <div className="chart">
        {Object.entries(statuses).map(([k, label]) => {
          const count = tasks.filter((t) => t.data.status === k).length
          return (
            <div className="chart-col" key={k}>
              <span>{count}</span>
              <div
                className="chart-bar"
                style={{
                  height: Math.max(4, (count / Math.max(1, total)) * 170),
                }}
              />
              <span>{label}</span>
            </div>
          )
        })}
      </div>
      <div className="section-heading">
        <h2>会话记录</h2>
        <span className="muted small">当前工作空间</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>任务</th>
              <th>智能体</th>
              <th>环境</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.data.title}</td>
                <td>{t.data.agent}</td>
                <td>{environmentName(t.data.env)}</td>
                <td>
                  <Pill status={t.data.status} />
                </td>
                <td>
                  <button
                    className="ghost"
                    onClick={() => ui.navigate('detail', t.id)}
                  >
                    查看
                    <Icon name="arrowRight" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
