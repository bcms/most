export interface Worker {
  id: string;
  busy: boolean;
  exec: (...args: string[]) => Promise<void>;
}
