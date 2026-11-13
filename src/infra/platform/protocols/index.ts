import { protocol as v1 } from "./v1";
import { protocol as v2 } from "./v2";
import type { ProtocolDefinition } from "./types";
/** The only production registry that names multiple main protocol versions. */
const protocols: ReadonlyMap<number, ProtocolDefinition> = new Map<
  number,
  ProtocolDefinition
>([
  [v1.version, v1],
  [v2.version, v2],
]);
export function getProtocol(version: number): ProtocolDefinition | undefined {
  return protocols.get(version);
}
