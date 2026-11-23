import { svg, nothing } from "lit";
import {
  at,
  replaySpan,
  sample,
  limits,
  type Orbit,
  type Parameters,
} from "../model/physics";
import { number, type Messages } from "../locales/messages";

export const scene = {
  width: 528,
  height: 336,
  originX: 264,
  originY: 164,
  aim: 122,
};

type Point = { x: number; y: number };

function sceneScale(model: Orbit) {
  const end = at(model, replaySpan);
  const extentX = model.center
    ? Math.abs(model.center.x) + model.radius!
    : Math.abs(end.x);
  const extentY = model.center
    ? Math.abs(model.center.y) + model.radius!
    : Math.abs(end.y);
  return Math.min(185 / extentX, 100 / extentY, 260_000);
}

function vector(
  x: number,
  y: number,
  dx: number,
  dy: number,
  kind: "velocity" | "force",
  label: string,
) {
  const length = Math.hypot(dx, dy);
  if (length < 1) return nothing;
  const tipX = x + dx;
  const tipY = y + dy;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(7, length / 2);
  const backX = tipX - ux * head;
  const backY = tipY - uy * head;
  return svg`<g class=${`vector ${kind}`}>
    <line x1=${x} y1=${y} x2=${backX} y2=${backY} />
    <path d=${`M${tipX},${tipY} ${backX - (uy * head) / 2},${backY + (ux * head) / 2} ${backX + (uy * head) / 2},${backY - (ux * head) / 2}Z`} />
    ${length > 13 ? svg`<text x=${tipX + ux * 8} y=${tipY + uy * 8 + 4} text-anchor=${ux < -0.25 ? "end" : ux > 0.25 ? "start" : "middle"}>${label}</text>` : nothing}
  </g>`;
}

export function fieldScene(
  model: Orbit,
  params: Parameters,
  progress: number,
  options: {
    launched: boolean;
    trail: boolean;
    vectors: boolean;
    aim: Parameters;
  },
  text: Messages,
) {
  const { originX, originY, aim } = scene;
  const scale = sceneScale(model);
  const x = (position: number) => originX + position * scale;
  const y = (position: number) => originY - position * scale;
  const path = (points: Point[]) =>
    points
      .map((point) => `${x(point.x).toFixed(2)},${y(point.y).toFixed(2)}`)
      .join(" ");
  const current = at(model, progress);
  const px = x(current.x);
  const py = y(current.y);
  const angle = (options.aim.angle * Math.PI) / 180;
  const aimLength = (options.aim.speed * aim) / limits.speed.max;
  const barPower = 10 ** Math.floor(Math.log10(78 / scale));
  const barMeters =
    ([5, 2, 1].find((multiple) => multiple * barPower * scale <= 78) ?? 1) *
    barPower;
  const barLength = barMeters * scale;
  const showPath = options.trail && model.kind !== "rest";
  return svg`
    <title>${text.heading}</title>
    <defs>
      <pattern id="field-grid" width="32" height="32" patternUnits="userSpaceOnUse" x=${originX - 16} y=${originY - 16}>
        <path class="grid-line" d="M0 32V0H32" />
        ${params.field > 0 ? svg`<circle class="field-symbol" cx="16" cy="16" r="1.6" />` : params.field < 0 ? svg`<path class="field-cross" d="m14 14 4 4m0-4-4 4" />` : nothing}
      </pattern>
    </defs>
    <rect width=${scene.width} height=${scene.height} fill="url(#field-grid)" />
    <path class="scene-axis" d=${`M0 ${originY}H528 M${originX} 0V336`} />
    <text class="scene-label" x="508" y=${originY - 7}>x</text>
    <text class="scene-label" x=${originX + 7} y="17">y</text>
    <text class="scene-label" x="14" y="22">${params.field > 0 ? `⊙ ${text.out}` : params.field < 0 ? `⊗ ${text.into}` : `— ${text.off}`}</text>
    <text class="scene-label" x="14" y="39">Bz = ${params.field} mT</text>
    ${showPath && model.center ? svg`<circle class="predicted" cx=${x(model.center.x)} cy=${y(model.center.y)} r=${model.radius! * scale} />` : showPath ? svg`<polyline class="predicted" points=${path([{ x: 0, y: 0 }, at(model, replaySpan)])} />` : nothing}
    ${showPath && progress > 0 ? svg`<polyline class="flight-path" points=${path(sample(model, progress, Math.max(1, Math.ceil(progress * 90))))} />` : nothing}
    <circle class="launch-point" cx=${originX} cy=${originY} r="4" />
    ${
      options.launched && options.vectors
        ? svg`
      ${model.speed > 0 ? vector(px, py, (48 * current.vx) / model.speed, (-48 * current.vy) / model.speed, "velocity", "v") : nothing}
      ${current.force > 0 ? vector(px, py, (44 * current.fx) / current.force, (-44 * current.fy) / current.force, "force", "F") : nothing}
    `
        : !options.launched
          ? vector(
              originX,
              originY,
              aimLength * Math.cos(angle),
              -aimLength * Math.sin(angle),
              "velocity",
              "v₀",
            )
          : nothing
    }
    <circle class=${options.launched ? "particle" : "particle ready"} cx=${px} cy=${py} r="6" />
    <g aria-label=${text.scale}>
      <path class="scale" d=${`M14 317v5h${barLength}v-5`} />
      <text class="scene-label" x="14" y="311">${barMeters < 0.01 ? `${number(barMeters * 1000)} mm` : `${number(barMeters * 100)} cm`}</text>
    </g>`;
}
