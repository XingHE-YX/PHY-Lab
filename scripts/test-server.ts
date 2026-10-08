export {};
const build = Bun.spawn(["bun", "scripts/build.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (await build.exited) throw new Error("Test build failed");
await import("./preview");
