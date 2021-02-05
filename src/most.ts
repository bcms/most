import * as path from 'path';
import {
  BCMSClient,
  BCMSClientPrototype,
  Entry,
  SocketEventName,
} from '@becomes/cms-client';
import {
  BCMSMostCacheHandler,
  BCMSMostCacheHandlerPrototype,
  BCMSMostContentHandler,
  BCMSMostContentHandlerPrototype,
  BCMSMostFunctionHandler,
  BCMSMostFunctionHandlerPrototype,
  BCMSMostImageHandler,
  BCMSMostImageHandlerPrototype,
  BCMSMostMediaHandler,
  BCMSMostMediaHandlerPrototype,
} from './handlers';
import { BCMSMostConfig, BCMSMostConfigSchema, BCMSMostPipe } from './types';
import { Console, FS, General } from './util';

/**
 * Output type from the `BCMSMost` function.
 */
export interface BCMSMostPrototype {
  /**
   * Update configuration object in-memory.
   */
  updateConfig(config: BCMSMostConfig): void;
  /**
   * Local client object created from the `@becomes/cms-client`
   */
  client: BCMSClientPrototype;
  /**
   * Cache handler object.
   */
  cache: BCMSMostCacheHandlerPrototype;
  /**
   * Content handler object.
   */
  content: BCMSMostContentHandlerPrototype;
  /**
   * Media handler object/
   */
  media: BCMSMostMediaHandlerPrototype;
  /**
   * Function handler object
   */
  function: BCMSMostFunctionHandlerPrototype;
  /**
   * Image handler object.
   */
  image: BCMSMostImageHandlerPrototype;
  /**
   * Pipe handler object.
   */
  pipe: BCMSMostPipe;
}

export const MAX_PPC = 16;

/**
 * Creates a BCMSMost object with all handlers and additional helpers.
 *
 * Usage: `const bcmsMost = BCMSMost(myConfig);`
 */
export function BCMSMost(
  /**
   * If not provided, `bcms.config.js` file must be available
   * at the root of the project (**{cwd}/bcms.config.js**).
   */
  config?: BCMSMostConfig,
  /**
   * If not provided, client will be created using data from
   * the configuration.
   */
  client?: BCMSClientPrototype,
) {
  if (!config) {
    config = require(`${process.cwd()}/bcms.config.js`);
  }
  General.object.compareWithSchema(config, BCMSMostConfigSchema, 'options');
  if (!client) {
    client = BCMSClient({
      cmsOrigin: config.cms.origin,
      key: config.cms.key,
    });
  }
  const cache = BCMSMostCacheHandler();
  const content = BCMSMostContentHandler(config, client, cache);
  const media = BCMSMostMediaHandler(config, client, cache, MAX_PPC);
  const fn = BCMSMostFunctionHandler(config, client, cache);
  const image = BCMSMostImageHandler(config);
  const self: BCMSMostPrototype = {
    updateConfig(conf) {
      config = conf;
    },
    client,
    cache,
    content,
    media,
    function: fn,
    image,
    pipe: {
      async initialize(imageServerPort, onSocketEvent) {
        await self.content.pull();
        await self.media.pull();
        if (config.functions) {
          for (const i in config.functions) {
            await self.function.call(config.functions[i].name);
          }
        }
        await self.client.socket.connect({
          url: config.cms.origin,
          path: '/api/socket/server/',
        });
        self.client.socket.subscribe(async (name, data) => {
          if (name === SocketEventName.ENTRY) {
            let entry: Entry;
            if (
              data.type !== 'remove' &&
              (await self.client.keyAccess()).templates.find(
                (e) => e._id === data.entry.additional.templateId,
              )
            ) {
              entry = await self.client.entry.get({
                entryId: data.entry._id,
                templateId: data.entry.additional.templateId,
                parse: true,
              });
            }
            const contentCache = await self.cache.get.content();
            if (entry) {
              let found = false;
              for (const contentCacheName in contentCache) {
                for (const i in contentCache[contentCacheName]) {
                  const cacheEntry = contentCache[contentCacheName][i];
                  if (cacheEntry._id === entry._id) {
                    if (config.entries) {
                      const entryConfig = config.entries.find(
                        (e) => e.templateId === entry.templateId,
                      );
                      if (
                        entryConfig &&
                        typeof entryConfig.modify === 'function'
                      ) {
                        contentCache[contentCacheName][
                          i
                        ] = await entryConfig.modify(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          entry as any,
                          contentCache,
                        );
                      } else {
                        contentCache[contentCacheName][i] = entry;
                      }
                    }
                    found = true;
                    break;
                  }
                }
                if (found) {
                  break;
                }
              }
              await self.cache.update.content(contentCache);
              if (onSocketEvent) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await onSocketEvent(name, data, entry as any);
                } catch (error) {
                  console.error(error);
                }
              }
            }
          }
        });
        self.image.startServer(imageServerPort);
      },
      async postBuild(relativePath) {
        const cnsl = Console('BCMSMostPipePostBuild');
        const basePath = path.join(process.cwd(), relativePath);
        const pages = (await FS.getHtmlFiles(relativePath)).map((e) =>
          e.replace(basePath, '').substring(1),
        );
        console.log('pages', pages);
        const sources: string[] = [];
        const sourcesBuffer: {
          [path: string]: boolean;
        } = {};
        const done: boolean[] = [];
        for (const i in pages) {
          const page = (
            await FS.read([
              '..',
              ...relativePath.split('/'),
              ...pages[i].split('/'),
            ])
          ).toString();
          const pictures = General.string.getAllTextBetween(
            page,
            'class="bcms-img',
            '</div>',
          );
          for (const j in pictures) {
            if (
              General.string.getTextBetween(
                pictures[j],
                '<picture',
                '</picture>',
              )
            ) {
              const source = General.string.getAllTextBetween(
                pictures[j],
                'srcSet="',
                '"',
              )[1];
              if (source) {
                sourcesBuffer[source] = true;
              } else {
                cnsl.warn(pages[i], 'No source.');
              }
            }
          }
        }
        for (const src in sourcesBuffer) {
          sources.push(src);
        }
        cnsl.info('sources', sources);
        if (sources.length > 0) {
          await new Promise<void>((resolve) => {
            for (const i in sources) {
              const src = sources[i];
              self.image
                .resolver({
                  method: 'POST',
                  options: src.split('/')[2],
                  originalPath: src,
                  path: '/' + src.split('/').slice(3).join('/'),
                })
                .then(() => {
                  cnsl.info('', `${done.length}, ${sources.length}`);
                  done.push(true);
                  if (done.length === sources.length) {
                    resolve();
                  }
                })
                .catch((error) => {
                  cnsl.error(src, error);
                  done.push(true);
                  if (done.length === sources.length) {
                    resolve();
                  }
                });
            }
          });
        }
      },
    },
  };
  return self;
}
