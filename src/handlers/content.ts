// import * as Progress from 'progress';
import type { BCMSClient, BCMSEntryParsed } from '@becomes/cms-client/types';
import { createBcmsMostDefaultOnMessage } from '../on-message';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostContentHandler,
} from '../types';
import { bcmsMostEntryLinkParser, createBcmsMostConsole } from '../util';

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
      const templateIdMap: {
        [id: string]: string;
      } = {};
      const keyAccess = await client.getKeyAccess();
      for (let i = 0; i < keyAccess.templates.length; i++) {
        const tempAccess = keyAccess.templates[i];
        if (tempAccess.get) {
          // const template = await client.template.get({
          //   template: tempAccess._id,
          // });
          templateNameMap[tempAccess.name] = tempAccess._id;
          templateIdMap[tempAccess._id] = tempAccess.name;
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
      // const progressBar = new Progress('Pulling entries [:bar] :percent', {
      //   complete: '#',
      //   incomplete: ' ',
      //   total: Object.keys(templateNameMap).length,
      // });
      for (const templateName in templateNameMap) {
        const timeOffset = Date.now();
        const templateId = templateNameMap[templateName];
        onMessage('info', cnsl.info(templateName, 'getting entries ...'));
        // progressBar.interrupt(cnsl.info(templateName, 'getting entries ...'));
        const entries = await client.entry.getAll({
          template: templateId,
        });
        await cache.content.set({ groupName: templateName, items: entries });
        onMessage(
          'info',
          cnsl.info(
            templateName,
            `Done in: ${(Date.now() - timeOffset) / 1000}s`,
          ),
        );
        // progressBar.interrupt(
        //   cnsl.info(
        //     `${templateName}`,
        //     `Done in: ${(Date.now() - timeOffset) / 1000}s`,
        //   ),
        // );
        // progressBar.tick();
      }
      // progressBar.terminate();
      await cache.content.changes.set(contentChanges);
      if (config.entries && config.entries.linkParser) {
        const entries = await cache.content.find(() => true);
        const updatedEntries: {
          [templateName: string]: BCMSEntryParsed[];
        } = {};
        for (let i = 0; i < entries.length; i++) {
          const srcEntry = entries[i];
          const templateName = templateIdMap[srcEntry.templateId];
          const { entry, shouldUpdate } = await bcmsMostEntryLinkParser(
            srcEntry,
            entries,
            config,
            cache,
          );
          // let srcEntryJson = JSON.stringify(srcEntry, null, '  ');
          // const entryLinks = StringUtility.allTextBetween(
          //   srcEntryJson,
          //   'href=\\"entry:',
          //   ':entry\\"',
          // );
          // let shouldUpdate = false;
          // if (entryLinks.length > 0) {
          //   for (let j = 0; j < entryLinks.length; j++) {
          //     const link = entryLinks[j];
          //     const [eid, tid] = link.split('@*_');
          //     const targetEntry = entries.find((e) => e._id === eid);
          //     if (targetEntry) {
          //       srcEntryJson = srcEntryJson.replace(
          //         new RegExp(`entry:${eid}@\\*_${tid}@\\*_:entry`, 'g'),
          //         await config.entries.linkParser({
          //           link,
          //           targetEntry,
          //           srcEntry,
          //           srcTemplateName: templateName,
          //           cache,
          //         }),
          //       );
          //       shouldUpdate = true;
          //     }
          //   }
          // }
          if (shouldUpdate) {
            if (!updatedEntries[templateName]) {
              updatedEntries[templateName] = [];
            }
            updatedEntries[templateName].push(entry);
          }
        }
        for (const groupName in updatedEntries) {
          if (updatedEntries[groupName].length > 0) {
            await cache.content.set({
              groupName,
              items: updatedEntries[groupName],
            });
          }
        }
      }
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
            if (await query(item, contentCache)) {
              output.push(item);
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
            if (await query(item, contentCache)) {
              return item as never;
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
