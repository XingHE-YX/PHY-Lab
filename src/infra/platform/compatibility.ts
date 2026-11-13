import { getProtocol } from "./protocols";
import { record, revision } from "./metadata";
export interface ProtocolRequirement {
  apiVersion: number;
  apiRevision?: number;
}
export function requireProtocol(requirement: ProtocolRequirement) {
  const protocol = getProtocol(requirement.apiVersion);
  if (!protocol)
    throw new Error(
      `Unsupported experiment protocol v${requirement.apiVersion}`,
    );
  const required = revision(requirement.apiRevision);
  if (required > protocol.revision)
    throw new Error(
      `Update the platform: protocol v${protocol.version} revision ${required} is required`,
    );
  return protocol;
}
export function supportsProtocol(requirement: ProtocolRequirement): boolean {
  try {
    requireProtocol(requirement);
    return true;
  } catch {
    return false;
  }
}
function requirement(value: unknown): ProtocolRequirement {
  const raw = record(value);
  if (
    typeof raw.apiVersion !== "number" ||
    !Number.isSafeInteger(raw.apiVersion) ||
    raw.apiVersion < 1
  )
    throw new Error("Invalid apiVersion");
  return { apiVersion: raw.apiVersion, apiRevision: revision(raw.apiRevision) };
}
export function parseExperimentMetadata(value: unknown) {
  return requireProtocol(requirement(value)).parseMetadata(value);
}
export function parseExperimentManifest(value: unknown) {
  return requireProtocol(requirement(value)).parseManifest(value);
}
