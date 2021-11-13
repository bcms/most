export interface BCMSMostPPLB<T> {
  (
    ppc: number,
    data: T[],
    exec: (_data: T, chunkId: string) => Promise<void>,
    failOnError?: boolean,
  ): Promise<void>;
}
