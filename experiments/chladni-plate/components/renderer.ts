import { sample, type Field } from "../model/response";
export interface Scene {
  field: Field;
  sand: Float32Array;
  cycles: number;
  tilt: boolean;
  heat: boolean;
  nodes: boolean;
  dark: boolean;
}
export function geometry(width: number, height: number, tilt: boolean) {
  const scale = Math.min(width * 0.36, height * 0.4),
    c = tilt ? Math.cos(0.3) : 1,
    s = tilt ? Math.sin(0.3) : 0,
    flatten = tilt ? 0.64 : 1;
  return {
    scale,
    c,
    s,
    flatten,
    project(x: number, y: number, z = 0) {
      return {
        x: width / 2 + scale * (c * x - s * y),
        y:
          height / 2 +
          scale * ((s * x + c * y) * flatten - (tilt ? z * 0.9 : 0)),
      };
    },
    unproject(x: number, y: number) {
      const u = (x - width / 2) / scale,
        v = (y - height / 2) / scale / flatten;
      return { x: c * u + s * v, y: -s * u + c * v };
    },
  };
}
// Pick the deformed mesh in screen space, using the same vertices as WebGL.
export function pickPlate(
  g: Field,
  cycles: number,
  cam: ReturnType<typeof geometry>,
  tilt: boolean,
  x: number,
  y: number,
) {
  if (!tilt) {
    const point = cam.unproject(x, y);
    return Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 ? point : undefined;
  }
  const n = g.size,
    peak = Math.max(g.peak, 1e-30),
    cos = Math.cos(2 * Math.PI * cycles),
    sin = Math.sin(2 * Math.PI * cycles);
  const vertices = Array.from({ length: n * n }, (_, k) => {
    const u = ((k % n) * 2) / (n - 1) - 1,
      v = (Math.floor(k / n) * 2) / (n - 1) - 1,
      z = (0.13 * (g.real[k] * cos - g.imaginary[k] * sin)) / peak,
      screen = cam.project(u, v, z);
    return {
      ...screen,
      u,
      v,
      depth: (cam.s * u + cam.c * v) * 0.12 - z * 0.24,
    };
  });
  let result: { x: number; y: number } | undefined,
    nearest = Infinity;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const k = j * n + i;
      for (const indices of [
        [k, k + 1, k + n],
        [k + 1, k + n + 1, k + n],
      ]) {
        const [a, b, c] = indices.map((index) => vertices[index]),
          det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(det) < 1e-12) continue;
        const p = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / det,
          q = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / det,
          r = 1 - p - q,
          depth = p * a.depth + q * b.depth + r * c.depth;
        if (Math.min(p, q, r) >= -1e-8 && depth < nearest) {
          nearest = depth;
          result = {
            x: p * a.u + q * b.u + r * c.u,
            y: p * a.v + q * b.v + r * c.v,
          };
        }
      }
    }
  return result;
}
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 xy;
layout(location=1) in vec2 wave;
layout(location=2) in float amplitude;
uniform vec2 viewport;
uniform vec4 camera;
uniform vec2 phase;
uniform float tilt;
uniform float pointSize;
out vec3 world;
out float amp;
void main(){
  float z=.13*dot(wave,phase)*tilt;
  float u=camera.y*xy.x-camera.z*xy.y;
  float q=camera.z*xy.x+camera.y*xy.y;
  world=vec3(xy,z);amp=amplitude;
  gl_Position=vec4(2.*camera.x*u/viewport.x,-2.*camera.x*(q*camera.w-z*.9)/viewport.y,(q*.12-z*.24)*tilt,1.);
  gl_PointSize=pointSize;
}`;
const surface = `#version 300 es
precision highp float;
in vec3 world;in float amp;
uniform float heat;uniform float nodes;
out vec4 color;
void main(){
  vec3 normal=normalize(cross(dFdx(world),dFdy(world)));normal=faceforward(normal,vec3(0.,0.,-1.),normal);
  float light=.62+.38*abs(dot(normal,normalize(vec3(-.4,-.7,1.))));
  vec3 base=vec3(.125,.145,.165)*light;
  base+=heat*amp*vec3(.035,.17,.37);
  float line=1.-smoothstep(.001,max(fwidth(amp)*1.3,.003),abs(amp-.065));
  base=mix(base,vec3(.22,.49,.95),line*nodes*.75);
  // Fine etched coordinates belong to the surface, not a decorative animation.
  vec2 grid=abs(fract((world.xy+1.)*8.-.5)-.5)/max(fwidth(world.xy*8.),vec2(.001));
  float ink=1.-min(min(grid.x,grid.y),1.);
  base+=.012*ink;
  color=vec4(base,1.);
}`;
const grains = `#version 300 es
precision highp float;
out vec4 color;
void main(){
  vec2 uv=gl_PointCoord-.5;float d=length(uv);
  if(d>.5)discard;
  float light=.85+.15*dot(normalize(vec3(uv,.7)),normalize(vec3(-.3,-.5,1.)));
  color=vec4(vec3(.92,.895,.81)*light,smoothstep(.5,.28,d));
}`;
function program(gl: WebGL2RenderingContext, fragment: string) {
  const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, i ? fragment : vertex);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(error ?? "Shader compilation failed");
    }
    return s;
  });
  const p = gl.createProgram()!;
  shaders.forEach((s) => gl.attachShader(p, s));
  gl.linkProgram(p);
  shaders.forEach((s) => gl.deleteShader(s));
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    throw new Error("Program linking failed");
  }
  return p;
}
export class PlateRenderer {
  backend: "webgl2" | "canvas2d" = "canvas2d";
  private gl: WebGL2RenderingContext | null = null;
  private plateProgram?: WebGLProgram;
  private sandProgram?: WebGLProgram;
  private plateBuffer?: WebGLBuffer;
  private indexBuffer?: WebGLBuffer;
  private sandBuffer?: WebGLBuffer;
  private indices = 0;
  private currentField?: Field;
  private particleData = new Float32Array(0);
  private texture = document.createElement("canvas");
  private lastScene?: Scene;
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly fallback: HTMLCanvasElement,
    readonly onFallback: () => void = () => {},
  ) {
    try {
      this.gl = canvas.getContext("webgl2", {
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
      });
      if (this.gl) {
        this.plateProgram = program(this.gl, surface);
        this.sandProgram = program(this.gl, grains);
        this.plateBuffer = this.gl.createBuffer()!;
        this.indexBuffer = this.gl.createBuffer()!;
        this.sandBuffer = this.gl.createBuffer()!;
        this.backend = "webgl2";
      }
    } catch {
      this.backend = "canvas2d";
    }
    canvas.addEventListener("webglcontextlost", this.lost);
    this.visibility();
  }
  private visibility() {
    this.canvas.hidden = this.backend !== "webgl2";
    this.fallback.hidden = this.backend === "webgl2";
    this.fallback.setAttribute("role", "img");
    this.fallback.setAttribute(
      "aria-label",
      this.canvas.getAttribute("aria-label") ?? "",
    );
    this.fallback.setAttribute(
      "aria-hidden",
      String(this.backend === "webgl2"),
    );
  }
  private lost = (e: Event) => {
    e.preventDefault();
    this.backend = "canvas2d";
    this.currentField = undefined;
    this.visibility();
    this.onFallback();
    if (this.lastScene) this.draw(this.lastScene);
  };
  private upload(g: Field) {
    const n = g.size,
      peak = Math.max(g.peak, 1e-30),
      vertices = new Float32Array(n * n * 5),
      indices: number[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        vertices.set(
          [
            (i * 2) / (n - 1) - 1,
            (j * 2) / (n - 1) - 1,
            g.real[k] / peak,
            g.imaginary[k] / peak,
            g.amplitude[k] / peak,
          ],
          k * 5,
        );
        if (i < n - 1 && j < n - 1)
          indices.push(k, k + 1, k + n, k + 1, k + n + 1, k + n);
      }
    const gl = this.gl!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.plateBuffer!);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer!);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW,
    );
    this.indices = indices.length;
  }
  draw(scene: Scene) {
    this.lastScene = scene;
    this.fallback.setAttribute(
      "aria-label",
      this.canvas.getAttribute("aria-label") ?? "",
    );
    const rect = this.canvas.parentElement!.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2),
      w = Math.round(rect.width * dpr),
      h = Math.round(rect.height * dpr);
    if (!w || !h) return;
    for (const canvas of [this.canvas, this.fallback])
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    if (this.backend !== "webgl2") {
      this.draw2d(scene, rect.width, rect.height, dpr);
      return;
    }
    const gl = this.gl!,
      g = scene.field,
      cam = geometry(rect.width, rect.height, scene.tilt),
      phase = [
        Math.cos(2 * Math.PI * scene.cycles),
        -Math.sin(2 * Math.PI * scene.cycles),
      ];
    if (this.currentField !== g) {
      this.upload(g);
      this.currentField = g;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    const bind = (p: WebGLProgram, buffer: WebGLBuffer) => {
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
      gl.uniform2f(
        gl.getUniformLocation(p, "viewport"),
        rect.width,
        rect.height,
      );
      gl.uniform4f(
        gl.getUniformLocation(p, "camera"),
        cam.scale,
        cam.c,
        cam.s,
        cam.flatten,
      );
      gl.uniform2f(gl.getUniformLocation(p, "phase"), phase[0], phase[1]);
      gl.uniform1f(gl.getUniformLocation(p, "tilt"), scene.tilt ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(p, "pointSize"), 2 * dpr);
    };
    bind(this.plateProgram!, this.plateBuffer!);
    gl.uniform1f(
      gl.getUniformLocation(this.plateProgram!, "heat"),
      scene.heat ? 1 : 0,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.plateProgram!, "nodes"),
      scene.nodes && g.peak > 0 ? 1 : 0,
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer!);
    gl.drawElements(gl.TRIANGLES, this.indices, gl.UNSIGNED_SHORT, 0);
    if (this.particleData.length !== (scene.sand.length / 2) * 5)
      this.particleData = new Float32Array((scene.sand.length / 2) * 5);
    let count = 0;
    const peak = Math.max(g.peak, 1e-30);
    for (let i = 0; i < scene.sand.length; i += 2) {
      const x = scene.sand[i],
        y = scene.sand[i + 1];
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      this.particleData.set(
        [
          x,
          y,
          sample(g, g.real, x, y) / peak,
          sample(g, g.imaginary, x, y) / peak,
          0,
        ],
        count * 5,
      );
      count++;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sandBuffer!);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.particleData.subarray(0, count * 5),
      gl.DYNAMIC_DRAW,
    );
    bind(this.sandProgram!, this.sandBuffer!);
    // Grain sprites are on the top surface; avoid depth fighting with the mesh.
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, count);
  }
  private draw2d(scene: Scene, width: number, height: number, dpr: number) {
    const ctx = this.fallback.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cam = geometry(width, height, false),
      g = scene.field,
      n = g.size,
      peak = Math.max(g.peak, 1e-30);
    if (
      this.currentField !== g ||
      this.texture.dataset.heat !== String(scene.heat) ||
      this.texture.dataset.nodes !== String(scene.nodes)
    ) {
      this.currentField = g;
      this.texture.width = this.texture.height = n;
      this.texture.dataset.heat = String(scene.heat);
      this.texture.dataset.nodes = String(scene.nodes);
      const c = this.texture.getContext("2d")!,
        img = c.createImageData(n, n);
      for (let i = 0; i < n * n; i++) {
        const amp = g.amplitude[i] / peak,
          heat = scene.heat ? amp : 0,
          line = scene.nodes && g.peak > 0 && amp < 0.08;
        img.data.set(
          line
            ? [50, 113, 220, 255]
            : [32 + heat * 9, 37 + heat * 43, 42 + heat * 94, 255],
          i * 4,
        );
      }
      c.putImageData(img, 0, 0);
    }
    ctx.drawImage(
      this.texture,
      width / 2 - cam.scale,
      height / 2 - cam.scale,
      2 * cam.scale,
      2 * cam.scale,
    );
    ctx.fillStyle = "#e7e0cc";
    for (let i = 0; i < scene.sand.length; i += 2) {
      const x = scene.sand[i],
        y = scene.sand[i + 1];
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      const point = cam.project(x, y);
      ctx.fillRect(point.x - 0.8, point.y - 0.8, 1.6, 1.6);
    }
  }
  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    const gl = this.gl;
    if (gl) {
      for (const p of [this.plateProgram, this.sandProgram])
        if (p) gl.deleteProgram(p);
      for (const b of [this.plateBuffer, this.sandBuffer, this.indexBuffer])
        if (b) gl.deleteBuffer(b);
    }
  }
}
