import { useEffect, useRef } from 'react'
import { useWorkspace } from './workspace/data'
import { useUI } from './store/workspace'
import { Shell } from './workspace/Shell'
import { Tasks, Home, Detail } from './workspace/Tasks'
import { Pages } from './workspace/Pages'
import { Dialogs } from './workspace/Dialogs'
import { Btn } from './workspace/ui'
import './workspace.css'

export default function App() {
  const ws = useWorkspace(),
    ui = useUI(),
    initialized = useRef(false)
  const settings = ws.list('settings')[0]?.data
  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true
      useUI
        .getState()
        .set({
          env: settings.env,
          projectId: settings.projectId,
          agent: settings.agent,
        })
    }
    document.body.classList.toggle('dark', settings?.theme === 'dark')
  }, [settings])
  useEffect(() => {
    if (!ui.toast) return
    const timer = setTimeout(() => useUI.getState().set({ toast: '' }), 4500)
    return () => clearTimeout(timer)
  }, [ui.toast])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ['k', 'n'].includes(event.key.toLowerCase())
      ) {
        event.preventDefault()
        if (!useUI.getState().dialog)
          useUI
            .getState()
            .set({
              dialog: {
                type: event.key.toLowerCase() === 'k' ? 'search' : 'task',
              },
            })
      }
      if (event.key === 'Escape' && !useUI.getState().dialog)
        useUI.getState().set({ panel: null, mobile: false })
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])
  if (ws.isPending)
    return (
      <div className="startup" role="status">
        正在载入工作空间…
      </div>
    )
  if (ws.isError && !ws.data)
    return (
      <div className="startup" role="alert">
        <h1>暂时无法连接工作空间</h1>
        <p>{ws.error.message}</p>
        <Btn onClick={() => ws.refetch()}>重新连接</Btn>
      </div>
    )
  return (
    <>
      <Shell ws={ws}>
        {ws.isError && (
          <div className="error-banner" role="alert">
            无法刷新最新数据。<button onClick={() => ws.refetch()}>重试</button>
          </div>
        )}
        {ui.page === 'home' ? (
          <Home ws={ws} />
        ) : ui.page === 'tasks' ? (
          <Tasks ws={ws} />
        ) : ui.page === 'detail' ? (
          <Detail ws={ws} />
        ) : (
          <Pages ws={ws} />
        )}
      </Shell>
      <Dialogs ws={ws} />
      {ui.toast && (
        <div id="toast" className="visible" role="status">
          {ui.toast}
        </div>
      )}
    </>
  )
}
