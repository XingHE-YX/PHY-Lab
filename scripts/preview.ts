import { resolve, extname } from "node:path";
import { dist, base } from "./shared";
const types: Record<string, string> = {
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".html": "text/html",
  ".css": "text/css",
};
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT ?? 4173),
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith(base))
      return new Response("Not found", { status: 404 });
    let relative: string;
    try {
      relative = decodeURIComponent(pathname.slice(base.length));
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }
    const target = resolve(dist, relative || "index.html");
    if (!target.startsWith(dist + "/"))
      return new Response("Forbidden", { status: 403 });
    const file = Bun.file(target);
    if (!(await file.exists()))
      return new Response("Not found", { status: 404 });
    return new Response(file, {
      headers: {
        "Content-Type": types[extname(target)] ?? file.type,
        "Cache-Control":
          /\/(assets|app|experiments)\//.test(target) &&
          !target.endsWith("latest.json")
            ? "public,max-age=31536000,immutable"
            : "no-cache",
      },
    });
  },
});
console.log(
  "PHY Lab preview:",
  server.url + (base === "/" ? "" : base.slice(1)),
);
