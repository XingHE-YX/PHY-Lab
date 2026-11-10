// A fixed metric frame keeps every amplitude (0–0.8 m) inside the scene.
// The spring, reference circle, projection, and pointer input share this frame.
export const sceneFrame = {
  width: 800,
  height: 560,
  originX: 430,
  originY: 270,
  scale: 300,
} as const;
