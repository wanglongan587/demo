import type { ComponentProps, ReactNode } from 'react'
import {
  ArrowUp,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Code2,
  Download,
  File,
  Folder,
  GitBranch,
  House,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  Monitor,
  MoreHorizontal,
  Network,
  PanelLeft,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  Workflow,
  X,
  Cloud,
  ChartColumn,
  Puzzle,
  BookOpen,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { statuses } from './types'
import type { Status } from './types'

const icons = {
  arrow: ArrowUp,
  arrowRight: ArrowRight,
  bot: Bot,
  check: Check,
  checkCircle: CheckCircle2,
  down: ChevronDown,
  circle: Circle,
  clock: Clock,
  code: Code2,
  download: Download,
  file: File,
  folder: Folder,
  branch: GitBranch,
  home: House,
  inbox: Inbox,
  grid: LayoutGrid,
  list: List,
  menu: Menu,
  monitor: Monitor,
  more: MoreHorizontal,
  panel: PanelLeft,
  edit: Pencil,
  play: Play,
  plus: Plus,
  search: Search,
  settings: Settings,
  shield: Shield,
  users: Users,
  workflow: Workflow,
  x: X,
  cloud: Cloud,
  chart: ChartColumn,
  plugin: Puzzle,
  book: BookOpen,
  trash: Trash2,
  refresh: RefreshCw,
  ora: Network,
  tasks: List,
}
export type IconName = keyof typeof icons
export function Icon({
  name,
  ...props
}: { name: IconName } & ComponentProps<'svg'>) {
  const Component = icons[name]
  return <Component {...props} className={`icon ${props.className || ''}`} />
}
export function Btn({
  className = '',
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" className={`btn ${className}`} {...props}>
      {children}
    </Button>
  )
}
export function IconButton({
  name,
  label,
  ...props
}: { name: IconName; label: string } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={name} />
    </button>
  )
}
export function StatusIcon({ status }: { status: Status }) {
  return (
    <span className={`status-icon ${status}`}>
      <Icon
        name={
          status === 'done'
            ? 'checkCircle'
            : status === 'review'
              ? 'clock'
              : 'circle'
        }
      />
    </span>
  )
}
export function Pill({ status }: { status: Status }) {
  return (
    <span
      className={`pill ${status === 'done' ? 'green' : status === 'running' ? 'amber' : status === 'review' ? 'purple' : ''}`}
    >
      {statuses[status]}
    </span>
  )
}
export function PageHead({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  )
}
export function Empty({
  children = '这里还没有内容。',
}: {
  children?: ReactNode
}) {
  return <div className="empty">{children}</div>
}
