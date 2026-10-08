set positional-arguments

default:
    @just --list

install:
    bun install

dev:
    bun scripts/dev.ts

build:
    bun scripts/build.ts

build-app:
    bun scripts/build-app.ts

build-exp id:
    bun scripts/build-experiment.ts {{id}}

catalog:
    bun scripts/generate-catalog.ts

wasm id:
    bun scripts/build-wasm.ts {{id}}

check:
    bunx tsc --noEmit

test:
    bun test tests experiments

test-browser:
    bunx playwright test

preview:
    bun scripts/preview.ts

verify:
    bun scripts/verify-release.ts
