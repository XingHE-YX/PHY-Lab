# 实验插件协议

当前平台支持 **v1 revision 0** 和 **v2 revision 0**。现有实验使用 v2；v1 保留原来的运行接口。版本参考：[v1](protocols/v1.md)、[v2](protocols/v2.md)，控件参考：[公共组件](ui-components.md)。

## 代码位置

- `src/infra/platform/protocols/<version>/api`：该协议的 API 类型。
- `components`：该协议支持的组件类型；实现和样式统一放在 `src/ui/components`。
- `metadata.ts`：`experiment.json` 和发布 manifest 的解析规则。
- `capabilities.ts`：当前修订号，以及各 API、组件首次支持的修订号。
- `context.ts`：本版本的 context 与挂载逻辑。
- `index.ts`：类型出口和协议描述。

`protocols/index.ts` 是唯一同时注册多个主协议的生产代码文件。`compatibility.ts` 查找已注册协议，在同一主版本内检查最低修订号。构建、加载器、首页筛选和 Service Worker 共用该判断，不各自维护版本列表。

`src/infra/platform/contract.ts` 是旧类型导入的兼容入口，实验运行接口固定指向 v1。新实验显式使用版本路径：

```ts
import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
```

实验只能从平台导入类型，运行时不导入平台私有服务或控件实现。平台注册公共元素；实验使用 `<phy-input>` 等标签。实验自身的 Lit、模型和资源仍独立打包。

## 版本含义

| 字段           | 含义                                 |
| -------------- | ------------------------------------ |
| `version`      | 实验发布版本                         |
| `apiVersion`   | 配置解析、运行接口及组件契约的主版本 |
| `apiRevision`  | 实验要求的最低修订号；省略视为 0     |
| `stateVersion` | 实验保存状态的格式版本               |
| `buildId`      | 元信息及构建资源的内容指纹           |

兼容扩展可以增加修订号，破坏现有接口时才增加主版本。组件样式始终统一，修改圆角、配色不需要增加协议版本。状态格式变化由实验独立决定，与协议版本无关。

旧平台拒绝 v2 实验。新版平台准确匹配注册的主版本，然后比较修订号；不通过主版本数字大小推测兼容性。未知主版本或超过支持范围的修订不会导入实验模块。

目录 `catalog.json` 的 `schemaVersion: 1` 管理目录包络，与单个实验的协议版本独立。

## 加载与生命周期

平台读取 catalog，按 `apiVersion` 选择 manifest 解析器，检查修订与资源范围，动态导入 entry 并调用 `mount(context)`。实验返回：

```ts
interface ExperimentInstance {
  element: HTMLElement;
  update(context: { locale: "zh-CN" | "en"; theme: "light" | "dark" }): void;
  pause(): void;
  snapshot(): unknown;
  dispose(): void;
}
```

平台挂载 `element`，语言和主题变化时调用 `update`。异步挂载期间发生的环境变化也会在挂载完成后同步。退出时终止 `signal`、清空挂载区域、暂停、保存快照并释放实例。挂载已经被取消时，返回的实例会被释放，不插入页面。

实验负责动画、监听器、音频、WebGL 等自身资源。可将监听器、请求绑定 `context.signal`，并在 `dispose` 中完成清理。

## 顶栏与实验设置

```ts
context.toolbar?.setControls(toolbarElement);
context.settings?.setControls(settingsElement);

// 移除挂载内容
context.toolbar?.setControls(null);
context.settings?.setControls(null);
```

两者接收实验拥有的 HTMLElement，不接收 Lit 模板。顶栏居中布局；设置内容位于平台设置 dialog 的实验标签页。v2 可以通过 metadata 的 settings.tabs 和 `setControls(element, tabId)` 注册命名标签，v1 与原来的单参数调用继续使用默认“实验设置”页。实验负责配置项事件、校验和保存，语言变化时在 `update` 中更新内容。

关闭再打开设置会使用同一个 HTMLElement，保留节点身份及监听器。退出、切换实验或加载失败时平台清空区域，旧 context 无法再次挂载。较长的设置内容在 dialog 正文中滚动。

## 状态存储

```ts
const saved = context.storage.read(defaultState);
const old = context.storage.readVersion<unknown>(1, null);
context.storage.write(nextState);
```

LocalStorage 键为 `phy-lab:experiment:<id>:state:<stateVersion>`。这是命名空间隔离，同源实验仍处于同一个浏览器环境。

实验验证保存值的结构、范围和有限性。`read<T>` 的类型参数不做运行时校验。数据格式升级时读取旧命名空间、校验迁移、写入新命名空间，保留旧数据供回滚。兼容新增字段可以补默认值，不必无条件增加状态版本。

## 独立构建与离线

`just build-exp <id>` 编译独立 ESM，复制实验 assets，生成资源大小及 SHA-256；`just catalog` 更新目录。发布地址为 `experiments/id/version/buildId`，不可覆盖。缩略图默认使用 `assets/thumbnail.svg`。v2 可在 metadata 中用 `thumbnail` 指定固定图片，或 `{ light, dark }` 两张图片；路径均在实验 assets 内，详见 [v2 缩略图](protocols/v2.md#缩略图)。

平台资源和实验资源分别进入发布、离线清单。公共公式组件及其字体归平台所有，v2 实验无需重复打包 KaTeX。原有 v1 实验携带的资源仍按原清单缓存。运行中的实验固定当前构建，离开再进入才启用更新。

## 未发布分支的草案约定

当前 feat/protocol-v2 分支尚未发布，后续草案修改保持协议版本、修订号、实验发布版本和状态版本不变；平台业务版本为 0.2.0。构建指纹仍随实际内容变化。

分类使用一个可选 catagory 对象，细分使用 tags。作者支持单个对象或数组，每个作者当前仅有 name 与可选 url。实验设置标签在 v2 metadata 内声明，不能与系统设置页冲突。
