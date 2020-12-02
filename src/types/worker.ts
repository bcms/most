export interface Worker<T> {
  id: string;
  busy: boolean;
  exec: (data: T, chunkId: string) => Promise<void>;
}
