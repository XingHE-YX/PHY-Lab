import { existsSync } from "node:fs";
import { join } from "node:path";
import { root, assertId } from "./shared";
const id = process.argv[2];
if (!id) throw new Error("Usage: bun scripts/build-wasm.ts <id>");
assertId(id);
const crate = join(root, "experiments", id, "wasm");
if (!existsSync(join(crate, "Cargo.toml")))
  throw new Error(
    "This experiment has no WASM crate; simple models use TypeScript.",
  );
const child = Bun.spawn(
  ["wasm-pack", "build", "--target", "web", "--release", "--out-dir", "pkg"],
  { cwd: crate, stdout: "inherit", stderr: "inherit" },
);
if (await child.exited) throw new Error("WASM build failed");
