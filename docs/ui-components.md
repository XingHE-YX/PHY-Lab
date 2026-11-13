# 公共组件

平台在 `src/main.ts` 通过 `src/ui/components/index.ts` 统一注册组件。实验只导入协议的类型，直接使用公共标签。组件采用平台 CSS tokens，明暗主题、字体及 3px 控件圆角保持一致，样式不按协议版本分叉。

公开类型在 `src/infra/platform/protocols/v2/components`。需要当前输入值时读取 `event.currentTarget`；`phy-slider.value` 是数值，其他值控件的 `value` 为字符串。

## 控件接口

| 标签              | 属性、方法与内容                                                                                                                                                                             | 用户事件          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `phy-button`      | `variant="primary"`、`disabled`、无障碍名称 `label`、默认 slot、`focus()`                                                                                                                    | `click`           |
| `phy-input`       | `type`、`value`、`valueAsNumber`、`label`、`placeholder`、`readOnly`、`autocomplete`、`min/max/step`、`pattern`、`minLength/maxLength`；`start/end` slots；`select()`、`setSelectionRange()` | `input`、`change` |
| `phy-box`         | 默认 slot；统一背景、边框、圆角；布局由调用方 CSS 决定                                                                                                                                       | 无                |
| `phy-select`      | `value`、`options`、无障碍名称 `label`                                                                                                                                                       | `input`、`change` |
| `phy-switch`      | `checked`、`value`、无障碍名称 `label`；默认 slot 或 `label` 提供可见文字                                                                                                                    | `input`、`change` |
| `phy-checkbox`    | 同开关，另有 `indeterminate`                                                                                                                                                                 | `input`、`change` |
| `phy-progress`    | `value`、`max`（默认 100）、`label`；只展示确定进度                                                                                                                                          | 无                |
| `phy-slider`      | 数值 `value/min/max/step`、`valueAsNumber`、`label`、`valueText`（属性名 `value-text`）                                                                                                      | `input`、`change` |
| `phy-tabs`        | `value`、`items`、`label`、`variant="line/segmented"`、`focus()`；以选项值命名的内容 slots                                                                                                   | `change`          |
| `phy-radio-group` | `value`、`options`、`label`、`variant="segmented"`；不设置 variant 时为普通单选框                                                                                                            | `input`、`change` |
| `phy-math`        | `source` 为 TeX，`display` 为行间公式模式                                                                                                                                                    | 无                |

输入、选择、滑块、开关、多选和单选组共同支持 `name`、`disabled`、`required`、`focus()`、`form`、`labels`、`validity`、`validationMessage`、`willValidate`、`checkValidity()` 和 `reportValidity()`。使用 ElementInternals 参与原生 FormData、表单重置、fieldset 禁用和浏览器状态恢复。

属性改变通过 Lit 更新内部控件；同一任务中赋值后若需检查内部 DOM，等待组件 `updateComplete`。正常用户操作同步更新宿主值，再发出可冒泡、跨 Shadow DOM 的事件。代码设置属性不主动发送用户输入事件。

## 文本框和 slots

```ts
html`<phy-input
  type="search"
  label="搜索实验"
  placeholder="搜索实验、主题或标签…"
  .value=${query}
  @input=${(event: Event) => {
    query = (event.currentTarget as InputElement).value;
  }}
>
  <span slot="start">${searchIcon}</span>
  <kbd slot="end">⌘ K</kbd>
</phy-input>`;
```

`start/end` 是可选的左右内容区，可以插入图标、文字、按钮或其他节点。快捷键提示和清空按钮属于调用方内容，组件不绑定搜索业务。首页通过文本框的 `focus()` 实现 Ctrl/⌘ K。

普通、搜索、密码、数字、邮箱等输入共用此组件。数字输入的空值对应 `valueAsNumber: NaN`，调用方应先校验再写入模型。

## 下拉和单选

```ts
const options = [
  { value: "1", label: "1×" },
  { value: "0.5", label: "0.5×" },
];
html`<phy-select
  label="播放速度"
  .value=${speed}
  .options=${options}
  @change=${onSpeedChange}
></phy-select>`;

html`<phy-radio-group
  label="边界条件"
  variant="segmented"
  .value=${boundary}
  .options=${[
    { value: "fixed", label: "固定端" },
    { value: "free", label: "自由端" },
  ]}
  @change=${onBoundaryChange}
></phy-radio-group>`;
```

两类 options 均为 `{ value, label, disabled? }`。单选组内部统一管理原生 radio，方向键、互斥选择和表单提交保持一致。

## 开关、多选、进度和滑块

```ts
html`<phy-switch .checked=${muted} @change=${onMuteChange}>静音</phy-switch>`;
html`<phy-checkbox .checked=${showVelocity} @change=${onCurveChange}
  >速度曲线</phy-checkbox
>`;
html`<phy-progress label="缓存进度" .value=${3} .max=${5}></phy-progress>`;
html`<phy-slider
  label="振幅"
  .value=${amplitude}
  .min=${0}
  .max=${0.8}
  .step=${0.01}
  value-text=${`${amplitude} m`}
  @input=${onPreview}
  @change=${onCommit}
></phy-slider>`;
```

滑块 `input` 用于连续更新，`change` 用于提交一轮编辑。物理参数的名称、当前读数、单位和范围由实验展示；`valueText` 用于辅助技术读取带单位的数值。进度值限制在 0 到 max，不包含加载动画或拖动行为。

## Tabs

```ts
html`<phy-tabs
  label="观察方式"
  .value=${view}
  .items=${[
    { value: "motion", label: "看运动" },
    { value: "energy", label: "看能量" },
  ]}
  @change=${(event: Event) => {
    if (event.target !== event.currentTarget) return;
    view = (event.currentTarget as TabsElement).value;
  }}
>
  <div slot="motion">${motionContent}</div>
  <div slot="energy">${energyContent}</div>
</phy-tabs>`;
```

items 为 `{ value, label, disabled? }`，值在组内保持唯一。组件管理 tab、tabpanel、ARIA 关联、方向键、Home/End、焦点和隐藏内容。可以只渲染当前 slot 的内容，避免创建暂时不用的图表。

嵌套内容也会发送 `change`，页签监听器应检查 `event.target === event.currentTarget`。互斥的模型或参数值用单选组；切换内容面板用 Tabs。

## 公式

```ts
html`<phy-math .source=${String.raw`T=2\pi\sqrt{m/k}`} display></phy-math>`;
```

平台统一打包 KaTeX、样式和本地字体，输出 HTML 与 MathML。渲染禁用信任模式，按源字符串和显示模式缓存，最多保留 512 条。无效 TeX 显示转义后的原文和错误提示，不中断实验。实时数值继续使用普通文本节点，不连续触发 aria-live。

## 外观扩展

优先使用调用方布局 CSS、平台 tokens 和公开 part：

- 输入框：`base`、`input`，`--input-background`、`--input-font-size`。
- 下拉：`select`，`--select-font-size`。
- 开关 / 多选：`base`、`input`、`label`。
- 滑块：`input`；进度：`progress`。
- Tabs：`tabs`、`panel`，`--tab-font-size`。
- 单选组：`group`，`--radio-font-size`、`--radio-gap`。
- 公式：`formula`；Box：`--box-padding`。

dialog 通过系统 API 使用，见 [v2 参考](protocols/v2.md#dialog)。
