# 电场与电势

独立实验 0.1.0，协议 v2，状态格式 1。选题对应《物理学教程》第四版下册 §9-3、§9-6、§9-7（4–10、23–30 页）。

## 模型与显示

- 显示真空中两个理想点电荷所在平面的截面，不是二维空间中的对数势。坐标单位为 m，$x$ 向右、$y$ 向上。电荷可在 −8 到 +8 nC 调节；0 nC 不产生贡献。两点至少相距 0.60 m。只比较静电构型，不模拟电荷运动、耗散或传播延迟。
- 取无穷远为零电势。点电荷贡献 $V_i=kq_i/r_i$，$\mathbf E_i=kq_i(\mathbf r-\mathbf r_i)/r_i^3$；分别按标量和矢量分量叠加。电势是 V，电场和分量是 V/m。电场方向为正试探电荷的受力方向；图上箭头采用固定长度，大小以探针读数为准。
- 绘制 −80、−40、−20、−10、−5、0、5、10、20、40、80 V 等势线，仅显示位于场区内的部分。正势用实线，负势用虚线，零势线加粗。普通等势线从 $128\times72$ 网格插值得到；等量异号时，中垂线直接由几何求出。若两电荷均为零，整个场区等势，不绘制孤立的零线。
- 在非零电荷中心 0.22 m 内不取样，不将奇点替换为有限数值；探针读数为「—」，剖面也留缺口。剖面过 P 且平行于 A → B，用 $s=0$ 标识 P，沿该方向的场分量为 $E_{\parallel}=-\mathrm dV/\mathrm ds$。详见 [OpenStax：等势面与导体](https://openstax.org/books/university-physics-volume-2/pages/7-5-equipotential-surfaces-and-conductors)。

## 操作与对照

1. 拖动电荷 A、B 或探针 P；也可聚焦对象后使用方向键（按住 Shift 步长变大）、点击场区空白放置探针，或在右栏「电势剖面」图上直接拖动沿剖面线滑动探针。左栏下方实时显示电荷间距 $d_{\mathrm{AB}}$、净电荷与探针距两电荷的距离 $r_{\mathrm{A}}, r_{\mathrm{B}}$。
2. 默认的「等量异号」构型是左侧 +4 nC、右侧 −4 nC，间距 2.80 m。中点处 $V=0$，而 $|\mathbf E|\approx36.68\,\mathrm{V/m}$，指向右侧负电荷。沿中垂线移动探针，电势仍为零但场强变化；主视窗底部提供「探针移到中点 / 中垂线上 / 连线外侧」3 组快捷定位按钮。
3. 在右栏底部「探索」页一键载入「等量异号」「等量同为正」「不等量异号」与「单点电荷径向场」情境。右栏「探针叠加」同时展示逐项数值表、矢量合成罗盘与电势标量条；「电势剖面」实时标注沿剖面分量 $E_\parallel$。
4. 场图、剖面与探针共用一套解析模型。主视窗下方可独立开关电场箭头、等势线与探针分量矢量 $\mathbf E_{\mathrm A}, \mathbf E_{\mathrm B}$ 图层，切换图层不会移动探针。静电实验不需要播放或时间轴；刷新后恢复电荷、探针与图层偏好。

## 本地验收

从仓库根目录运行：

```sh
bun test experiments/electric-field-potential/tests
bunx playwright test --config experiments/electric-field-potential/tests/playwright.config.ts
just build-exp electric-field-potential
```

首次使用 Playwright 时先运行 `bunx playwright install chromium`。独立配置在 4179 端口运行生产预览，验证点电荷边界、旋转后的零线、相反的中点读数、拖动和键盘、双语明暗单屏、状态恢复及首次离线进入。
