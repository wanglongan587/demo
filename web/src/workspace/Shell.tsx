import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Workspace } from './data'
import { pageTitles, useUI } from '../store/workspace'
import type { Page } from '../store/workspace'
import { Icon, IconButton, Pill } from './ui'
import type { IconName } from './ui'
import { environmentName, statuses } from './types'
import type { Status } from './types'

export function Shell({
  ws,
  children,
}: {
  ws: Workspace
  children: ReactNode
}) {
  const ui = useUI(),
    tasks = ws.list('tasks'),
    projects = ws.list('projects')
  const title = ws.list('settings')[0]?.data.name || 'Ora 工作空间'
  const task = tasks.find((t) => ui.page === 'detail' && t.id === ui.activeId),
    env = task?.data.env || ui.env
  const nav = (page: Page, label: string, icon: IconName, count?: number) => (
    <button
      key={page}
      className={`nav-item ${ui.page === page || (page === 'tasks' && ui.page === 'detail') || (page === 'workflows' && ui.page === 'workflow') ? 'active' : ''}`}
      onClick={() => ui.navigate(page)}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  )
  function toggleSidebar() {
    ui.set(
      window.innerWidth <= 680
        ? { mobile: !ui.mobile }
        : { collapsed: !ui.collapsed },
    )
  }
  async function changeEnv(value: 'local' | 'cloud') {
    try {
      if (task) await ws.save('tasks', { ...task.data, env: value }, task)
      else await ws.selectContext({ env: value })
    } catch (error) {
      ui.set({ toast: (error as Error).message })
    }
  }
  return (
    <div
      className={`app-shell ${ui.collapsed ? 'sidebar-hidden' : ''} ${ui.mobile ? 'mobile-menu' : ''}`}
    >
      <button
        className="mobile-backdrop"
        aria-label="关闭导航"
        onClick={() => ui.set({ mobile: false })}
      />
      <aside className="sidebar" aria-label="主导航">
        <div className="brand row">
          <span className="logo">
            <Icon name="ora" />
          </span>
          <span className="brand-name">ora</span>
          <span className="badge">workspace</span>
          <IconButton name="panel" label="收起侧边栏" onClick={toggleSidebar} />
        </div>
        <button
          className="workspace row"
          onClick={() => ui.set({ dialog: { type: 'settings' } })}
        >
          <span className="workspace-icon">
            <Icon name="users" />
          </span>
          <span className="grow">
            <strong>{title}</strong>
            <small>个人与团队，一处协作</small>
          </span>
          <Icon name="down" />
        </button>
        <div className="sidebar-scroll">
          <button
            className="nav-item new"
            onClick={() => ui.set({ dialog: { type: 'task' } })}
          >
            <Icon name="edit" />
            <span>新建任务</span>
            <span className="kbd">Ctrl N</span>
          </button>
          <button
            className="nav-item"
            onClick={() => ui.set({ dialog: { type: 'search' } })}
          >
            <Icon name="search" />
            <span>搜索工作空间</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <div style={{ height: 14 }} />
          {nav('home', '工作空间', 'home')}
          {nav(
            'inbox',
            '收件箱',
            'inbox',
            ws.list('notifications').filter((n) => !n.data.read).length,
          )}
          {nav('tasks', '所有任务', 'tasks', tasks.length)}
          <div className="nav-label">工作与自动化</div>
          {nav('automations', '定时任务', 'clock')}
          {nav('workflows', '工作流', 'workflow')}
          {nav('analytics', '会话分析', 'chart')}
          <div className="nav-label">AI 团队</div>
          {(['agents', 'plugins'] as const).map((kind, i) => (
            <button
              key={kind}
              className={`nav-item ${ui.page === 'resources' && (i === 0 ? ['agents', 'teams'].includes(ui.resourceKind) : ['plugins', 'skills', 'runtimes'].includes(ui.resourceKind)) ? 'active' : ''}`}
              onClick={() => {
                ui.navigate('resources')
                ui.set({ resourceKind: kind })
              }}
            >
              <Icon name={i === 0 ? 'bot' : 'plugin'} />
              <span>{i === 0 ? '智能体与小队' : '技能与插件'}</span>
            </button>
          ))}
          <div className="nav-label">
            <button onClick={() => ui.navigate('projects')}>
              项目 <span className="small">{projects.length}</span>
            </button>
            <IconButton
              name="plus"
              label="新建项目"
              onClick={() => ui.set({ dialog: { type: 'project' } })}
            />
          </div>
          {projects.map((p) => (
            <div key={p.id}>
              <button
                className="nav-item project"
                disabled={ws.busy}
                onClick={async () => {
                  try {
                    await ws.selectContext({ projectId: p.id, env: p.data.env })
                    ui.navigate('tasks')
                    ui.set({ query: p.data.name })
                  } catch (error) {
                    ui.set({ toast: (error as Error).message })
                  }
                }}
              >
                <Icon name="folder" />
                <span className="grow truncate">{p.data.name}</span>
                <Icon name={p.data.env === 'local' ? 'monitor' : 'cloud'} />
              </button>
              <div className="project-threads">
                {tasks
                  .filter((t) => t.data.projectId === p.id)
                  .slice(0, 2)
                  .map((t) => (
                    <button
                      key={t.id}
                      className="thread-link"
                      onClick={() => ui.navigate('detail', t.id)}
                    >
                      <span className="dot" />
                      <span className="truncate">{t.data.title}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => ui.set({ dialog: { type: 'settings' } })}
          >
            <Icon name="settings" />
            <span>设置与偏好</span>
          </button>
          <div className="runtime-state row">
            <span className="dot" />
            <span>{ws.busy ? '正在保存…' : '已连接演示服务'}</span>
            <span style={{ marginLeft: 'auto' }}>v1.0</span>
          </div>
          <button
            className="user-button"
            onClick={() => ui.set({ dialog: { type: 'settings' } })}
          >
            <span className="avatar">OR</span>
            <span className="grow">
              <strong>演示用户</strong>
              <small className="muted">共享工作空间</small>
            </span>
            <Icon name="down" />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn show-sidebar"
            aria-label="展开侧边栏"
            onClick={toggleSidebar}
          >
            <Icon name="panel" />
          </button>
          <span className="crumb">Elephant</span>
          <span className="separator">/</span>
          <span className="crumb current">{pageTitles[ui.page]}</span>
          <div className="top-actions">
            <div className="mode-switch" aria-label="执行环境">
              {(['local', 'cloud'] as const).map((e) => (
                <button
                  key={e}
                  disabled={ws.busy}
                  className={env === e ? 'active' : ''}
                  aria-pressed={env === e}
                  onClick={() => changeEnv(e)}
                >
                  <Icon name={e === 'local' ? 'monitor' : 'cloud'} />
                  {environmentName(e)}
                </button>
              ))}
            </div>
            <span className="top-divider" />
            {(['files', 'changes'] as const).map((p, i) => (
              <button
                key={p}
                className="ghost"
                aria-label={i ? '变更' : '文件'}
                onClick={() => ui.set({ panel: ui.panel === p ? null : p })}
              >
                <Icon name={i ? 'branch' : 'folder'} />
                <span className="toolbar-label">{i ? '变更' : '文件'}</span>
              </button>
            ))}
          </div>
        </header>
        <div className="workspace-body">
          <div className="content">{children}</div>
          {ui.panel && <SidePanel ws={ws} />}
        </div>
      </main>
    </div>
  )
}

function SidePanel({ ws }: { ws: Workspace }) {
  const ui = useUI(),
    [file, setFile] = useState('')
  const task = ws
    .list('tasks')
    .find((t) => t.id === ui.activeId && ui.page === 'detail')
  const project = ws.list('projects').find((p) => p.id === task?.data.projectId)
  return (
    <aside className="side-panel" aria-label="工作面板">
      <div className="panel-head">
        {(['files', 'changes', 'details'] as const).map((p, i) => (
          <button
            key={p}
            className={`panel-tab ${ui.panel === p ? 'active' : ''}`}
            onClick={() => ui.set({ panel: p })}
          >
            {['文件', '变更', '详情'][i]}
          </button>
        ))}
        <IconButton
          name="x"
          label="关闭面板"
          onClick={() => ui.set({ panel: null })}
        />
      </div>
      <div className="panel-content">
        {ui.panel === 'details' ? (
          <>
            <h3>任务属性</h3>
            {task ? (
              <>
                <div className="property">
                  <label htmlFor="detail-status">状态</label>
                  <select
                    id="detail-status"
                    value={task.data.status}
                    disabled={ws.busy}
                    onChange={async (e) => {
                      try {
                        await ws.save(
                          'tasks',
                          { ...task.data, status: e.target.value as Status },
                          task,
                        )
                      } catch (error) {
                        ui.set({ toast: (error as Error).message })
                      }
                    }}
                  >
                    {Object.entries(statuses).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="property">
                  <span>项目</span>
                  <span>{project?.data.name || '未关联项目'}</span>
                </div>
                <div className="property">
                  <span>智能体</span>
                  <span>{task.data.agent}</span>
                </div>
                <div className="property">
                  <span>执行环境</span>
                  <span>{environmentName(task.data.env)}</span>
                </div>
                <Pill status={task.data.status} />
                <p className="panel-note">
                  {task.data.messages.length} 条消息已保存到服务端。
                </p>
                <button
                  className="btn"
                  onClick={() =>
                    ui.set({ dialog: { type: 'task', record: task } })
                  }
                >
                  编辑任务
                </button>
              </>
            ) : (
              <p className="panel-note">打开任务后可查看属性。</p>
            )}
          </>
        ) : ui.panel === 'files' ? (
          <>
            <h3>
              文件预览 <span className="badge">示例</span>
            </h3>
            {[
              'src/',
              'src/components/Sidebar.tsx',
              'src/App.tsx',
              'package.json',
              'README.md',
            ].map((f) => (
              <button key={f} className="file-row" onClick={() => setFile(f)}>
                <Icon name={f.endsWith('/') ? 'folder' : 'file'} />
                {f}
              </button>
            ))}
            {file && (
              <pre className="code-preview">
                {file.endsWith('.tsx')
                  ? `// 示例：${file}\nexport function Workspace() {\n  return <main>Ora Workspace</main>\n}`
                  : `# ${file}\n本地与云端，共享一个工作空间。`}
              </pre>
            )}
            <p className="panel-note">以上为设计示例，不读取或修改实际仓库。</p>
          </>
        ) : (
          <>
            <h3>
              变更预览 <span className="badge">示例数据</span>
            </h3>
            <p className="panel-note">main · Sidebar.tsx</p>
            <pre className="code-preview">
              <span className="code-remove">
                − &lt;DesktopNav /&gt;
                <br />− &lt;CloudNav /&gt;
              </span>
              <br />
              <span className="code-add">+ &lt;WorkspaceNav /&gt;</span>
            </pre>
            <p className="panel-note">展示统一导航的设计示例，尚未连接 Git。</p>
          </>
        )}
      </div>
    </aside>
  )
}
