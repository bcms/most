import * as os from 'os';
import { createWorkerManager } from '@banez/workers';
import {
  BCMSClient,
  BCMSSocketEntryEvent,
  BCMSSocketEventName,
  BCMSSocketEventType,
  BCMSSocketMediaEvent,
} from '@becomes/cms-client/types';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostMediaHandler,
} from '../types';
import { WorkerError } from '@banez/workers/types';

export function bcmsMostSocketInit({
  client,
  cache,
  mediaHandler,
  config,
}: {
  client: BCMSClient;
  cache: BCMSMostCacheHandler;
  mediaHandler: BCMSMostMediaHandler;
  config: BCMSMostConfig;
}): void {
  const workers = createWorkerManager({
    count:
      config.media && config.media.ppc ? config.media.ppc : os.cpus().length,
  });
  client.socket.subscribe(BCMSSocketEventName.ENTRY, async (event) => {
    const result = await workers.assign(async () => {
      const data = event.data as BCMSSocketEntryEvent;
      const keyAccess = await client.getKeyAccess();
      const tempAccess = keyAccess.templates.find((e) => e._id === data.t);
      if (tempAccess && tempAccess.get) {
        if (data.t === BCMSSocketEventType.UPDATE) {
          const entry = await client.entry.get({
            templateId: data.t,
            entryId: data.e,
          });
          cache.content.update(entry);
        } else {
          cache.content.remove({ _id: data.e });
        }
      }
    });
    if (result instanceof WorkerError) {
      // eslint-disable-next-line no-console
      console.error(result.error);
    }
  });
  client.socket.subscribe(BCMSSocketEventName.MEDIA, async (event) => {
    const result = await workers.assign(async () => {
      const data = event.data as BCMSSocketMediaEvent;
      if (data.t === BCMSSocketEventType.UPDATE) {
        await mediaHandler.download(data.m);
      } else {
        await mediaHandler.remove(data.m);
      }
    });
    if (result instanceof WorkerError) {
      // eslint-disable-next-line no-console
      console.error(result.error);
    }
  });

  client.socket
    .connect()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Connected to socket server.');
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
}
