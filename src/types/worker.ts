export interface Worker {
  id: string;
  busy: boolean;
  exec: (...args: any[]) => Promise<void>;
}
