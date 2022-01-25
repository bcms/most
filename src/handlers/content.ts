import * as Progress from 'progress';
import type { BCMSClient } from '@becomes/cms-client/types';
import { createBcmsMostDefaultOnMessage } from '../on-message';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostContentHandler,
} from '../types';
import { createBcmsMostConsole } from '../util';

export function createBcmsMostContentHandler({
  cache,
  client,
  config,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
  config: BCMSMostConfig;
}): BCMSMostContentHandler {
  const cnsl = createBcmsMostConsole('Content handler');
  return {
    async pull(data) {
      const startTime = Date.now();
      const onMessage =
        data && data.onMessage
          ? data.onMessage
          : createBcmsMostDefaultOnMessage();

      const cacheContentChanges = await cache.content.changes.get();
      const contentChanges = await client.changes.getInfo();
      if (cacheContentChanges) {
        if (
          contentChanges.entry.lastChangeAt ===
          cacheContentChanges.entry.lastChangeAt
        ) {
          onMessage('info', cnsl.info('pull', 'Cache up to date.'));
          return;
        }
      }

      onMessage('info', cnsl.info('pull', 'Started...'));

      const templateNameMap: {
        [name: string]: string;
      } = {};
      const keyAccess = await client.getKeyAccess();
      for (let i = 0; i < keyAccess.templates.length; i++) {
        const tempAccess = keyAccess.templates[i];
        if (tempAccess.get) {
          const template = await client.template.get({
            templateId: tempAccess._id,
          });
          templateNameMap[template.name] = template._id;
        }
      }
      if (config.entries) {
        if (config.entries.includeFromTemplates) {
          const templateNames = Object.keys(templateNameMap);
          for (const templateName in templateNames) {
            const templateId = templateNames[templateName];
            if (!config.entries.includeFromTemplates.includes(templateId)) {
              delete templateNames[templateName];
            }
          }
        }
        if (config.entries.excludeFromTemplates) {
          const templateNames = Object.keys(templateNameMap);
          for (const templateName in templateNames) {
            const templateId = templateNames[templateName];
            if (config.entries.excludeFromTemplates.includes(templateId)) {
              delete templateNames[templateName];
            }
          }
        }
      }
      const progressBar = new Progress('Pulling entries [:bar] :percent', {
        complete: '#',
        incomplete: ' ',
        total: Object.keys(templateNameMap).length,
      });
      for (const templateName in templateNameMap) {
        const timeOffset = Date.now();
        const templateId = templateNameMap[templateName];
        progressBar.interrupt(cnsl.info(templateName, 'getting entries ...'));
        const entries = await client.entry.getAll({
          templateId,
        });
        await cache.content.set({ groupName: templateName, items: entries });
        progressBar.interrupt(
          cnsl.info(
            `${templateName}`,
            `Done in: ${(Date.now() - timeOffset) / 1000}s`,
          ),
        );
        progressBar.tick();
      }
      progressBar.terminate();
      await cache.content.changes.set(contentChanges);
      onMessage(
        'info',
        cnsl.info('pull', `Done in: ${(Date.now() - startTime) / 1000}s`),
      );
    },
    entry: {
      async find(template, query) {
        const contentCache = await cache.content.get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output: any[] = [];
        if (contentCache[template]) {
          for (let i = 0; i < contentCache[template].length; i++) {
            const item = contentCache[template][i];
            const queryResult = await query(item, contentCache);
            if (queryResult) {
              output.push(queryResult);
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Template "${template}" does not exist.`);
        }

        return output;
      },
      async findOne(template, query) {
        const contentCache = await cache.content.get();
        if (contentCache[template]) {
          for (let i = 0; i < contentCache[template].length; i++) {
            const item = contentCache[template][i];
            const queryResult = await query(item, contentCache);
            if (queryResult) {
              return queryResult;
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Template "${template}" does not exist.`);
        }

        return null;
      },
    },
  };
}
