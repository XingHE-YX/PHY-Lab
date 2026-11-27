# 碰撞与动量守恒

独立实验 0.1.0，协议 v2，状态格式 1。选题对应《物理学教程》第四版上册 §3-7（69–71 页）。

## 假设与符号

- 两个滑块沿无摩擦水平直轨运动，实验期间水平方向合外力为零。向右为正，A 初始在 B 左侧；两车中心坐标是 −1.80 m、+1.80 m，车宽均为 1.00 m。车宽不随质量改变。质量可在 0.50–4.00 kg 调节，初速度可在 −3.00–3.00 m/s 调节。
- 车身之间的初始空隙为 2.60 m。若 $u_\mathrm{A}>u_\mathrm{B}$，接触时刻为 $t_\mathrm{c}=2.60\,\mathrm{m}/(u_\mathrm{A}-u_\mathrm{B})$；否则不会相撞。接触视为瞬时事件，位置连续，$t=t_\mathrm{c}$ 读取碰撞后的速度。模型不模拟形变、受力时间曲线或轨道末端反弹。
- 系统总动量 $P=m_\mathrm{A}v_\mathrm{A}+m_\mathrm{B}v_\mathrm{B}$，质心速度 $v_\mathrm{cm}=P/(m_\mathrm{A}+m_\mathrm{B})$。弹性碰撞使相对速度反向、大小不变；完全非弹性碰撞使两车以 $v_\mathrm{cm}$ 粘连前进。
- 总动能为 $K=\tfrac12m_\mathrm{A}v_\mathrm{A}^2+\tfrac12m_\mathrm{B}v_\mathrm{B}^2$。两种碰撞的 $P$ 均不变，只有弹性碰撞的 $K$ 不变。完全非弹性碰撞转化的动能为 $\tfrac12\mu(u_\mathrm{A}-u_\mathrm{B})^2$，其中 $\mu=m_\mathrm{A}m_\mathrm{B}/(m_\mathrm{A}+m_\mathrm{B})$；这不是系统总能量消失。参见 [OpenStax：碰撞类型](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions)。

## 操作与观察

1. 调节各车质量、初速度和碰撞类型，或载入迎面相撞、等质量速度交换、同速不相撞预设。在起点可拖速度箭头，或聚焦后用方向键调初速度。改变条件时，两车从原始位置重新开始并保持暂停。
2. 用「接触前」「接触后」对比总动量与总动能；场景、读数、表格和分量曲线共用解析状态。默认输入下，两种碰撞的总动量均为 2.75 kg·m/s；弹性碰撞总动能约 5.19 J 不变，完全非弹性碰撞后约 1.51 J。不发生碰撞时，比较表的碰撞后栏留空，接触按钮不可用。
3. 通过时间滑块或点击曲线回看。在碰撞瞬间速度跃变，动量和动能图用跳变线连接，未模拟这段之间的过渡值。可慢放或隐藏速度箭头而不更改物理量。
4. 场景镜头跟随两车中点，刻度显示地面坐标，速度和动量仍使用地面参考系。一轮播放结束于接触后 2.05 s；无接触的试验显示 2.75 s。刷新恢复参数、时刻和观察偏好，并保持暂停。

## 本地验收

从仓库根目录运行：

```sh
bun test experiments/collision-momentum/tests
bunx playwright test --config experiments/collision-momentum/tests/playwright.config.ts
just build-exp collision-momentum
```

首次使用 Playwright 时先运行 `bunx playwright install chromium`。独立配置在 4178 端口使用生产预览，覆盖两类碰撞、无接触边界、拖动与键盘、双语明暗单屏、状态恢复和首次离线进入。
