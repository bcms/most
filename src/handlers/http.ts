import * as path from 'path';
import * as os from 'os';
import { createWorkerManager } from '@banez/workers';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostHttpHandler,
  BCMSMostImageProcessorHandler,
  BCMSMostMediaHandler,
} from '../types';
import { WorkerError } from '@banez/workers/types';
import { createFS } from '@banez/fs';

export function createBcmsMostHttpHandler({
  config,
  cache,
  imageProcessor,
  mediaHandler,
}: {
  config: BCMSMostConfig;
  cache: BCMSMostCacheHandler;
  imageProcessor: BCMSMostImageProcessorHandler;
  mediaHandler: BCMSMostMediaHandler;
}): BCMSMostHttpHandler {
  const worker = createWorkerManager({
    count:
      config.media && config.media.ppc ? config.media.ppc : os.cpus().length,
  });
  const outputFs = createFS({
    base: path.join(process.cwd(), ...mediaHandler.output),
  });

  const self: BCMSMostHttpHandler = {
    image: {
      async processAndResolve(data) {
        const pathParts = data.path.split('/');
        if (await outputFs.exist(pathParts.slice(1), true)) {
          return path.join(
            process.cwd(),
            ...mediaHandler.output,
            ...pathParts.slice(1),
          );
        }
        const result = await worker.assign<string>(async () => {
          const options = imageProcessor.stringToOptions(pathParts[1]);
          const rawFilePath = '/' + pathParts.slice(2).join('/');
          const rawFilePathParts = rawFilePath.split('_');
          const filePathWithoutExt = rawFilePathParts
            .splice(0, rawFilePathParts.length - 1)
            .join('/');
          const media = await cache.media.findOne((e) =>
            e.fullPath.startsWith(filePathWithoutExt),
          );
          if (!media) {
            throw {
              status: 404,
              message: `Image with path "${filePathWithoutExt}" cannot be found`,
            };
          }
          const outputPath = path.join(process.cwd(), ...mediaHandler.output);
          await mediaHandler.startImageProcessor({
            media,
            imageProcessor,
            options,
          });
          return path.join(outputPath, ...data.path.split('/').slice(1));
        });
        if (result instanceof WorkerError) {
          throw result.error;
        }
        return result.result;
      },
      async processAndResolveToBuffer(data) {
        const filePath = await self.image.processAndResolve(data);
        return await outputFs.read(filePath);
      },
    },
  };

  return self;
}
