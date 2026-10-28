# demo

Ora 的演示用 demo：一个中文待办清单，前端 React，后端 Go + SQLite。

## 技术栈

- 前端 `web/`：Vite、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、TanStack Query、zustand
- 后端 `server/`：Go 标准库 `net/http`、SQLite（`modernc.org/sqlite`，纯 Go，无需 cgo）

## 开发

需要 Node 22+、pnpm、Go 1.27+ 和 [Task](https://taskfile.dev)。

```sh
task install   # 安装依赖
task dev       # 后端 :8080，前端 http://localhost:5173
task check     # 类型检查、构建、测试
task start     # 构建后单进程运行：http://localhost:8080
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/todos` | 列出事项 |
| POST | `/api/todos` | 新建，`{"title": "..."}` |
| PATCH | `/api/todos/{id}` | 修改完成状态，`{"done": true}` |
| DELETE | `/api/todos/{id}` | 删除 |
