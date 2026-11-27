# 多普勒效应

独立实验 0.1.0，协议 v2，状态格式 1。选题对应《物理学教程》第四版上册 §6-6（160–164 页）。实验关注声源和观察者以同样速率移动时，波前形状和接收频率的区别。

## 假设与符号

- 空气相对画面静止，声速 $c=340\,\mathrm{m/s}$；只允许一方沿直线匀速移动，速率为 0–170 m/s。观察者在整个 0–80 ms 的观察段中始终位于声源右侧，不穿越，不涉及加速、风、反射、超声速或激波。速度 $v_{\mathrm{s}}$、$v_{\mathrm{o}}$ 以向右为正；描述「靠近」「远离」时，运动一方的速度符号随角色而变。
- 声源连续发出频率 $f_{\mathrm{s}}$ 为 200–700 Hz 的同相位波峰。第 $k$ 道在 $t_{\mathrm{e}}=k/f_{\mathrm{s}}$ 发出；截面圆心固定在 $x_{\mathrm{s}}(t_{\mathrm{e}})$，半径为 $c(t-t_{\mathrm{e}})$。使用既有的稳定波列，因而可看见 $t=0$ 前发出的波峰。圆形是球面波峰截面，不代表物质随波前移动。
- 到达时满足 $x_{\mathrm{o}}(t_{\mathrm{r}})=x_{\mathrm{s}}(t_{\mathrm{e}})+c(t_{\mathrm{r}}-t_{\mathrm{e}})$，从而 $(c-v_{\mathrm{o}})t_{\mathrm{r}}=x_{\mathrm{o}}(0)-x_{\mathrm{s}}(0)+(c-v_{\mathrm{s}})t_{\mathrm{e}}$。相邻到达事件间隔的倒数为 $f_{\mathrm{r}}=f_{\mathrm{s}}(c-v_{\mathrm{o}})/(c-v_{\mathrm{s}})$。
- 朝观察者方向的空间波长是 $\lambda_+=(c-v_{\mathrm{s}})/f_{\mathrm{s}}$。因此，声源移动改变空间波长；观察者移动时 $v_{\mathrm{s}}=0$，空间波长不变，只有遇到波峰的速率改变。详见 [OpenStax：多普勒效应](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)。

## 操作与观察

1. 在左栏通过分段开关切换「声源 / 观察者」与「靠近 / 静止 / 远离」，并调节速率与声源频率。参数改动后回到起点并暂停。静止时实际速度为零，左栏保留所选速率供「运动对照」使用，同时展示声速 $c$、速率比 $v/c$、背向波长 $\lambda_-$ 与频率比 $f_{\mathrm{r}}/f_{\mathrm{s}}$。
2. 以声源 400 Hz、速率 85 m/s 为例，声源靠近／远离时接收 533.33／320.00 Hz，观察者靠近／远离时接收 500.00／300.00 Hz，两者静止时接收 400.00 Hz。主视窗下方可开关波前、前向波长标尺 $\lambda_+$ 与速度矢量图层。
3. 「到达时刻」两行分别画波峰发射与接收事件（带周期高亮带），使用同一物理时间轴，且支持直接点击或拖动图面回看。「运动对照」支持点击三行直接切换运动状态，并提供同速反角色一键切换对照。右栏底部支持在「公式」与「探索」情境任务之间切换。
4. 动画按同一物理时间减速：1× 每现实秒推进 20 ms，慢放不更改任何物理量。关闭图层不影响计算或回放。实验不播放音频；通过波前间距、波长标尺与接收刻线频率呈现差异。刷新后恢复选择和时刻，并保持暂停。

## 本地验收

从仓库根目录运行：

```sh
bun test experiments/doppler-effect/tests
bunx playwright test --config experiments/doppler-effect/tests/playwright.config.ts
just build-exp doppler-effect
```

首次使用 Playwright 时先运行 `bunx playwright install chromium`。独立配置在 4177 端口运行生产预览，覆盖角色和运动切换、实际波前相交和到达刻线、鼠标拖动和键盘、回放和状态恢复、双语明暗单屏及首次离线进入。
