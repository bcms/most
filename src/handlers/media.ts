import * as os from 'os';
import * as nodeFs from 'fs/promises';
import * as path from 'path';
import {
  BCMSClientPrototype,
  Media,
  MediaResponse,
  MediaType,
} from '@becomes/cms-client';
import {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostConfigMedia,
  BCMSMostMediaHandler,
} from '../types';
import { Proc, useLogger } from '@becomes/purple-cheetah';
import { createBcmsMostPPLB } from '../util';
import { FS } from '@becomes/purple-cheetah/types';

/** Provides method for the BCMS media API. */
export function createBcmsMostMediaHandler({
  fs,
  config,
  client,
  cache,
  MAX_PPC,
}: {
  fs: FS;
  config: BCMSMostConfig;
  client: BCMSClientPrototype;
  cache: BCMSMostCacheHandler;
  MAX_PPC: number;
}): BCMSMostMediaHandler {
  const cnsl = useLogger({ name: 'BCMSMostMediaHandler' });
  const pplbPull = createBcmsMostPPLB<MediaResponse>();
  const pplbProcess = createBcmsMostPPLB<Media>();
  return {
    async pull() {
      cnsl.info('pull', 'Started...');
      const startTime = Date.now();
      const mediaCache = await cache.get.media();
      const processMediaCache = await cache.get.processMedia();
      const mediaConfig = config.media as BCMSMostConfigMedia;
      if (!mediaConfig.ppc) {
        mediaConfig.ppc = os.cpus().length;
        if (mediaConfig.ppc > MAX_PPC) {
          mediaConfig.ppc = MAX_PPC;
        }
      }
      const media = (await client.media.getAll()).filter(
        (e) => e.data.type !== MediaType.DIR,
      );
      media.sort((a, b) => b.data.createdAt - a.data.createdAt);
      const mediaToDownload: MediaResponse[] = [];
      const mediaToRemove: MediaResponse[] = [];
      const newMediaCache: Media[] = [];
      mediaCache.forEach((mc) => {
        const mia = media.find((e) => e.data._id === mc._id);
        if (!mia || mia.data.updatedAt !== mc.updatedAt) {
          mediaToRemove.push({
            bin: undefined as never,
            data: mc,
          });
        }
      });
      media.forEach((m) => {
        const mia = mediaCache.find((e) => e._id === m.data._id);
        if (!mia || mia.updatedAt !== m.data.updatedAt) {
          mediaToDownload.push(m);
          processMediaCache.push(m.data);
        }
        newMediaCache.push(m.data);
      });
      if (mediaToRemove.length > 0) {
        const staticMediaDirs = await fs.readdir(mediaConfig.output);
        await pplbPull(
          mediaConfig.ppc,
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
                ...mediaConfig.output.split('/').slice(1),
                ...mediaPath,
              ];
              if (await fs.exist(filePath.join('/'), true)) {
                await fs.deleteFile(filePath.join('/'));
              }
              const mediaNameParts = data.data.name.split('.');
              const mediaName = mediaNameParts
                .slice(0, mediaNameParts.length - 1)
                .join('.');
              for (let i = 0; i < staticMediaDirs.length; i++) {
                if (
                  await fs.exist(
                    [
                      '..',
                      mediaConfig.output,
                      staticMediaDirs[i],
                      data.data.isInRoot ? '' : data.data.path,
                    ].join('/'),
                  )
                ) {
                  const fstat = await nodeFs.lstat(
                    path.join(
                      process.cwd(),
                      mediaConfig.output,
                      staticMediaDirs[i],
                      data.data.isInRoot ? '' : data.data.path,
                    ),
                  );
                  if (fstat.isDirectory()) {
                    const files = await fs.readdir(
                      path.join(
                        process.cwd(),
                        mediaConfig.output,
                        staticMediaDirs[i],
                        data.data.isInRoot ? '' : data.data.path,
                      ),
                    );
                    for (let j = 0; j < files.length; j++) {
                      const fParts = files[j].split('.');
                      const bufferParts = fParts
                        .slice(0, fParts.length - 1)
                        .join('.')
                        .split('-');
                      const fileName = bufferParts
                        .slice(0, bufferParts.length - 1)
                        .join('-');
                      if (fileName === mediaName) {
                        await fs.deleteFile(
                          [
                            '..',
                            mediaConfig.output,
                            staticMediaDirs[i],
                            data.data.isInRoot ? '' : data.data.path,
                            files[j],
                          ].join('/'),
                        );
                      }
                    }
                  }
                }
              }
            }
          },
        );
      }
      if (mediaToDownload.length > 0) {
        await pplbPull(
          mediaConfig.ppc,
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
                ...mediaConfig.output.split('/').filter((e) => !!e),
                ...mediaPath,
              ];
              await fs.save(filePath.join('/'), Buffer.from(buffer));
            } catch (error) {
              if (mediaConfig.failOnError === true) {
                throw error;
              }
              cnsl.error(chunkId, error);
            }
          },
        );
      }

      await cache.update.media(newMediaCache);
      await cache.update.processMedia(processMediaCache);
      cnsl.info('pull', `Done in: ${(Date.now() - startTime) / 1000}s`);
    },
    async process(inputMedia) {
      if (!inputMedia) {
        inputMedia = [];
      }
      const mediaConfig = config.media as BCMSMostConfigMedia;
      cnsl.info('process', 'Started...');
      const startTime = Date.now();
      const processMediaCache = [
        ...(await cache.get.processMedia()),
        ...inputMedia,
      ];
      if (!mediaConfig.ppc) {
        mediaConfig.ppc = os.cpus().length;
        if (mediaConfig.ppc > MAX_PPC) {
          mediaConfig.ppc = MAX_PPC;
        }
      }
      if (processMediaCache.length > 0) {
        await pplbProcess(
          mediaConfig.ppc,
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
              await Proc.exec(
                `bcms-most --media-processor --media ${Buffer.from(
                  JSON.stringify(data),
                ).toString('hex')} --media-config ${Buffer.from(
                  JSON.stringify(mediaConfig),
                ).toString('hex')}`,
                (type, chunk) => {
                  if (type === 'stderr') {
                    error += chunk;
                  } else {
                    output += chunk;
                  }
                },
              );
            } catch (err) {
              const e = err as Error;
              error = e
                ? e.message
                : 'Process failed with no message. Output: ' + output;
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
        await cache.update.processMedia([]);
      }
      cnsl.info('process', `Done in: ${(Date.now() - startTime) / 1000}s`);
    },
  };
}
