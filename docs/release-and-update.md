# 发布、离线与更新

## 版本与地址

根 package.json 是平台业务版本的唯一来源，当前为 0.1.0。experiment.json 是各实验版本的唯一来源。apiVersion 是插件协议，stateVersion 是实验数据格式；它们不随业务版本自动变化。buildId 为内容指纹。

静态入口为 index.html、sw.js、release.json、catalog.json。平台 HTML 快照保存在 app/version/buildId/index.html，JS/CSS 为带 hash 的 assets。实验在 experiments/id/version/buildId 下独立发布，manifest 包含完整资源列表、字节数和 SHA-256。发布后不可覆盖这些地址。

## 构建

`just build` 生成完整站点。`just build-app` 只改变平台发布；`just build-exp id` 更新实验资源及本地 latest.json，再用 `just catalog` 生成生产目录。latest.json 只供构建工具发现，客户端使用 catalog 指向的不可变 manifest。

默认部署根路径。子路径构建使用 `PHY_BASE=/phy/ just build`，预览也使用 `PHY_BASE=/phy/ just preview`。根目录和子路径缓存相互隔离。

首次发布上传完整 dist。后续先上传不可变资源和 manifest，再验证 `just verify`，最后原子切换目录或平台 index.html/sw.js/release.json。平台及实验发布互相独立。保持旧资源以支持尚未切换的页面和回滚。Web server 必须正确提供 JS/WASM MIME，不把资源 404 重写成 HTML。

## HTTP 缓存

- 带内容 hash 的 assets、app 快照及实验资源：`Cache-Control: public, max-age=31536000, immutable`。
- index.html、sw.js、release.json、catalog.json：`Cache-Control: no-cache`。
- Service Worker 使用固定 sw.js 地址，注册时 updateViaCache 为 none。

## 离线

首次访问缓存完整平台资源，然后缓存当前协议兼容的全部实验资源。每个文件校验 SHA-256 和长度，完整成功后写完成标记。所有实验都缓存成功才提交离线 catalog。下载中断时保持上一个已完整提交的目录。

页面设置和实验状态保存在 LocalStorage。Worker 使用 Cache Storage，不能访问 LocalStorage。离线就绪状态表示当前完整目录已缓存，浏览器删除站点存储后需重新下载。

生产预览 `just preview` 启用缓存，开发环境 `just dev` 不注册 Worker。推荐用全新浏览器上下文测试首次安装：仅打开首页等待离线就绪，断网进入尚未打开的实验，刷新并使用全部模式。

开发服务器的 sw.js 返回合法的 JavaScript 退出脚本，不进入 Vite 的 HTML 回退。旧生产 Worker 更新到该脚本时，先请求页面保存状态，再注销自身并载入开发页面。开发页面也会注销同一 scope 的 PHY Lab 注册；此过程不删除 LocalStorage 或其他项目的注册与缓存。

实验预构建在 production 环境完成后还原调用进程的 NODE_ENV，开发服务器显式使用 development 环境，保证开发页面的 import.meta.env.PROD 为 false。生成的 dist 和 .build 不触发开发页面热重载。

## 更新

平台：新 Worker 先安装并校验资源，保持 waiting。用户点击保存并更新时，旧 Worker 通过 MessageChannel 请求所有页面暂停并保存状态；所有页面确认后才 skipWaiting。controllerchange 后各页面刷新。任何页面未响应时取消启用，用户可关闭该标签页后重试。

实验：运行时读取 catalog；后台完整缓存新构建。当前实例及其 entry 始终固定旧构建；退出后再进入才使用新构建。新版本失败不会覆盖原缓存，离线目录继续指向完整版本。没有兼容协议的实验不会加载。

检查更新入口同时检查平台 Worker 和实验目录；页面重新进入前台时最多每分钟检查一次。更新不会重置主题、语言或实验状态。

## 清理与回滚

清理历史缓存保留激活平台、候选 Worker 的平台、完整目录中的实验，以及任何标签页正在使用的资源。页面无响应时不清理。只清理当前 PHY Lab scope 的缓存。

实验回滚：将 catalog 指向保留的旧 manifest。平台回滚：以一个新的发布版本重新构建已验证的源代码，发布新 Worker；避免客户端一直使用同字节 Worker 而无法感知回滚。

数据格式变化增加 stateVersion，在实验初始化时通过 storage.readVersion 读取旧数据并校验迁移，成功后写入新命名空间。旧版本数据不删除。迁移失败保持旧数据可恢复，不将无效值传入模拟器。
