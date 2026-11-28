# 单缝衍射

## 模型和读数

相干单色光垂直且均匀地照射宽度为 $a$ 的单缝。垂直于光轴的屏位于距离 $L$ 处。模型使用夫琅禾费衍射，忽略有限缝长、非均匀照明和近场效应。

屏上横坐标 $x$ 从中央亮纹中心起算。计算时将缝宽、波长和屏上坐标统一为米，左右两侧使用相同的角度关系。

```text
sin θ = x / √(L² + x²)
β = πa sin θ / λ
I(x)/I₀ = (sin β / β)²，β = 0 时取极限 1
```

第 $m$ 级暗纹满足 $a \sin\theta = m\lambda$。中央亮纹宽度取两侧第一暗纹之间的距离 $W=2L\tan(\arcsin(\lambda/a))$。本实验使用准确的屏幕投影。小角度下，$W \approx 2L\lambda/a$，因此固定波长和屏距时，缩小缝宽会扩大中央亮纹。

| 参数           | 范围        | 初始值  |
| -------------- | ----------- | ------- |
| 缝宽 $a$       | 40–160 μm   | 80 μm   |
| 波长 $\lambda$ | 400–700 nm  | 550 nm  |
| 屏距 $L$       | 0.80–2.00 m | 1.20 m  |
| 屏上位置 $x$   | −40–40 mm   | 0.00 mm |

初始参照缝宽为 160 μm。当前和参照的中央亮纹宽度分别约为 16.50 mm 和 8.25 mm。参照共享当前的波长和屏距，只固定缝宽。

屏上条纹和曲线使用相同的光强样本，包含落在屏内的理论暗纹位置。曲线按各自峰值 $I_0$ 归一化，使用线性比例。条纹色相近似对应波长，透明度按 $\sqrt{I/I_0}$ 映射以显示较弱的旁瓣。可比较相对光强和宽度，实际透射功率还取决于缝宽与入射强度。

## 操作与恢复

- 用「窄缝」「宽缝」迅速切换缝宽，或将任意当前缝宽设为参照后继续调节。调整波长或屏距会同时更新两组条纹和曲线。
- 在屏上条纹或光强曲线拖动探针，两组相对光强同步更新。也可用位置滑块或按键操作。「第一暗纹」将探针对准当前条纹正侧的第一暗纹，精确到 0.01 mm。
- 「标记第一暗纹」控制屏上的暗纹标记和图中的中央亮纹高亮。
- 重新打开实验时恢复三个参数、参照缝宽、探针和暗纹标记。重置恢复全部默认值。

## 验证

在仓库根目录运行 `bun test experiments/single-slit-diffraction/tests` 以及 `bunx playwright test -c experiments/single-slit-diffraction/tests/playwright.config.ts`。

公式参考 OpenStax《University Physics Volume 3》。[单缝暗纹条件](https://openstax.org/books/university-physics-volume-3/pages/4-1-single-slit-diffraction) · [单缝光强](https://openstax.org/books/university-physics-volume-3/pages/4-2-intensity-in-single-slit-diffraction)
