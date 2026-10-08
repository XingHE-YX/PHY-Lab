# 贡献指南

PHY Lab 使用 Apache License 2.0。提交贡献即表示你有权提供该代码，并同意按项目许可证发布。

## 开发环境

安装 Bun 1.4+ 和 just。`bun install` 安装依赖；`just dev` 启动开发环境。构建脚本必须使用 TypeScript，由 Bun 执行。Rust、wasm-pack 只用于确实需要复杂计算的实验。

## 代码边界

- 平台 UI 放在 src/ui，路由页面放在 src/pages。
- 平台国际化和插件公开协议放在 src/infra。
- 设置与资源生命周期等服务放在 src/services。
- 实验只依赖公开协议，内部模型与资源保持自包含。
- 禁止实验互相引用，禁止将实验业务塞进全局服务。
- 简单解析计算使用 TypeScript；使用 WASM 前说明计算收益。
- 不加入服务端依赖，运行资源必须可离线访问。

## 新增实验

在 experiments 下新建以短横线命名的目录，提供 experiment.json 与 index.ts，实现公开的 mount 协议。文案、样式、缩略图、测试和可选 wasm 均放在目录内部。

实验使用独立版本。`just build-exp <id>` 构建实验，`just catalog` 更新目录。新增实验不修改平台版本。

## 版本与发布

平台版本只修改根 package.json；实验版本只修改对应 experiment.json。协议版本和存储格式版本独立管理。已发布文件不可覆盖，内容变化需要新版本/新构建地址。

先上传资源，确认完整性后更新目录或发布指针。平台更新保存状态后启用；实验运行中保持原构建。生产发布和回滚见 docs/release-and-update.md。

## 检查与提交

提交前运行 `just check`、`just test` 和 `just build`。涉及离线或资源加载的修改还需验证生产预览中的首次缓存、断网刷新和更新失败回退。

每个功能单独 commit，使用 `feat:`、`fix:`、`docs:`、`test:` 或 `chore:` 前缀。避免混合多个无关功能。PR 描述说明最终行为、验证结果及实际限制。
