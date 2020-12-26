import { BCMSClientPrototype } from '@becomes/cms-client';
import { BCMSMostCacheContent, BCMSMostConfig } from '../types';
import { Console, ErrorHandler } from '../util';
import { BCMSMostCacheHandlerPrototype } from './cache';

export interface BCMSMostContentHandlerPrototype {
  pull(): Promise<void>;
}

export function BCMSMostContentHandler(
  config: BCMSMostConfig,
  client: BCMSClientPrototype,
  cache: BCMSMostCacheHandlerPrototype,
) {
  const cnsl = Console('BCMSMostContentHandler');
  const self: BCMSMostContentHandlerPrototype = {
    async pull() {
      cnsl.info('pull', 'Started...');
      const contentCache = await cache.get.content<BCMSMostCacheContent>();
      if (JSON.stringify(contentCache) !== '{}') {
        return;
      }
      const startTime = Date.now();
      const templateNameMap: {
        [templateId: string]: string;
      } = {};
      const access = await client.keyAccess();
      for (const i in access.templates) {
        const templateAccess = access.templates[i];
        if (templateAccess.get) {
          const template = await client.template.get(templateAccess._id);
          templateNameMap[template._id] = template.name;
        }
      }
      if (!config.entries) {
        config.entries = [];
      }
      for (const templateId in templateNameMap) {
        const eConf = config.entries.find((e) => e.templateId === templateId);
        if (!eConf) {
          config.entries.push({
            templateId,
          });
        }
      }
      for (let i = 0; i < config.entries.length; i = i + 1) {
        const entryConfig = config.entries[i];
        const name = templateNameMap[entryConfig.templateId];
        if (!name) {
          cnsl.error(
            '',
            `Template with ID "${entryConfig.templateId}"` +
              ` is not known or cannot be accessed by the Key.`,
          );
          throw Error();
        }
        cnsl.info(
          `[ ${i + 1}/${config.entries.length} ] ${name}`,
          'getting entries ...',
        );
        const getEntriesTimeOffset = Date.now();

        contentCache[name] = await client.entry.getAll(
          entryConfig.templateId,
          true,
        );
        if (typeof entryConfig.modify === 'function') {
          for (const i in contentCache[name]) {
            const entry = contentCache[name][i];
            const output = await entryConfig.modify(
              JSON.parse(JSON.stringify(entry)),
              contentCache,
            );
            if (typeof output === 'object') {
              output._id = entry._id;
              output.createdAt = entry.createdAt;
              output.updatedAt = entry.updatedAt;
              output.templateId = entry.templateId;
              contentCache[name][i] = output;
            } else {
              throw ErrorHandler.get(
                `Error in "modify" function for entries in template "${
                  entryConfig.templateId
                }". Expected output to be "object" but got "${typeof output}"`,
              );
            }
          }
        }
        cnsl.info(
          `[ ${i + 1}/${config.entries.length} ] ${name}`,
          `Done in: ${(Date.now() - getEntriesTimeOffset) / 1000}s`,
        );
      }
      await cache.update.content(contentCache);
      cnsl.info('pull', `Done in: ${(Date.now() - startTime) / 1000}s`);
    },
  };
  return self;
}
