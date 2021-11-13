import { BCMSClientPrototype } from '@becomes/cms-client';
import { useLogger } from '@becomes/purple-cheetah';
import {
  BCMSMostCacheContent,
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostContentHandler,
} from '../types';
import { ErrorHandler } from '../util';
/**
 * Provides methods for the BCMS content API.
 */
export function createBcmsMostContentHandler({
  config,
  client,
  cache,
}: {
  /** Configuration object. */
  config: BCMSMostConfig;
  /** Client created by the `@becomes/cms-client`. */
  client: BCMSClientPrototype;
  /** Cache handler objet. */
  cache: BCMSMostCacheHandler;
}): BCMSMostContentHandler {
  const cnsl = useLogger({
    name: 'BCMSMostContentHandler',
  });
  return {
    async pull() {
      cnsl.info('pull', 'Started...');
      const contentInfo = await cache.get.contentInfo();
      if (contentInfo.pullAfter < Date.now()) {
        if (config.contentTTL) {
          await cache.update.contentInfo({
            pullAfter: Date.now() + config.contentTTL,
          });
        }
        const contentCache = await cache.get.content<BCMSMostCacheContent>();
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
          cnsl.info(
            `[ ${i + 1}/${config.entries.length} ] ${name}`,
            `Done in: ${(Date.now() - getEntriesTimeOffset) / 1000}s`,
          );
        }
        for (let i = 0; i < config.entries.length; i++) {
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
          if (typeof entryConfig.modify === 'function') {
            for (let j = 0; j < contentCache[name].length; j++) {
              const entry = contentCache[name][j];
              const output = await entryConfig.modify(
                JSON.parse(JSON.stringify(entry)),
                contentCache,
              );
              if (typeof output === 'object') {
                output._id = entry._id;
                output.createdAt = entry.createdAt;
                output.updatedAt = entry.updatedAt;
                output.templateId = entry.templateId;
                contentCache[name][j] = output;
              } else {
                throw ErrorHandler(
                  `Error in "modify" function for entries in template "${
                    entryConfig.templateId
                  }". Expected output to be "object" but got "${typeof output}"`,
                );
              }
            }
          }
        }
        await cache.update.content(contentCache);
        cnsl.info('pull', `Done in: ${(Date.now() - startTime) / 1000}s`);
      }
      cnsl.info('pull', `Done in: 0s`);
    },
  };
}
