import { buildApp } from "./build-app";
import { buildExperiment } from "./build-experiment";
import { generateCatalog } from "./generate-catalog";
import { experimentIds } from "./shared";
for (const id of await experimentIds()) await buildExperiment(id);
await generateCatalog();
await buildApp();
