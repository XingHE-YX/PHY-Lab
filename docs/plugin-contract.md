# 插件协议 v1

生产目录是运行时 catalog.json。其 schemaVersion 为 1，包含 revision 和 experiments。每条实验记录指向不可变 manifest，加载器检查协议版本后动态导入 entry，并调用 mount(context)。

公开类型见 src/infra/platform/contract.ts。context 提供 locale、theme、buildId、AbortSignal 和隔离的状态存储。instance 提供 element、update、pause、snapshot 和 dispose。不要从平台引入运行时代码；类型导入必须使用 import type。

experiment.json 的 version 与平台版本无关。build-exp 编译独立 ESM，包含实验所需 Lit；复制 assets，生成完整资源列表及 SHA-256，输出到 experiments/id/version/buildId。缩略图要求 assets/thumbnail.svg。已有同一构建路径不得覆盖不同内容。

用 `just build-exp id` 和 `just catalog` 新增或更新实验，不运行 build-app。实验 CSS 使用继承的 --bg、--surface、--text、--muted、--border、--primary 等 tokens。公开按钮为 phy-button，variant 可为 primary；公共属性、事件保持向后兼容。

复杂计算可在实验自己的 wasm 目录维护 Cargo.toml，使用 `just wasm id` 生成 web target。绑定代码和 wasm 要进入资源清单；禁止运行时外部 CDN 依赖。

## 实验顶栏控件

平台可通过可选的 `context.toolbar` 提供顶栏中央区域。调用 `context.toolbar?.setControls(element)` 挂载一个实验拥有的 HTMLElement，调用 `setControls(null)` 清空；不调用时中央区域留空。容器按 flex 居中布局，控件可以使用自带 Shadow DOM 样式和平台 CSS tokens。平台不接收 Lit 模板，也不提供实验内部的渲染依赖。

实验负责控件事件及语言、主题更新，可在 `instance.update` 中更新控件。切换实验、离开实验页或加载失败时平台清空控件，已终止的 context 无法再次挂载；实验仍须在 `dispose` 中释放自己的监听器与资源。现有不使用此 API 的实验无需修改。

## 实验设置项

可选的 `context.settings` 提供当前实验页设置 dialog 内的独立区域。调用 `context.settings?.setControls(element)` 挂载实验拥有的 HTMLElement，调用 `setControls(null)` 移除。没有设置项时隐藏此区域；控制台只显示平台设置。

```ts
const panel = document.createElement("my-experiment-settings");
context.settings?.setControls(panel);
```

实验负责配置项的样式、事件、校验和持久化，可以使用平台 CSS tokens 与 `context.storage`。平台不修改配置数据，不提供 Lit 模板或自动保存语义。建议使用自带 Shadow DOM 样式的组件。语言或主题变化时在 `instance.update` 中同步设置控件。

关闭再打开 dialog 会重新挂载同一个 HTMLElement，控件的 DOM 状态和监听器保留。切换实验、返回控制台或加载失败时平台清空区域；已终止的 context 无法再次写入。实验在 `dispose` 中释放自己的资源。dialog 高度限制在视口内，较长配置可在内部滚动。
