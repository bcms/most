import path from 'path';
import os from 'os';
import { createWorkerManager } from '@banez/workers';
import {
  BCMSClient,
  BCMSEntryParsed,
  BCMSMedia,
  BCMSMediaType,
} from '@becomes/cms-client/types';
import type {
  BCMSMediaExtended,
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostConfigMediaSizeMap,
  BCMSMostImageProcessorHandler,
  BCMSMostImageProcessorProcessOptions,
  BCMSMostMediaHandler,
} from '@becomes/cms-most/types';
import { createFS } from '@banez/fs';
import { WorkerError } from '@banez/workers/types';
import { createBcmsMostConsole } from '@becomes/cms-most/util';
import { ChildProcess } from '@banez/child_process';
import { createBcmsMostDefaultOnMessage } from '@becomes/cms-most/on-message';
import { StringUtility } from '@banez/string-utility';

export function createBcmsMostMediaHandler({
  config,
  cache,
  client,
  getImageProcessor,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
  config: BCMSMostConfig;
  getImageProcessor: () => BCMSMostImageProcessorHandler;
}): BCMSMostMediaHandler {
  const cnsl = createBcmsMostConsole('Media handler');
  let output = ['static', 'bcms-media'];
  let ppc = os.cpus().length;
  let download = true;
  let processImages = false;
  let imageSizes: BCMSMostConfigMediaSizeMap[] = [];

  if (config.media) {
    if (config.media.output) {
      output = [...config.media.output.split('/'), 'bcms-media'];
    }
    if (config.media.ppc) {
      ppc = config.media.ppc;
    }
    if (typeof config.media.download === 'boolean') {
      download = config.media.download;
    }
    if (config.media.images && config.media.images.process) {
      processImages = true;
      imageSizes = config.media.images.sizeMap
        ? config.media.images.sizeMap
        : [];
    }
  }

  const workers = createWorkerManager({ count: ppc });
  const outputFs = createFS({
    base: path.join(process.cwd(), ...output),
  });

  outputFs
    .save(
      path.join(__dirname, '..', 'frontend', '_output-path.js'),
      `"use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.output = void 0;
    exports.output = '/${output.slice(1).join('/')}';`,
    )
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(cnsl.warn('_output-path.js', err));
    });

  const onMessage = createBcmsMostDefaultOnMessage();

  const self: BCMSMostMediaHandler = {
    output,
    ppc,
    getPath(media, allMedia) {
      if (
        media.type !== BCMSMediaType.DIR &&
        media.isInRoot &&
        !media.parentId
      ) {
        return `/${media.name}`;
      } else {
        const parent = allMedia.find((e) => e._id === media.parentId);
        if (!parent) {
          return `/${media.name}`;
        }
        return `${self.getPath(parent, allMedia)}/${media.name}`;
      }
    },
    async startImageProcessor({ media, options, imageProcessor, outputBase }) {
      const relativeOutput = outputBase || output;
      const outputPath = path.join(process.cwd(), ...relativeOutput);
      await ChildProcess.spawn('node', [
        path.join(__dirname, '..', 'image-processor-starter.js'),
        '--mediaId',
        media._id,
        '--inputBasePath',
        path.join(process.cwd(), ...output),
        '--outputBasePath',
        outputPath,
        '--optionsAsString',
        imageProcessor.optionsToString(options),
        '--config',
        Buffer.from(JSON.stringify(config)).toString('base64'),
      ]);
    },
    async pull() {
      // eslint-disable-next-line no-console
      console.log(cnsl.info('pull', 'Pulling media...'));
      const startTime = Date.now();
      const allMedia = await client.media.getAll();
      const cacheAllMedia = (await cache.media.get()).items;
      for (let i = 0; i < cacheAllMedia.length; i++) {
        const cacheMedia = cacheAllMedia[i];
        if (!allMedia.find((e) => e._id === cacheMedia._id)) {
          const pathToFile = cacheMedia.fullPath; // self.getPath(cacheMedia, cacheAllMedia);
          if (pathToFile) {
            const pathParts = pathToFile.substring(1).split('/');
            if (
              await outputFs.exist(
                pathParts,
                cacheMedia.type !== BCMSMediaType.DIR,
              )
            ) {
              if (cacheMedia.type === BCMSMediaType.DIR) {
                await outputFs.deleteDir(pathParts);
                // const toRemove = self.findAllChildren(
                //   cacheMedia,
                //   cacheAllMedia,
                // );
                // for (let j = 0; j < toRemove.length; j++) {
                //   const item = toRemove[j];
                //   mediaToRemoveFromCache[item._id] = true;
                // }
              } else {
                await outputFs.deleteFile(pathParts);
              }
            }
          }
        }
      }
      if (download) {
        // const progressBar = new ProgressBar(
        //   'Downloading media [:bar] :percent',
        //   {
        //     complete: '#',
        //     incomplete: ' ',
        //     total: allMedia.filter((e) => e.type !== BCMSMediaType.DIR).length,
        //   },
        // );
        for (let i = 0; i < allMedia.length; i++) {
          const media = allMedia[i];
          if (media.type !== BCMSMediaType.DIR) {
            const pathToFile = self.getPath(media, allMedia);
            if (pathToFile) {
              const cacheMedia = cacheAllMedia.find((e) => e._id === media._id);
              workers
                .assign(async () => {
                  const pathParts = pathToFile.substring(1).split('/');
                  if (
                    (cacheMedia && cacheMedia.updatedAt !== media.updatedAt) ||
                    !(await outputFs.exist(pathParts, true))
                  ) {
                    onMessage('info', cnsl.info(pathToFile, 'Started...'));
                    // progressBar.interrupt(cnsl.info(pathToFile, 'Started...'));
                    const file = (await media.bin()) as Buffer;
                    await outputFs.save(pathParts, file);
                    onMessage('info', cnsl.info(pathToFile, 'Done.'));
                    // progressBar.interrupt(cnsl.info(pathToFile, 'Done.'));
                  }
                })
                .then((result) => {
                  if (result instanceof WorkerError) {
                    onMessage('error', cnsl.error(pathToFile, result.error));
                    // progressBar.interrupt(cnsl.error(pathToFile, result.error));
                  }
                  // progressBar.tick();
                });
            }
          }
        }
        await workers.wait();
        // progressBar.terminate();
      }
      await cache.media.set(allMedia);
      if (processImages) {
        const imageProcessor = getImageProcessor();
        // const progressBar = new ProgressBar(
        //   'Processing images [:bar] :percent',
        //   {
        //     complete: '#',
        //     incomplete: ' ',
        //     total: allMedia.filter((e) => e.type === BCMSMediaType.IMG).length,
        //   },
        // );
        for (let i = 0; i < allMedia.length; i++) {
          const media = allMedia[i];
          if (media.type === BCMSMediaType.IMG) {
            const pathToFile = self.getPath(media, allMedia);
            if (pathToFile) {
              workers
                .assign(async (wid) => {
                  onMessage(
                    'info',
                    cnsl.info(`[w${wid}] ` + pathToFile, 'Processing...'),
                  );
                  // progressBar.interrupt(
                  //   cnsl.info(`[w${wid}] ` + pathToFile, 'Processing...'),
                  // );
                  const options: BCMSMostImageProcessorProcessOptions = {
                    position: 'cover',
                    sizes: {
                      auto: imageSizes.length > 0 ? undefined : true,
                      exec: imageSizes.length > 0 ? imageSizes : undefined,
                    },
                  };
                  const versionPaths = imageProcessor.getVersionPaths({
                    media,
                    allMedia,
                    options,
                  });
                  let skip = true;
                  for (let j = 0; j < versionPaths.length; j++) {
                    const versionPath = versionPaths[j];
                    if (!(await outputFs.exist(versionPath, true))) {
                      skip = false;
                      break;
                    }
                  }
                  if (!skip) {
                    self.startImageProcessor({
                      media,
                      options,
                      imageProcessor,
                    });
                  }
                  onMessage(
                    'info',
                    cnsl.info(`[w${wid}] ` + pathToFile, 'Done.'),
                  );
                })
                .then((result) => {
                  if (result instanceof WorkerError) {
                    // eslint-disable-next-line no-console
                    console.error(cnsl.error(pathToFile, result.error));
                  }
                });
            }
          }
        }
        await workers.wait();
      }
      if (!config.media) {
        config.media = {};
      }
      if (!config.media.linkParser) {
        if (!config.media.origin) {
          config.media.origin = config.cms.origin;
        }
        if (!config.media.publicApiKeyId) {
          config.media.publicApiKeyId = config.cms.key.id;
        }
        const mediaConfig = config.media;
        config.media.linkParser = async ({ media }) => {
          return `${mediaConfig.origin}/api/media/pip/${media._id}/bin/${mediaConfig.publicApiKeyId}/${media.name}`;
        };
      }
      if (config.media && config.media.linkParser) {
        const entries = await cache.content.find(() => true);
        const updatedEntries: {
          [templateName: string]: BCMSEntryParsed[];
        } = {};
        const templateIdMap = await cache.content.getGroups(true);
        for (let i = 0; i < entries.length; i++) {
          const srcEntry = entries[i];
          let srcEntryJson = JSON.stringify(srcEntry);
          const templateName = templateIdMap[srcEntry.templateId];
          const entryLinks = StringUtility.allTextBetween(
            srcEntryJson,
            'href=\\"media:',
            ':media\\"',
          );
          let shouldUpdate = false;
          if (entryLinks.length > 0) {
            for (let j = 0; j < entryLinks.length; j++) {
              const link = entryLinks[j];
              const [mediaId, alt_text, caption] = link.split('@*_');
              const media = allMedia.find((e) => e._id === mediaId);
              if (media) {
                srcEntryJson = srcEntryJson.replace(
                  new RegExp(
                    `media:${mediaId}@\\*_${alt_text}@\\*_${caption}@\\*_:media`,
                    'g',
                  ),
                  await config.media.linkParser({
                    link,
                    media: media as unknown as BCMSMediaExtended,
                    templateName,
                    entry: srcEntry,
                    cache,
                  }),
                );
                shouldUpdate = true;
              }
            }
          }
          if (shouldUpdate) {
            if (!updatedEntries[templateName]) {
              updatedEntries[templateName] = [];
            }
            updatedEntries[templateName].push(JSON.parse(srcEntryJson));
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
    findAllChildren(target, allMedia) {
      const result: BCMSMedia[] = [];
      if (target.type === BCMSMediaType.DIR) {
        const children = allMedia.filter((e) => e.parentId === target._id);
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          result.push(child);
          if (child.type === BCMSMediaType.DIR) {
            const childChildren = self.findAllChildren(child, allMedia);
            for (let j = 0; j < childChildren.length; j++) {
              const cc = childChildren[j];
              result.push(cc);
            }
          }
        }
      }
      return result;
    },
    async download(target, allMedia) {
      if (!allMedia) {
        allMedia = (await cache.media.get()).items;
      }
      const media = await client.media.get(target as string);
      await cache.media.set(media);
      allMedia.push(media);
      if (media.type !== BCMSMediaType.DIR) {
        const pathToFile = self.getPath(media, allMedia);
        if (pathToFile) {
          if (download) {
            const pathParts = pathToFile.substring(1).split('/');
            const file = (await media.bin()) as Buffer;
            await outputFs.save(pathParts, file);
          }
          if (processImages && media.type === BCMSMediaType.IMG) {
            const imageProcessor = getImageProcessor();
            const options: BCMSMostImageProcessorProcessOptions = {
              position: 'cover',
              sizes: {
                auto: imageSizes.length > 0 ? undefined : true,
                exec: imageSizes.length > 0 ? imageSizes : undefined,
              },
            };
            const outputPath = path.join(process.cwd(), ...output);
            await ChildProcess.spawn('node', [
              path.join(__dirname, '..', 'image-processor-starter.js'),
              '--mediaId',
              media._id,
              '--inputBasePath',
              outputPath,
              '--outputBasePath',
              outputPath,
              '--optionsAsString',
              imageProcessor.optionsToString(options),
            ]);
          }
        }
      }
    },
    async remove(target, allMedia) {
      if (!allMedia) {
        allMedia = (await cache.media.get()).items;
      }
      const media = allMedia.find((e) => e._id === target);
      if (media) {
        const pathToFile = self.getPath(media, allMedia);
        let childrenToRemove: BCMSMedia[] = [];
        if (pathToFile) {
          const pathParts = pathToFile.substring(1).split('/');
          if (media.type === BCMSMediaType.DIR) {
            await outputFs.deleteDir(pathParts);
            childrenToRemove = self.findAllChildren(media, allMedia);
          } else {
            await outputFs.deleteFile(pathParts);
          }
        }
        await cache.media.remove([{ _id: target }, ...childrenToRemove]);
      }
    },
    outputFs,
  };

  return self;
}
