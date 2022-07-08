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
} from './types';
import { WorkerError } from '@banez/workers/types';
import { createBcmsMostDefaultOnMessage } from './on-message';
import { createBcmsMostConsole } from './util';

export async function bcmsMostSocketInit({
  client,
  cache,
  mediaHandler,
  config,
}: {
  client: BCMSClient;
  cache: BCMSMostCacheHandler;
  mediaHandler: BCMSMostMediaHandler;
  config: BCMSMostConfig;
}): Promise<void> {
  const workers = createWorkerManager({
    count:
      config.media && config.media.ppc ? config.media.ppc : os.cpus().length,
  });
  const onMessage = createBcmsMostDefaultOnMessage();
  const cnsl = createBcmsMostConsole('Socket');
  client.socket.subscribe(BCMSSocketEventName.ENTRY, async (event) => {
    const result = await workers.assign(async () => {
      const data = event.data as BCMSSocketEntryEvent;
      const keyAccess = await client.getKeyAccess();
      const tempAccess = keyAccess.templates.find(
        (e) => e._id === data.tm || e.name === data.tm,
      );
      if (tempAccess && tempAccess.get) {
        if (data.t === BCMSSocketEventType.UPDATE) {
          const entry = await client.entry.get({
            template: data.tm,
            entry: data.e,
            skipCache: true,
          });
          await cache.content.set({
            groupName: tempAccess.name,
            items: entry,
          });
          onMessage(
            'info',
            cnsl.info(
              'entry',
              `Successfully updated "${entry.meta.en.slug}" in "${tempAccess.name}"`,
            ),
          );
        } else {
          await cache.content.remove({ _id: data.e });
          onMessage(
            'info',
            cnsl.info(
              'entry',
              `Successfully updated "${data.e}" in "${tempAccess.name}"`,
            ),
          );
        }
      }
    });
    if (result instanceof WorkerError) {
      onMessage('error', cnsl.error('entry', result.error));
    }
  });
  if (config.media && config.media.download) {
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
  }

  if (!client.socket.connected()) {
    await client.socket.connect();
  }
}
