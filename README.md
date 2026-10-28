# Ora · 统一工作空间

基于统一工作空间原型实现的前后端 demo。包含任务看板与列表、会话、项目、收件箱、定时任务配置、工作流画布、AI 团队目录、分析与设置。

## 启动

需要 Node 22+、pnpm、Go（版本见 `server/go.mod`）和 Task。Go 始终使用 `CGO_ENABLED=0`。

```sh
task install
task dev       # API :8080，浏览器 http://localhost:5173
task check     # TypeScript、生产构建、Go vet 与接口测试
task start     # 构建后单进程运行 http://localhost:8080
```

也可分别启动：

```sh
# 终端一
cd server
CGO_ENABLED=0 go run .
# 终端二（仓库根目录）
pnpm -C web dev
```

后端支持 `-addr`、`-db`、`-static`，例如 `CGO_ENABLED=0 go run . -addr 127.0.0.1:8080 -db data/demo.db -static ../web/dist`。PowerShell 先执行 `$env:CGO_ENABLED='0'` 再运行 Go 命令。Windows 可先 `task build`，再运行 `./bin/demo.exe -db server/data/demo.db -static web/dist`。

## 使用

- 首次打开数据库会写入一次示例数据。修改和删除会保留，重启不会重新灌入示例。
- 任务支持新建、编辑、删除、状态筛选、看板/列表、消息与附件名称保存；项目重命名保持任务关联。删除有关联任务的项目时，界面要求先移动任务。
- 定时任务支持配置、编辑、暂停和删除，时区固定为 Asia/Shanghai。
- 工作流支持角色与智能体配置、添加/移除条件节点、JSON 导出、演示运行与持久化的预览历史。
- AI 团队的智能体、小队、技能、插件及运行环境目录可编辑；插件“添加”只改变目录状态。
- 分析由前端根据服务端记录计算。工作空间名称、默认环境、智能体与主题可保存；全量记录可导出 JSON。
- `Ctrl/Cmd + K` 搜索、`Ctrl/Cmd + N` 新建任务、`Enter` 发送、`Shift + Enter` 换行、`Esc` 关闭弹窗。弹窗有原生焦点限制和返回焦点。

## 边界与数据

这是单工作空间演示服务，没有登录、用户隔离或权限系统；打开同一个服务的浏览器共享数据，适合本地或可信演示环境。默认数据库 `server/data/demo.db`，不会提交进 Git；使用相同 `-db` 路径启动即可恢复。

后端仅提供数据 CRUD、结构校验和 revision 并发保护，不含 Agent、工作流引擎或调度器。AI 回复和运行预览由前端模拟并明确标记；不会调用模型、读取仓库、执行终端、安装插件或上传附件。文件与 diff 面板是示例。

数据保存成功后界面才确认。请求失败保留表单或会话输入；其他页面先修改同一记录时返回冲突，需重新读取最新内容。删除项目不会自动级联删除任务，删除工作流保留历史记录（全量导出可查看）。

## API

集合为 `tasks`、`projects`、`schedules`、`workflows`、`resources`、`notifications`、`settings`、`runs`。所有记录使用 `{ id, collection, revision, updatedAt, data }`；`data` 的字段类型见 `web/src/workspace/types.ts`，服务端校验见 `server/records.go`。

| 方法   | 路径                                        | 说明                                                 |
| ------ | ------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/health`                               | 健康检查                                             |
| GET    | `/api/workspace`                            | 全部工作空间记录                                     |
| GET    | `/api/records/{collection}`                 | 集合列表                                             |
| GET    | `/api/records/{collection}/{id}`            | 单条记录                                             |
| POST   | `/api/records/{collection}`                 | 新建，正文 `{ "data": { ... } }`，返回 201           |
| PUT    | `/api/records/{collection}/{id}`            | 替换 data，正文 `{ "revision": 1, "data": { ... } }` |
| DELETE | `/api/records/{collection}/{id}?revision=1` | 删除，返回 204                                       |

服务端生成 ID、更新时间与 revision。更新和删除必须带读取时的 revision；过期返回 409，不存在返回 404，非法结构/枚举或超过 1 MiB 请求返回 400。更新为整条记录替换；任务消息随任务原子保存。`GET /api/workspace` 返回单次查询的一致结果，前端由 TanStack Query 管理服务端缓存、zustand 管理导航和输入。

原有 `/api/todos` 的 GET/POST、`/api/todos/{id}` 的 PATCH/DELETE 保留，已有待办数据不被删除。

## 结构

- `web/src/workspace/`：页面、表单、数据访问、类型与界面组件。
- `web/src/store/workspace.ts`：临时界面状态。
- `web/src/workspace.css`：从原型迁入的布局、深浅主题与响应式样式。
- `server/records.go`：SQLite 文档存储、一次性种子初始化与 CRUD HTTP 边界。
- `server/seed.json`：不含真实账号数据的演示记录。
- `server/records_test.go`：各集合 CRUD、版本冲突、并发写入、非法输入和重启恢复测试。
