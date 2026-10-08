export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function experimentStorage(id: string, stateVersion: number) {
  const key = "phy-lab:experiment:" + id + ":state:" + stateVersion;
  return {
    read: <T>(fallback: T) => readStored(key, fallback),
    readVersion: <T>(version: number, fallback: T) =>
      Number.isInteger(version) && version > 0
        ? readStored("phy-lab:experiment:" + id + ":state:" + version, fallback)
        : fallback,
    write: (value: unknown) => {
      writeStored(key, value);
    },
  };
}
