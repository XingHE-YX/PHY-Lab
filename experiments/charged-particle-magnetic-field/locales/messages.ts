import type { Orbit } from "../model/physics";

export const texts = {
  "zh-CN": {
    subtitle: "匀强静磁场 · 垂直入射",
    parameters: "发射条件",
    sliders: {
      charge: "电荷",
      mass: "质量",
      field: "磁场 Bz",
      speed: "初速度大小",
      angle: "发射方向",
    },
    heading: "运动平面",
    charts: "同步曲线",
    view: { velocity: "速度分量", energy: "动能" },
    modes: {
      circle: "匀速圆周运动",
      straight: "匀速直线运动",
      rest: "保持静止",
    },
    reasons: {
      circle: "磁力始终指向圆心，只改变速度方向。",
      straight: "电荷或磁场为零，粒子不受磁力。",
      rest: "初速度为零，磁力为零，粒子保持静止。",
    },
    play: "继续",
    pause: "暂停",
    launch: "发射",
    replay: "重播",
    rearm: "回到发射位",
    reset: "恢复默认",
    seek: "回看时间",
    rate: "慢放倍率",
    slow: "播放比例",
    layers: "显示图层",
    trail: "轨迹",
    vectors: "矢量",
    time: "时间",
    speed: "速率",
    force: "磁力大小",
    radius: "轨道半径",
    period: "周期",
    energy: "动能",
    before: "待发射",
    start: "起点",
    quarter: "¼ 周期",
    half: "½ 周期",
    full: "一周期",
    midpoint: "中点",
    end: "终点",
    out: "出屏",
    into: "入屏",
    off: "无磁场",
    velocityKey: "v 速度",
    forceKey: "F 磁力",
    orbitKey: "虚线 · 预测轨道",
    aim: "从圆点拖出初速度，或用参数设定方向和大小。",
    aimKeys: "↑ / ↓ 调速，← / → 改方向，Enter 发射。",
    aimLabel: "初速度拖拽手柄",
    scale: "比例尺",
    help: "模型说明",
    model:
      "本实验只考虑 xy 平面上、垂直于匀强静磁场的非相对论运动。屏幕向右为 +x、向上为 +y、朝向你为 +z。电荷或磁场改变符号会反转绕行方向。忽略电场、重力、阻力及辐射。",
    units:
      "e 为元电荷，u 为原子质量单位，eV 为电子伏特。发射方向从 +x 轴逆时针量起。每次改参数都会暂停并回到发射位；图层和图表切换不改变运动。",
    screen:
      "发射后，速度和磁力箭头分别按本轮的恒定大小归一，只用于看方向；比较大小请读数值。待发射时的箭头按输入速率等比例伸缩。轨道根据发射条件适配场景；比较半径时请看读数和比例尺。",
    clock:
      "默认每 3 秒播放推进 1 周期（无圆轨道时推进 1 μs）。回看覆盖 2 周期或 2 μs，不使用真实速度播放。",
  },
  en: {
    subtitle: "Uniform static field · perpendicular launch",
    parameters: "Launch conditions",
    sliders: {
      charge: "Charge",
      mass: "Mass",
      field: "Field Bz",
      speed: "Launch speed",
      angle: "Launch angle",
    },
    heading: "Plane of motion",
    charts: "Synchronized plot",
    view: { velocity: "Velocity components", energy: "Kinetic energy" },
    modes: {
      circle: "Uniform circular motion",
      straight: "Uniform straight-line motion",
      rest: "At rest",
    },
    reasons: {
      circle:
        "The inward force turns the velocity without changing its magnitude.",
      straight: "Zero charge or field means there is no magnetic force.",
      rest: "Zero launch speed means zero magnetic force; the particle stays put.",
    },
    play: "Resume",
    pause: "Pause",
    launch: "Launch",
    replay: "Replay",
    rearm: "Return to launch",
    reset: "Restore defaults",
    seek: "Replay time",
    rate: "Playback rate",
    slow: "Time scale",
    layers: "Layers",
    trail: "Trajectory",
    vectors: "Vectors",
    time: "Time",
    speed: "Speed",
    force: "Magnetic force",
    radius: "Orbit radius",
    period: "Period",
    energy: "Kinetic energy",
    before: "Ready",
    start: "Start",
    quarter: "¼ period",
    half: "½ period",
    full: "1 period",
    midpoint: "Midpoint",
    end: "End",
    out: "Out of page",
    into: "Into page",
    off: "No field",
    velocityKey: "v Velocity",
    forceKey: "F Magnetic force",
    orbitKey: "Dashed · predicted path",
    aim: "Drag from the dot or set the speed and angle in the controls.",
    aimKeys: "↑ / ↓ speed, ← / → angle, Enter to launch.",
    aimLabel: "Launch vector handle",
    scale: "Scale bar",
    help: "Model notes",
    model:
      "Nonrelativistic motion is confined to the xy plane, perpendicular to a uniform static magnetic field. Right is +x, up is +y, and toward you is +z. Reversing either charge or field reverses the turn. Electric fields, gravity, drag and radiation are ignored.",
    units:
      "e is the elementary charge, u the atomic mass unit, and eV the electronvolt. The launch angle is counterclockwise from +x. Launch conditions return the particle to its starting point; the plot and layer controls do not affect motion.",
    screen:
      "In flight, each arrow is normalized to its own constant magnitude and shows direction; use the readouts to compare magnitudes. The launch arrow is proportional to the input speed. The scene fits the predicted path to the display; use the physical radius and scale bar to compare orbits.",
    clock:
      "At 1×, 3 seconds of playback advance one period (or 1 μs without a circular orbit). The replay covers two periods or 2 μs, not real-time motion.",
  },
} as const;

export type Messages = (typeof texts)[keyof typeof texts];

export const number = (value: number, digits = 3) =>
  Number(value.toPrecision(digits)).toString();

export function physicalTime(orbit: Orbit, progress: number) {
  return `${number(progress * orbit.timeUnit * 1e6, 4)} μs`;
}
