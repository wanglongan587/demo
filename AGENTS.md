- 工作过程中临时文件放在各级工作目录的 .tmp 下，例如 clone 的源码等。
- 脚本所需依赖也放到 .tmp 下，例如 Python venv。

# demo

为演示临时开发的小型 demo，界面一律中文。

- `web/`：Vite + React 19 + TypeScript，UI 用 shadcn（`pnpm dlx shadcn@latest add <组件>`，生成到 `src/components/ui/`），服务端数据用 TanStack Query，客户端状态用 zustand（`src/store/`）。开发时 `/api` 代理到 `localhost:8080`。
- `server/`：Go 标准库 `net/http` + SQLite（`modernc.org/sqlite`，纯 Go，始终 `CGO_ENABLED=0`，不引入需要 cgo 的依赖）。数据库默认在 `server/data/`，不入库。
- 常用命令见 `Taskfile.yml`：`task dev` 同时启动前后端，`task check` 跑类型检查、构建和测试，提交前先跑通。
