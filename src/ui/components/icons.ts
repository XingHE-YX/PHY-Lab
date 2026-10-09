import { svg } from "lit";
const paths: Record<string, string> = {
  search: "m21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moon: "M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z",
  settings:
    "m10 3-.5 2-2 1-2-.5-2 3 1.5 1.5v3L3.5 15l2 3 2-.5 2 1 .5 2h4l.5-2 2-1 2 .5 2-3-1.5-1.5v-3L20.5 9l-2-3-2 .5-2-1L14 3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  chevronLeft: "m15 6-6 6 6 6",
  close: "m6 6 12 12M18 6 6 18",
  play: "m8 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 5v6h6M4 11a8 8 0 1 1 1 7",
  check: "m5 12 4 4L19 6",
};
export function icon(name: string) {
  if (name === "grid")
    return svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => svg`<circle cx=${x} cy=${y} r="1.8"/>`))}</svg>`;
  return svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${paths[name] ?? paths.arrow}/></svg>`;
}
