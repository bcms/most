import os from 'os';
import { createWorkerManager } from '@banez/workers';
import {
  BCMSClient,
  BCMSEntryParsed,
  BCMSSocketEntryEvent,
  BCMSSocketEventName,
  BCMSSocketEventType,
  BCMSSocketMediaEvent,
} from '@becomes/cms-client/types';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostMediaHandler,
  BCMSMostTypeConverterHandler,
} from '@becomes/cms-most/types';
import { WorkerError } from '@banez/workers/types';
import { createBcmsMostDefaultOnMessage } from '@becomes/cms-most/on-message';
import {
  bcmsMostEntryLinkParser,
  createBcmsMostConsole,
} from '@becomes/cms-most/util';

export async function bcmsMostSocketInit({
  client,
  cache,
  mediaHandler,
  config,
  typeConverter,
}: {
  client: BCMSClient;
  cache: BCMSMostCacheHandler;
  mediaHandler: BCMSMostMediaHandler;
  config: BCMSMostConfig;
  typeConverter: BCMSMostTypeConverterHandler;
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
          const entries = [
            (await cache.content.findOne(
              (e) => e._id === data.e,
              true,
            )) as BCMSEntryParsed,
          ];
          if (!entries[0]) {
            entries[0] = await client.entry.get({
              template: data.tm,
              entry: data.e,
              skipCache: true,
              skipStatusCheck: true,
            });
          }
          entries.push(
            ...(await cache.content.find(
              (e) =>
                e._id !== entries[0]._id &&
                JSON.stringify(e).includes(entries[0]._id),
              true,
            )),
          );
          const groupedEntries: {
            [templateName: string]: BCMSEntryParsed[];
          } = {};
          const allEntries = await cache.content.find(() => true, true);
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const access = keyAccess.templates.find(
              (e) => e._id === entry.templateId,
            );
            if (access && access.get) {
              if (!groupedEntries[access.name]) {
                groupedEntries[access.name] = [];
              }
              const srcEntry = await client.entry.get({
                template: entry.templateId,
                entry: entry._id,
                skipCache: true,
                skipStatusCheck: true,
              });
              const res = await bcmsMostEntryLinkParser(
                srcEntry,
                allEntries,
                config,
                cache,
              );
              groupedEntries[access.name].push(res.entry);
            }
          }
          for (const groupName in groupedEntries) {
            await cache.content.set({
              groupName,
              items: groupedEntries[groupName],
            });
          }
          await mediaHandler.pull();
          onMessage(
            'info',
            cnsl.info(
              'entry',
              `Successfully updated "${entries[0].meta.en.slug}" in "${tempAccess.name}"`,
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
  async function handleTypeUpdate() {
    await typeConverter.pull();
  }
  client.socket.subscribe(BCMSSocketEventName.GROUP, async () => {
    handleTypeUpdate();
  });
  client.socket.subscribe(BCMSSocketEventName.WIDGET, async () => {
    handleTypeUpdate();
  });
  client.socket.subscribe(BCMSSocketEventName.TEMPLATE, async () => {
    handleTypeUpdate();
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
        await mediaHandler.pull();
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
