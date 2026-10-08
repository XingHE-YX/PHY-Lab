# 插件协议 v1

生产目录是运行时 catalog.json。其 schemaVersion 为 1，包含 revision 和 experiments。每条实验记录指向不可变 manifest，加载器检查协议版本后动态导入 entry，并调用 mount(context)。

公开类型见 src/infra/platform/contract.ts。context 提供 locale、theme、buildId、AbortSignal 和隔离的状态存储。instance 提供 element、update、pause、snapshot 和 dispose。不要从平台引入运行时代码；类型导入必须使用 import type。

experiment.json 的 version 与平台版本无关。build-exp 编译独立 ESM，包含实验所需 Lit；复制 assets，生成完整资源列表及 SHA-256，输出到 experiments/id/version/buildId。缩略图要求 assets/thumbnail.svg。已有同一构建路径不得覆盖不同内容。

用 `just build-exp id` 和 `just catalog` 新增或更新实验，不运行 build-app。实验 CSS 使用继承的 --bg、--surface、--text、--muted、--border、--primary 等 tokens。公开按钮为 phy-button，variant 可为 primary；公共属性、事件保持向后兼容。

复杂计算可在实验自己的 wasm 目录维护 Cargo.toml，使用 `just wasm id` 生成 web target。绑定代码和 wasm 要进入资源清单；禁止运行时外部 CDN 依赖。
