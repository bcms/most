import { createQueue, useLogger } from '@becomes/purple-cheetah';
import { BCMSMostPPLB, Worker } from '../types';

export function createBcmsMostPPLB<Data>(): BCMSMostPPLB<Data> {
  const cnsl = useLogger({ name: 'PPLB' });
  return async (ppc, data, exec, failOnError) => {
    return await new Promise((resolve, reject) => {
      const workers: Array<Worker<Data>> = [];
      for (let i = 0; i < ppc; i++) {
        workers.push({
          id: '' + i,
          busy: false,
          exec,
        });
      }
      const queueable = createQueue({
        name: 'next',
      });
      let dataPointer = ppc - 1;
      async function next(): Promise<number> {
        const queueItem = queueable({
          name: 'next',
          handler: async () => {
            dataPointer = dataPointer + 1;
          },
        });
        await queueItem.wait;
        return dataPointer;
      }
      async function done(id: string) {
        workers.forEach((e) => {
          if (e.id === id) {
            e.busy = false;
          }
        });
        const pointer = await next();
        if (pointer < data.length) {
          let worker: Worker<Data> | null = null;
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
                done((worker as Worker<Data>).id);
              })
              .catch((error) => {
                if (failOnError) {
                  reject(error);
                } else {
                  cnsl.error(`worker [${(worker as Worker<Data>).id}]`, error);
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
            .exec(data[i], `[${i + 1}/${data.length}] worker_${workers[i].id}`)
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
  };
}
