import * as nodePath from 'path';
import {
  createQueue,
  Proc,
  useLogger,
  useStringUtility,
} from '@becomes/purple-cheetah';
import { FS, HTTPStatus } from '@becomes/purple-cheetah/types';
import {
  BCMSMostConfig,
  BCMSMostConfigMedia,
  BCMSMostImageHandler,
  BCMSMostImageOptions,
  BCMSMostImageOptionsSize,
  BCMSMostImageResolverResponse,
} from '../types';

export function createBcmsMostImageHandler({
  config,
  fs,
}: {
  config: BCMSMostConfig;
  fs: FS;
}): BCMSMostImageHandler {
  const autoSizes = [350, 600, 900, 1200, 1400, 1920];
  const stringUtil = useStringUtility();
  const logger = useLogger({ name: 'BCMSMostImageHandler' });
  const queue = createQueue({ name: 'Image process' });

  const self: BCMSMostImageHandler = {
    parseOptions(optionsRaw, sizeIndex) {
      const options: BCMSMostImageOptions = {
        sizeIndex,
      };
      if (optionsRaw === 'auto') {
        return options;
      }
      options.step = parseInt(stringUtil.textBetween(optionsRaw, '_st', '_ps'));
      if (isNaN(options.step)) {
        options.step = undefined;
      }
      options.position = stringUtil.textBetween(optionsRaw, '_ps', '_ql');
      options.quality = parseInt(
        stringUtil.textBetween(optionsRaw, '_ql', '_sz'),
      );
      if (isNaN(options.quality)) {
        options.quality = undefined;
      }
      const sizesRaw = stringUtil.textBetween(optionsRaw + '__&', '_sz', '__&');
      if (sizesRaw !== 'a') {
        options.sizes = [];
        sizesRaw.split('-').forEach((sizeRaw) => {
          const w = parseInt(stringUtil.textBetween(sizeRaw, 'w', 'h'));
          if (!isNaN(w)) {
            const h = parseInt(
              stringUtil.textBetween(sizeRaw + '__&', 'h', '__&'),
            );
            if (!isNaN(h)) {
              (options.sizes as BCMSMostImageOptionsSize[]).push({
                width: w,
                height: h,
              });
            } else {
              (options.sizes as BCMSMostImageOptionsSize[]).push({
                width: w,
              });
            }
          }
        });
      }
      return options;
    },
    async resolver({ rawOptions, pathToFile, path, rootExt }) {
      const mediaConfig = config.media as BCMSMostConfigMedia;
      const srcParts = path.split('.');
      const firstPart = srcParts.slice(0, srcParts.length - 1).join('.');
      const firstPartSplit = firstPart.split('-');
      const lastPart = srcParts[srcParts.length - 1];
      const sizeIndex = parseInt(firstPartSplit[firstPartSplit.length - 1]);
      if (isNaN(sizeIndex)) {
        return {
          status: HTTPStatus.BAD_REQUEST,
          message: 'Not allowed, size of NaN.',
        };
      }
      const srcPathToFile = nodePath.join(
        process.cwd(),
        `${mediaConfig.output}`,
        firstPartSplit.slice(0, firstPartSplit.length - 1).join('-') +
          '.' +
          (rootExt ? rootExt : lastPart),
      );

      const options = self.parseOptions(rawOptions, sizeIndex);
      const injectablePath = pathToFile.replace(
        `-${sizeIndex}.`,
        `-@sizeIndex.`,
      );
      if (!options.sizes) {
        options.sizes = autoSizes.map((e) => {
          return {
            width: e,
          };
        });
      }
      for (let i = 0; i < options.sizes.length; i++) {
        const ops: BCMSMostImageOptions = JSON.parse(JSON.stringify(options));
        ops.sizeIndex = i;
        const outputPath = injectablePath.replace('@sizeIndex', '' + i);
        logger.info('', `Processing: ${outputPath}`);
        let output = '';
        let error = '';
        try {
          await Proc.exec(
            `bcms-most --media-processor --media-image ${Buffer.from(
              JSON.stringify({
                inputPath: srcPathToFile,
                outputPath,
                optionsRaw: rawOptions,
                options: ops,
              }),
            ).toString('hex')}`,
            (type, chunk) => {
              if (type === 'stderr') {
                error += chunk;
              } else {
                output += chunk;
              }
            },
          );
          if (error) {
            // eslint-disable-next-line no-console
            console.error('proc err:', error);
          }
        } catch (err) {
          return {
            status: HTTPStatus.INTERNAL_SERVER_ERROR,
            message: {
              proc: {
                output,
                error,
              },
              err,
            },
          };
        }
      }
      return {
        status: 200,
        filePath: pathToFile,
      };
    },
    async handlerRequest({ encodedFile }) {
      const encodedFileParts = encodedFile.split('.');
      if (encodedFileParts.length !== 2) {
        return {
          status: 400,
          message: 'Bad encoding length.',
        };
      }
      const desiredExtension = encodedFile[1];
      let fileInfo = '';
      try {
        fileInfo = Buffer.from(encodedFileParts[0], 'hex').toString();
      } catch (error) {
        return {
          status: 400,
          message: 'Bad encoding.',
        };
      }
      let realExtension = '';
      /** Get real extension */
      {
        const filePathParts = fileInfo.split('.');
        realExtension = filePathParts[filePathParts.length - 1];
        fileInfo = `${filePathParts.slice(
          0,
          filePathParts.length - 1,
        )}.${desiredExtension}`;
      }
      const pathParams = fileInfo.split('/');
      if (pathParams.length < 2) {
        return {
          status: 400,
          message:
            'Path params size must be not be lest then 2. Example: auto/test.jpg',
        };
      }
      const mediaConfig = config.media as BCMSMostConfigMedia;
      const reqOptions = pathParams[0]
        .replace(/\/\//g, '/')
        .replace(/\.\./g, '');
      const reqPath = pathParams
        .slice(1)
        .join('/')
        .replace(/\/\//g, '/')
        .replace(/\.\./g, '');
      const pathToFile = nodePath.join(
        process.cwd(),
        mediaConfig.output,
        reqOptions,
        reqPath,
      );
      if (await fs.exist(pathToFile, true)) {
        return {
          status: 200,
          filePath: pathToFile,
        };
      }
      let rez: BCMSMostImageResolverResponse = {
        status: 200,
        filePath: pathToFile,
      };
      await queue({
        name: pathToFile,
        async handler() {
          rez = await self.resolver({
            rootExt: realExtension,
            path: reqPath,
            pathToFile,
            rawOptions: reqOptions,
          });
        },
      }).wait;
      return rez;
    },
  };
  return self;
}
