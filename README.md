# PHY Lab

纯前端物理实验工作台。通过拖动、参数调整和同步曲线探索物理过程。当前平台版本 **0.1.0**。

## 启动

需要 Bun 1.4+、just 和现代浏览器。

```sh
bun install
just dev
```

打开终端显示的本地地址。开发环境不注册离线缓存，方便热更新。

## 使用

首页搜索实验，点击卡片进入。顶部九点菜单可以返回首页；右侧切换中英文、明暗主题或打开设置。

弹簧实验：拉动小球后松手，观察运动。调整振幅、质量、劲度系数，比较周期与能量。使用播放、暂停、慢速和时间游标；切换“看运动”“看变化”“看能量”，查看同步曲线和公式。关键时刻按钮直接定位端点、平衡位置和能量相等位置。

蓝色表示位移/势能，绿色表示速度/动能，红色表示加速度。模型为水平理想弹簧、无摩擦、无外力驱动。

## 构建与离线

```sh
just check
just test
just build
just preview
```

生产预览注册 Service Worker。首次资源缓存完成后，设置中显示“可离线使用”，之后可断网打开实验。首次访问仍需网络，浏览器清除站点存储后需要重新缓存。

平台更新准备完成后可以从设置启用；运行中的实验保留当前构建。设置和实验参数使用 LocalStorage 保存。

## 独立构建

```sh
just build-app
just build-exp spring-oscillator
just catalog
```

平台和实验独立版本、独立发布。新增实验不要求更新平台。全部产物位于 dist；静态托管需 HTTPS、正确的 JS/WASM MIME 类型，并避免将资源 404 重写为首页。

## 文档

- [实施计划](docs/plan.md)
- [设计规范](DESIGN.md)
- [贡献指南](CONTRIBUTING.md)
- [插件协议](docs/plugin-contract.md)
- [发布与更新](docs/release-and-update.md)

## 许可证

[Apache License 2.0](LICENSE)。
