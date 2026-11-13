export interface ExperimentStorage {
  read<T>(fallback: T): T;
  readVersion<T>(version: number, fallback: T): T;
  write(value: unknown): void;
}
