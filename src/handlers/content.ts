import { BCMSClientPrototype } from '@becomes/cms-client';
import { BCMSMostCacheContent, BCMSMostConfig } from '../types';
import { Console, ErrorHandler } from '../util';
import { BCMSMostCacheHandlerPrototype } from './cache';

/**
 * Return type from the `BCMSMostContentHandler()` function.
 * 
 * This object is used for interaction with the BCMS content API.
 */
export interface BCMSMostContentHandlerPrototype {
  /**
   * Pull all content from the BCMS. Cached version (if available) is
   * compared with indexes returned by the BCMS and only modified or
   * new data is requested. Using `BCMSMostCacheHandler`, local
   * cache is updated.
   */
  pull(): Promise<void>;
}

/**
 * Provides methods for the BCMS content API.
 */
export function BCMSMostContentHandler(
  /** Configuration object. */
  config: BCMSMostConfig,
  /** Client created by the `@becomes/cms-client`. */
  client: BCMSClientPrototype,
  /** Cache handler objet. */
  cache: BCMSMostCacheHandlerPrototype,
) {
  const cnsl = Console('BCMSMostContentHandler');
  const self: BCMSMostContentHandlerPrototype = {
    async pull() {
      cnsl.info('pull', 'Started...');
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
      for(let i = 0; i < config.entries.length; i++) {
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
              throw ErrorHandler.get(
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
    },
  };
  return self;
}
