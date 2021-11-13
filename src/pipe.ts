import * as fse from 'fs-extra';
import * as path from 'path';
import * as nodeFs from 'fs/promises';
import { BCMSClientPrototype, SocketEventName } from '@becomes/cms-client';
import { useLogger, useStringUtility } from '@becomes/purple-cheetah';
import {
  BCMSEntryParsed,
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostConfigMedia,
  BCMSMostContentHandler,
  BCMSMostMediaHandler,
  BCMSMostPipe,
} from './types';
import { FS } from '@becomes/purple-cheetah/types';
import { createBcmsMostPPLB } from '.';
import { BCMSMostImageHandler } from './types/handlers/image';

export function createBcmsMostPipe({
  fs,
  cache,
  config,
  content,
  media,
  client,
  image,
}: {
  fs: FS;
  cache: BCMSMostCacheHandler;
  config: BCMSMostConfig;
  content: BCMSMostContentHandler;
  media: BCMSMostMediaHandler;
  client: BCMSClientPrototype;
  image: BCMSMostImageHandler;
}): BCMSMostPipe {
  const stringUtil = useStringUtility();

  async function getHtmlFiles(location: string) {
    const locationParts = location.split('/');
    const files = await fs.readdir(path.join(process.cwd(), ...locationParts));
    const output: string[] = [];
    for (const i in files) {
      const file = await nodeFs.lstat(
        path.join(process.cwd(), location, files[i]),
      );
      if (file.isDirectory()) {
        const children = await getHtmlFiles(location + '/' + files[i]);
        children.forEach((e) => {
          output.push(e);
        });
      } else if (files[i].endsWith('.html')) {
        output.push(path.join(process.cwd(), ...locationParts, files[i]));
      }
    }
    return output;
  }

  return {
    async initialize({ onSocketEvent }) {
      await content.pull();
      await media.pull();
      await client.socket.connect({
        url: config.cms.origin,
        path: '/api/socket/server',
      });
      client.socket.subscribe(async (name, data) => {
        let entry: BCMSEntryParsed<unknown> = undefined as never;
        if (name === SocketEventName.ENTRY) {
          const templateId =
            data.entry.additional && data.entry.additional.templateId
              ? data.entry.additional.templateId
              : '-1';
          if (
            data.type !== 'remove' &&
            (await client.keyAccess()).templates.find(
              (e) => e._id === templateId,
            )
          ) {
            entry = (await client.entry.get({
              entryId: data.entry._id,
              templateId: templateId,
              parse: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any;
          }
          const contentCache = await cache.get.content();
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
                      contentCache[contentCacheName][i] =
                        await entryConfig.modify(
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
            await cache.update.content(contentCache);
            if (onSocketEvent) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await onSocketEvent({ name, data, entry });
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error(error);
              }
            }
          }
        }
        if (onSocketEvent) {
          onSocketEvent({ name, data, entry }).catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error);
          });
        }
      });
    },
    async postBuild({ outputPath, relativePath }) {
      const cnsl = useLogger({ name: 'BCMSMostPipePostBuild' });
      const basePath = path.join(process.cwd(), relativePath);
      const pages = (await getHtmlFiles(relativePath)).map((e) =>
        e.replace(basePath, '').substring(1),
      );
      const sources: string[] = [];
      const sourcesBuffer: {
        [path: string]: boolean;
      } = {};
      for (const i in pages) {
        const page = (
          await fs.read(
            path.join(
              process.cwd(),
              ...relativePath.split('/'),
              ...pages[i].split('/'),
            ),
          )
        ).toString();
        const pictures = stringUtil.allTextBetween(page, 'bcms-img', '</div>');
        for (const j in pictures) {
          if (stringUtil.textBetween(pictures[j], '<picture', '</picture>')) {
            let source = stringUtil.allTextBetween(
              pictures[j],
              'srcSet="',
              '"',
            )[1];
            if (!source) {
              source = stringUtil.allTextBetween(
                pictures[j],
                'srcSet=',
                '>',
              )[1];
              if (!source) {
                source = stringUtil.allTextBetween(
                  pictures[j],
                  'srcset="',
                  '"',
                )[1];
                if (!source) {
                  source = stringUtil.allTextBetween(
                    pictures[j],
                    'srcset=',
                    '>',
                  )[1];
                }
              }
            }
            if (source) {
              source = source.split(' ')[0];
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
        const mediaConfig = config.media as BCMSMostConfigMedia;
        const pplb = createBcmsMostPPLB<string>();
        await pplb(
          mediaConfig.ppc as number,
          sources,
          async (data, chunkId) => {
            // eslint-disable-next-line no-console
            console.log(
              `[ ${chunkId}/${sources.length} ]  Processing image ...`,
            );
            await image.resolver({
              rawOptions: data.split('/')[2],
              pathToFile: data,
              path: '/' + data.split('/').slice(3).join('/'),
            });
            // eslint-disable-next-line no-console
            console.log(
              `[ ${chunkId}/${sources.length} ] Processing image complete`,
            );
          },
        );
        if (outputPath) {
          const src = path.join(process.cwd(), mediaConfig.output);
          const dest = path.join(process.cwd(), outputPath);
          if (src !== dest) {
            await fse.copy(
              path.join(process.cwd(), mediaConfig.output),
              path.join(process.cwd(), outputPath),
            );
          }
        }
      }
    },
  };
}
