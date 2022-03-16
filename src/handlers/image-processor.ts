import * as sharp from 'sharp';
import * as path from 'path';
import { BCMSMediaType } from '@becomes/cms-client/types';
import type {
  BCMSMediaExtended,
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostImageProcessorHandler,
  BCMSMostImageProcessorProcessConfig,
  BCMSMostImageProcessorProcessOptions,
  BCMSMostMediaHandler,
} from '../types';
import { createBcmsMostConsole } from '../util';
import { createFS } from '@banez/fs';
import { createWorkerManager } from '@banez/workers';

export function createBcmsMostImageProcessor({
  config,
  cache,
  mediaHandler,
}: {
  config: BCMSMostConfig;
  cache: BCMSMostCacheHandler;
  mediaHandler: BCMSMostMediaHandler;
}): BCMSMostImageProcessorHandler {
  const imageWorkers = createWorkerManager({
    count: mediaHandler.ppc,
  });
  const mimetypeMap: {
    jpg: string[];
    png: string[];
  } = {
    jpg: ['image/jpeg', 'image/pjpeg'],
    png: ['image/png'],
  };
  const cnsl = createBcmsMostConsole('Image processor');
  const fs = createFS();
  let defaultSizeMap: Array<{ width: number; height?: number }> = [
    {
      width: 350,
    },
    {
      width: 650,
    },
    {
      width: 900,
    },
    {
      width: 1200,
    },
    {
      width: 1920,
    },
  ];

  if (config.media && config.media.images && config.media.images.sizeMap) {
    defaultSizeMap = config.media.images.sizeMap.map((e) => {
      return {
        width: e.width,
        height: e.height,
      };
    });
  }

  const self: BCMSMostImageProcessorHandler = {
    optionsToString(options) {
      const ops: string[] = [];
      if (options.position) {
        ops.push(`_p${options.position}`);
      }
      if (options.quality) {
        ops.push(`_q${options.quality}`);
      }
      if (options.sizes) {
        if (options.sizes.auto) {
          ops.push('_sa');
        } else if (options.sizes.exec) {
          ops.push(
            `_se${options.sizes.exec
              .map((e) => `${e.width}x${e.height ? e.height : 'a'}`)
              .join('-')}`,
          );
        } else if (options.sizes.steps) {
          ops.push(`_ss${options.sizes.steps}`);
        }
      }
      return ops.join('');
    },
    stringToOptions(options) {
      const ops: BCMSMostImageProcessorProcessOptions = {};
      const segments = options.split('_');
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.startsWith('p')) {
          ops.position = seg.substring(1) as never;
        } else if (seg.startsWith('q')) {
          const quality = parseInt(seg.substring(1));
          if (!isNaN(quality)) {
            ops.quality = quality;
          }
        } else if (seg.startsWith('sa')) {
          ops.sizes = {
            auto: true,
          };
        } else if (seg.startsWith('ss')) {
          const stepSize = parseInt(seg.substring(2));
          if (!isNaN(stepSize)) {
            ops.sizes = { steps: stepSize };
          }
        } else if (seg.startsWith('se')) {
          const sizes: Array<{
            width: number;
            height?: number;
          }> = [];
          const sizeSegments = seg.substring(2).split('-');
          for (let j = 0; j < sizeSegments.length; j++) {
            const sizeSeg = sizeSegments[j];
            const [widthS, heightS] = sizeSeg.split('x');
            let width = -1;
            let height: number | undefined = undefined;
            if (widthS) {
              width = parseInt(widthS);
            }
            if (heightS && heightS !== 'a') {
              height = parseInt(heightS);
              if (isNaN(height)) {
                height = undefined;
              }
            }
            if (width !== -1 && !isNaN(width)) {
              sizes.push({
                width,
                height,
              });
            }
          }
          ops.sizes = {
            exec: sizes,
          };
        }
      }
      return ops;
    },
    async process({
      input,
      inputBasePath,
      outputBasePath,
      options,
      optionsAsString,
    }: BCMSMostImageProcessorProcessConfig): Promise<void> {
      if (!options && !optionsAsString) {
        throw Error('Missing options parameter.');
      }
      let ops: BCMSMostImageProcessorProcessOptions;
      if (optionsAsString) {
        ops = self.stringToOptions(optionsAsString);
      } else {
        ops = options as BCMSMostImageProcessorProcessOptions;
      }

      let media: BCMSMediaExtended | null = null;
      if (typeof input === 'string') {
        media = await cache.media.findOne((e) => e._id === input);
      } else {
        media = input;
        // if ((input as BCMSMediaExtended).fullPath) {
        //   media = input as BCMSMediaExtended;
        // } else {
        //   const fullPath = mediaHandler.getPath(input, allMedia);
        //   media = {
        //     ...input,
        //     fullPath: fullPath ? fullPath : input.name,
        //   };
        // }
      }
      if (!media) {
        // eslint-disable-next-line no-console
        console.warn(cnsl.warn('process', { input }));
        throw Error('Cannot find media from input');
      }
      if (media.type !== BCMSMediaType.IMG) {
        throw Error(`Input file is of type ${media.type} is not IMG.`);
      }
      const relativeInputFilePath = media.fullPath; //mediaHandler.getPath(media, allMedia);
      if (!relativeInputFilePath) {
        // eslint-disable-next-line no-console
        console.warn(cnsl.warn('process', media));
        throw Error(`Failed to resolve file path.`);
      }
      const absoluteInputFilePath = path.join(
        inputBasePath,
        ...relativeInputFilePath.substring(1).split('/'),
      );

      if (!(await fs.exist(absoluteInputFilePath, true))) {
        throw Error(`File does not exist at path: ${absoluteInputFilePath}`);
      }
      const inputFile = await fs.read(absoluteInputFilePath);

      let sizes: Array<{
        width: number;
        height?: number;
      }> = [];

      if (ops.sizes) {
        if (ops.sizes.auto) {
          sizes = defaultSizeMap;
        } else if (ops.sizes.exec) {
          sizes = ops.sizes.exec;
        } else if (ops.sizes.steps) {
          const widthStep = media.width / ops.sizes.steps;
          const heightStep = media.height / ops.sizes.steps;
          for (let i = 0; i <= ops.sizes; i++) {
            sizes.push({
              width: widthStep + widthStep * i,
              height: heightStep + heightStep * i,
            });
          }
        }
      }

      let createWebP = false;
      const relativeFilePathParts = relativeInputFilePath.split('.');
      const filePath = relativeFilePathParts.slice(
        0,
        relativeFilePathParts.length - 1,
      );
      const fileExt = relativeFilePathParts[relativeFilePathParts.length - 1];
      if (mimetypeMap.jpg.includes(media.mimetype)) {
        createWebP = true;
        for (let i = 0; i < sizes.length; i++) {
          const outputFilePath = path.join(
            outputBasePath,
            self.optionsToString(ops),
            `${filePath}_${i}.${fileExt}`,
          );
          if (!(await fs.exist(outputFilePath, true))) {
            const size = sizes[i];
            const file = await sharp(inputFile)
              .resize({
                fit: ops.position ? ops.position : 'cover',
                width: size.width,
                height: size.height,
                withoutEnlargement: true,
              })
              .jpeg({
                quality: ops.quality ? ops.quality : 70,
              })
              .toBuffer();
            await fs.save(outputFilePath, file);
          }
        }
      } else if (mimetypeMap.png.includes(media.mimetype)) {
        createWebP = true;
        for (let i = 0; i < sizes.length; i++) {
          const size = sizes[i];
          const outputFilePath = path.join(
            outputBasePath,
            self.optionsToString(ops),
            `${filePath}_${i}.${fileExt}`,
          );
          if (!(await fs.exist(outputFilePath, true))) {
            const file = await sharp(inputFile)
              .resize({
                fit: ops.position ? ops.position : 'cover',
                width: size.width,
                height: size.height,
                withoutEnlargement: true,
              })
              .png({
                quality: ops.quality ? ops.quality : 70,
              })
              .toBuffer();
            await fs.save(outputFilePath, file);
          }
        }
      }
      if (createWebP) {
        for (let i = 0; i < sizes.length; i++) {
          const size = sizes[i];
          const outputFilePath = path.join(
            outputBasePath,
            self.optionsToString(ops),
            `${filePath}_${i}.webp`,
          );
          if (!(await fs.exist(outputFilePath, true))) {
            const file = await sharp(inputFile)
              .resize({
                fit: ops.position ? ops.position : 'cover',
                width: size.width,
                height: size.height,
                withoutEnlargement: true,
              })
              .webp({
                quality: ops.quality ? ops.quality : 70,
              })
              .toBuffer();
            await fs.save(outputFilePath, file);
          }
        }
      }
    },
    getVersionPaths({ media, options, allMedia }) {
      if (
        !mimetypeMap.jpg.includes(media.mimetype) &&
        !mimetypeMap.png.includes(media.mimetype)
      ) {
        return [];
      }
      let sizes: Array<{
        width: number;
        height?: number;
      }> = [];
      if (options.sizes) {
        if (options.sizes.auto) {
          sizes = defaultSizeMap;
        } else if (options.sizes.exec) {
          sizes = options.sizes.exec;
        } else if (options.sizes.steps) {
          const widthStep = media.width / options.sizes.steps;
          const heightStep = media.height / options.sizes.steps;
          for (let i = 0; i <= options.sizes; i++) {
            sizes.push({
              width: widthStep + widthStep * i,
              height: heightStep + heightStep * i,
            });
          }
        }
      }
      const result: string[] = [];
      const relativeInputFilePath = (media as BCMSMediaExtended).fullPath
        ? (media as BCMSMediaExtended).fullPath
        : mediaHandler.getPath(media, allMedia as BCMSMediaExtended[]);
      if (!relativeInputFilePath) {
        return [];
      }
      const relativeFilePathParts = relativeInputFilePath.split('.');
      const filePath = relativeFilePathParts.slice(
        0,
        relativeFilePathParts.length - 1,
      );
      const fileExt = relativeFilePathParts[relativeFilePathParts.length - 1];
      for (let i = 0; i < sizes.length; i++) {
        result.push(
          path.join(
            self.optionsToString(options),
            `${filePath}_${i}.${fileExt}`,
          ),
        );
      }
      return result;
    },
    async middlewareHelper(_path) {
      const pathParts = _path.split('/');
      const options = self.stringToOptions(pathParts[1]);
      const rawFilePath = '/' + pathParts.slice(2).join('/');
      const underSplit = rawFilePath.split('_');
      const fileBasePath = underSplit.slice(0, underSplit.length - 1).join('_');
      const media = await cache.media.findOne((e) =>
        e.fullPath.startsWith(fileBasePath),
      );
      if (media) {
        let exists = true;
        try {
          exists = await mediaHandler.outputFs.exist(_path.split('/'), true);
        } catch (error) {
          exists = false;
        }
        if (!exists) {
          await imageWorkers.assign(async () => {
            await mediaHandler.startImageProcessor({
              media,
              imageProcessor: self,
              options,
            });
          });
        }
        const filePath = path.join(
          process.cwd(),
          ...mediaHandler.output,
          ..._path.split('/'),
        );
        return {
          exist: true,
          path: filePath,
          mimetype: filePath.endsWith('.webp') ? 'image/webp' : media.mimetype,
          fileName: media.name,
          fileSize: media.size,
        };
      } else {
        return {
          exist: false,
        };
      }
    },
  };

  return self;
}
