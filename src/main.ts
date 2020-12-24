import * as os from 'os';
import * as path from 'path';
import {
  BCMSClient,
  BCMSClientPrototype,
  MediaResponse,
  MediaType,
} from '@becomes/cms-client';
import { Config, Media, MediaCache } from './types';
import { Console, FS, General, PPLB } from './util';

export interface BCMSMostPrototype {
  client: BCMSClientPrototype;
  cache: {
    get: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content(): Promise<any>;
      media(): Promise<MediaCache>;
      processMedia(): Promise<Media[]>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function(): Promise<any>;
    };
  };
  content: {
    pull(): Promise<void>;
  };
  media: {
    pull(): Promise<void>;
    process(): Promise<void>;
  };
  function: {
    call(): Promise<void>;
  };
  parser: {
    nuxt(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gatsby(createPage: any, failOnError?: boolean): Promise<void>;
  };
}

const MAX_PPC = 16;

function bcmsMost(
  config?: Config,
  client?: BCMSClientPrototype,
): BCMSMostPrototype {
  if (!config) {
    config = require(`${process.cwd()}/bcms.config.js`);
  }
  if (!client) {
    client = BCMSClient({
      cmsOrigin: config.cms.origin,
      key: config.cms.key,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentCache: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let functionCache: any;
  let mediaCache: MediaCache;
  let processMediaCache: Media[];
  const self: BCMSMostPrototype = {
    client,
    cache: {
      get: {
        async content() {
          if (contentCache) {
            return contentCache;
          } else if (await FS.exist(['content.cache.json'])) {
            contentCache = JSON.parse(
              (await FS.read(['content.cache.json'])).toString(),
            );
          } else {
            contentCache = {};
          }
          return contentCache;
        },
        async media() {
          if (mediaCache) {
            return mediaCache;
          } else if (await FS.exist(['media.cache.json'])) {
            mediaCache = JSON.parse(
              (await FS.read(['media.cache.json'])).toString(),
            );
          } else {
            mediaCache = {
              hash: '',
              media: [],
            };
          }
          return mediaCache;
        },
        async processMedia() {
          if (processMediaCache) {
            return processMediaCache;
          } else if (await FS.exist(['process-media.cache.json'])) {
            processMediaCache = JSON.parse(
              (await FS.read(['process-media.cache.json'])).toString(),
            );
          } else {
            processMediaCache = [];
          }
          return processMediaCache;
        },
        async function() {
          if (functionCache) {
            return functionCache;
          } else if (await FS.exist(['function.cache.json'])) {
            functionCache = JSON.parse(
              (await FS.read(['function.cache.json'])).toString(),
            );
          } else {
            functionCache = {};
          }
          return functionCache;
        },
      },
    },
    content: {
      async pull() {
        const cnsl = Console('pullContent');
        cnsl.info('started', '');
        const startTime = Date.now();

        if (!contentCache) {
          await self.cache.get.content();
        }
        if (!config.entries) {
          config.entries = [];
          const access = await client.keyAccess();
          for (const i in access.templates) {
            const templateAccess = access.templates[i];
            if (templateAccess.get) {
              const template = await client.template.get(templateAccess._id);
              config.entries.push({
                name: template.name,
                templateId: template._id,
                parse: true,
              });
            }
          }
        }
        console.log(config.entries);
        for (let i = 0; i < config.entries.length; i = i + 1) {
          const entryConfig = config.entries[i];
          if (/[0-9a-z_-_]+/g.test(entryConfig.name) === false) {
            cnsl.error(
              '',
              `Name "${entryConfig.name}" property of element [${i}] does not match regex "[^0-9a-z_-_]+"`,
            );
            throw Error();
          }
          cnsl.info(
            `[ ${i + 1}/${config.entries.length} ] ${entryConfig.name}`,
            'getting entries ...',
          );
          const getEntriesTimeOffset = Date.now();
          contentCache[entryConfig.name] = await client.entry.getAll(
            entryConfig.templateId,
            entryConfig.parse,
          );
          if (typeof entryConfig.modify === 'function') {
            contentCache[entryConfig.name] = await entryConfig.modify(
              JSON.parse(JSON.stringify(contentCache[entryConfig.name])),
              contentCache,
            );
          }
          cnsl.info(
            `[ ${i + 1}/${config.entries.length} ] ${entryConfig.name}`,
            `Done in: ${(Date.now() - getEntriesTimeOffset) / 1000}s`,
          );
        }
        await FS.save(JSON.stringify(contentCache, null, '  '), [
          'content.cache.json',
        ]);
        cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
      },
    },
    media: {
      async pull() {
        const cnsl = Console('pullMedia');
        cnsl.info('started', '...');
        const startTime = Date.now();
        if (!mediaCache) {
          await self.cache.get.media();
        }
        if (!processMediaCache) {
          await self.cache.get.processMedia();
        }
        if (!config.media.ppc) {
          config.media.ppc = os.cpus().length;
          if (config.media.ppc > MAX_PPC) {
            config.media.ppc = MAX_PPC;
          }
        }
        const media = (await client.media.getAll()).filter(
          (e) => e.data.type !== MediaType.DIR,
        );
        media.sort((a, b) => b.data.createdAt - a.data.createdAt);
        const mediaToDownload: MediaResponse[] = [];
        const mediaToRemove: MediaResponse[] = [];
        const newMediaCache: MediaCache = {
          hash: '',
          media: [],
        };
        mediaCache.media.forEach((mc) => {
          const mia = media.find((e) => e.data._id === mc._id);
          if (!mia || mia.data.updatedAt !== mc.updatedAt) {
            mediaToRemove.push({
              bin: undefined,
              data: mc,
            });
          }
        });
        media.forEach((m) => {
          const mia = mediaCache.media.find((e) => e._id === m.data._id);
          if (!mia || mia.updatedAt !== m.data.updatedAt) {
            mediaToDownload.push(m);
            processMediaCache.push(m.data);
          }
          newMediaCache.media.push(m.data);
        });
        if (mediaToRemove.length > 0) {
          await PPLB.manage<MediaResponse>(
            config.media.ppc,
            mediaToRemove,
            async (data, chunkId) => {
              if (data.data.type !== MediaType.DIR) {
                cnsl.info(
                  chunkId,
                  `Removing file: ${data.data.path}${
                    data.data.isInRoot ? '' : '/'
                  }${data.data.name}`,
                );
                const mediaPath = data.data.isInRoot
                  ? [data.data.name]
                  : (data.data.path + '/' + data.data.name).split('/').slice(1);
                const filePath = [
                  '..',
                  ...config.media.output.split('/').slice(1),
                  ...mediaPath,
                ];
                if (await FS.exist(filePath)) {
                  await FS.deleteFile(filePath);
                }
              }
            },
          );
        }
        if (mediaToDownload.length > 0) {
          await PPLB.manage<MediaResponse>(
            config.media.ppc,
            mediaToDownload,
            async (data, chunkId) => {
              cnsl.info(
                chunkId,
                `Downloading files: ${data.data.path}${
                  data.data.isInRoot ? '' : '/'
                }${data.data.name}`,
              );
              let buffer: Buffer | ArrayBuffer;
              try {
                buffer = await data.bin();
                const mediaPath = data.data.isInRoot
                  ? [data.data.name]
                  : (data.data.path + '/' + data.data.name).split('/').slice(1);
                const filePath = [
                  '..',
                  ...config.media.output.split('/').slice(1),
                  ...mediaPath,
                ];
                await FS.save(Buffer.from(buffer), filePath);
              } catch (error) {
                if (config.media.failOnError === true) {
                  throw error;
                }
                // tslint:disable-next-line: no-console
                console.error(error);
              }
            },
          );
        }
        await FS.save(JSON.stringify(newMediaCache, null, '  '), [
          'media.cache.json',
        ]);
        await FS.save(JSON.stringify(processMediaCache, null, '  '), [
          'process-media.cache.json',
        ]);
        cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
      },
      async process() {
        const cnsl = Console('processMedia');
        cnsl.info('started', '...');
        const startTime = Date.now();
        if (!processMediaCache) {
          await self.cache.get.processMedia();
        }
        if (!config.media.ppc) {
          config.media.ppc = os.cpus().length;
          if (config.media.ppc > MAX_PPC) {
            config.media.ppc = MAX_PPC;
          }
        }
        if (processMediaCache.length > 0) {
          await PPLB.manage<Media>(
            config.media.ppc,
            processMediaCache,
            async (data, chunkId) => {
              cnsl.info(
                chunkId,
                `Processing: ${
                  data.isInRoot ? data.name : data.path + '/' + data.name
                }`,
              );
              let output = '';
              let error = '';
              try {
                await General.exec(
                  `bcms-most --media-processor --media ${Buffer.from(
                    JSON.stringify(data),
                  ).toString('hex')} --media-config ${Buffer.from(
                    JSON.stringify(config.media),
                  ).toString('hex')}`,
                  (type, chunk) => {
                    if (type === 'stderr') {
                      error += chunk;
                    } else {
                      output += chunk;
                    }
                  },
                );
              } catch (e) {
                error = e ? e.message : 'Process failed with no message.';
              }
              if (error !== '') {
                cnsl.error(chunkId, {
                  output,
                  error,
                });
              } else {
                cnsl.info(
                  chunkId,
                  `Done: ${
                    data.isInRoot ? data.name : data.path + '/' + data.name
                  }`,
                );
              }
            },
          );
          await FS.save(JSON.stringify([], null, '  '), [
            'process-media.cache.json',
          ]);
        }
        cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
      },
    },
    function: {
      async call() {
        const cnsl = Console('pullContent');
        cnsl.info('started', '');
        const startTime = Date.now();
        if (!functionCache) {
          await self.cache.get.function();
        }
        if (config.functions) {
          for (let i = 0; i < config.functions.length; i = i + 1) {
            const fnConfig = config.functions[i];
            const stage = `[ ${i + 1}/${config.functions.length} ] ${
              fnConfig.name
            }`;
            cnsl.info(stage, 'calling ...');
            const callFunctionTimeOffset = Date.now();
            const result = await client.function.call(
              fnConfig.name,
              fnConfig.payload,
            );
            if (result.success === false) {
              cnsl.error(stage, result.result);
            } else {
              if (fnConfig.modify) {
                functionCache[
                  fnConfig.name.replace(/-/g, '_')
                ] = await fnConfig.modify(result.result);
              } else {
                functionCache[fnConfig.name.replace(/-/g, '_')] = result.result;
              }
              cnsl.info(
                stage,
                `Done in: ${(Date.now() - callFunctionTimeOffset) / 1000}s`,
              );
            }
          }
        }
        await FS.save(JSON.stringify(functionCache, null, '  '), [
          'function.cache.json',
        ]);
        cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
      },
    },
    parser: {
      async gatsby(createPage, failOnError) {
        if (config.parser && config.parser.gatsby) {
          if (createPage) {
            const cnsl = Console('Parser-Gatsby');
            cnsl.info('start', '');
            const startTime = Date.now();
            if (!contentCache) {
              await self.cache.get.content();
            }
            if (!functionCache) {
              await self.cache.get.function();
            }
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < config.parser.gatsby.length; i = i + 1) {
              const getEntriesTimeOffset = Date.now();
              const gatsbyConfig = config.parser.gatsby[i];
              const stage = `[${i + 1}/${config.parser.gatsby.length}] ${
                gatsbyConfig.page
              }`;
              cnsl.info(stage, 'Creating pages ...');
              const templateComponentPath = path.join(
                process.cwd(),
                'src',
                gatsbyConfig.page,
              );
              try {
                await gatsbyConfig.handler(
                  createPage,
                  templateComponentPath,
                  contentCache,
                  functionCache,
                );
              } catch (error) {
                if (failOnError) {
                  throw Error(error);
                }
                cnsl.error(stage, error);
              }
              cnsl.info(
                stage,
                `Done in: ${(Date.now() - getEntriesTimeOffset) / 1000}s`,
              );
            }
            cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
          } else {
            throw Error(
              'Please provide "createPage" gatsby hook to the function.',
            );
          }
        } else {
          throw Error('Missing "gatsby" parser in configuration file.');
        }
      },
      async nuxt() {
        if (config.parser && config.parser.nuxt) {
          // TODO
        } else {
          throw Error('Missing "nuxt" parser in configuration file.');
        }
      },
    },
  };
  return self;
}

export const BCMSMost = bcmsMost;
