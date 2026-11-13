import { capabilities, revision } from "./capabilities";
import { parseMetadata, parseManifest } from "./metadata";
import { mount } from "./context";
import type { ProtocolDefinition } from "../types";
export type * from "./context";
export type * from "./instance";
export type * from "./metadata";
export type * from "./api/environment";
export type * from "./api/storage";
export type * from "./api/toolbar";
export type * from "./api/settings";
export type * from "./api/dialog";
export type * from "./api/experiment";
export const protocol = {
  version: 2,
  revision,
  capabilities,
  parseMetadata,
  parseManifest,
  mount,
} as const satisfies ProtocolDefinition;
export type * from "./components";
