import * as os from 'os';
import {
  BCMSClientPrototype,
  Media,
  MediaResponse,
  MediaType,
} from '@becomes/cms-client';
import { Console, General, PPLB, FS } from '../util';
import { BCMSMostConfig } from '../types';
import { BCMSMostCacheHandlerPrototype } from './cache';

export interface BCMSMostMediaHandlerPrototype {
  pull(): Promise<void>;
  process(media?: Media[]): Promise<void>;
}

export function BCMSMostMediaHandler(
  config: BCMSMostConfig,
  client: BCMSClientPrototype,
  cache: BCMSMostCacheHandlerPrototype,
  MAX_PPC: number,
) {
  const cnsl = Console('BCMSMostMediaHandler');
  const self: BCMSMostMediaHandlerPrototype = {
    async pull() {
      cnsl.info('pull', 'Started...');
      const startTime = Date.now();
      const mediaCache = await cache.get.media();
      const processMediaCache = await cache.get.processMedia();
      
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
      const newMediaCache: Media[] = [];
      mediaCache.forEach((mc) => {
        const mia = media.find((e) => e.data._id === mc._id);
        if (!mia || mia.data.updatedAt !== mc.updatedAt) {
          mediaToRemove.push({
            bin: undefined,
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
                ...config.media.output.split('/').filter((e) => !!e),
                ...mediaPath,
              ];
              await FS.save(Buffer.from(buffer), filePath);
            } catch (error) {
              if (config.media.failOnError === true) {
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
      cnsl.info('process', 'Started...');
      const startTime = Date.now();
      const processMediaCache = [
        ...(await cache.get.processMedia()),
        ...inputMedia,
      ];
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
  return self;
}
