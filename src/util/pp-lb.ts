import { Worker } from '../types';
import { Console } from './console';
import { Queueable } from './queueable';

export interface PPLBPrototype {
  manage<T>(
    ppc: number,
    data: T[],
    exec: (_data: T, chunkId: string) => Promise<void>,
    failOnError?: boolean,
  ): Promise<void>;
}

function pplb(): PPLBPrototype {
  const cnsl = Console('PPLB');
  return {
    async manage<T>(
      ppc: number,
      data: T[],
      exec: (_data: T, chunkId: string) => Promise<void>,
      failOnError?: boolean,
    ): Promise<void> {
      return await new Promise((resolve, reject) => {
        const workers: Array<Worker<T>> = [];
        for (let i = 0; i < ppc; i++) {
          workers.push({
            id: '' + i,
            busy: false,
            exec,
          });
        }
        const queueable = Queueable<number>('next');
        let dataPointer = ppc - 1;
        async function next() {
          return await queueable.exec('next', 'free_one_by_one', async () => {
            dataPointer = dataPointer + 1;
            return dataPointer;
          });
        }
        async function done(id: string) {
          workers.forEach((e) => {
            if (e.id === id) {
              e.busy = false;
            }
          });
          const pointer = await next();
          if (pointer < data.length) {
            let worker: Worker<T>;
            for (const i in workers) {
              if (workers[i].busy === false) {
                workers[i].busy = true;
                worker = workers[i];
                break;
              }
            }
            if (worker) {
              worker
                .exec(
                  data[pointer],
                  `[${pointer + 1}/${data.length}] worker_${worker.id}`,
                )
                .then(() => {
                  done(worker.id);
                })
                .catch((error) => {
                  if (failOnError) {
                    reject(error);
                  } else {
                    cnsl.error(`worker [${worker.id}]`, error);
                  }
                });
            }
          } else {
            if (!workers.find((e) => e.busy === true)) {
              resolve();
            }
          }
        }
        for (let i = 0; i < ppc; i = i + 1) {
          if (i < data.length) {
            workers[i].busy = true;
            workers[i]
              .exec(
                data[i],
                `[${i + 1}/${data.length}] worker_${workers[i].id}`,
              )
              .then(() => {
                done(workers[i].id);
              })
              .catch((error) => {
                if (failOnError) {
                  reject(error);
                } else {
                  cnsl.error(`worker [${workers[i].id}]`, error);
                }
              });
          }
        }
      });
    },
  };
}

export const PPLB = pplb();
