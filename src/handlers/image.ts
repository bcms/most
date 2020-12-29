import * as fse from 'fs-extra';
import * as path from 'path';
import * as cors from 'cors';
import * as express from 'express';
import { BCMSMostConfig } from '../types';
import { Console, FS, General, PPLB } from '../util';

export interface BCMSMostImageHandlerPrototype {
  startServer(port?: number): express.Application;
}
export interface BCMSMostImageHandlerOptions {
  sizeIndex: number;
  step?: number;
  position?: string;
  quality?: number;
  sizes?: Array<{
    width: number;
    height?: number;
  }>;
}
export interface BCMSMostRequestItem {
  outputPath: string;
  inputPath: string;
  callback(): void;
  optionsRaw: string;
  options: BCMSMostImageHandlerOptions;
}

export function BCMSMostImageHandlerParseOptions(
  optionsRaw: string,
  sizeIndex: number,
): BCMSMostImageHandlerOptions {
  const options: BCMSMostImageHandlerOptions = {
    sizeIndex,
  };
  if (optionsRaw === 'auto') {
    return options;
  }
  options.step = parseInt(
    General.string.getTextBetween(optionsRaw, '_st', '_ps'),
  );
  if (isNaN(options.step)) {
    options.step = undefined;
  }
  options.position = General.string.getTextBetween(optionsRaw, '_ps', '_ql');
  options.quality = parseInt(
    General.string.getTextBetween(optionsRaw, '_ql', '_sz'),
  );
  if (isNaN(options.quality)) {
    options.quality = undefined;
  }
  const sizesRaw = General.string.getTextBetween(optionsRaw, '_sz');
  if (sizesRaw !== 'a') {
    options.sizes = [];
    sizesRaw.split('-').forEach((sizeRaw) => {
      const w = parseInt(General.string.getTextBetween(sizeRaw, 'w', 'h'));
      if (!isNaN(w)) {
        const h = parseInt(General.string.getTextBetween(sizeRaw, 'h'));
        if (!isNaN(h)) {
          options.sizes.push({
            width: w,
            height: h,
          });
        } else {
          options.sizes.push({
            width: w,
          });
        }
      }
    });
  }
  return options;
}
export function BCMSMostImageHandler(config: BCMSMostConfig) {
  const autoSizes = [350, 600, 900, 1200, 1400, 1920];
  const cnsl = Console('BCMSMostImageHandler');
  const processedRequests: string[] = [];
  const requestBuffer: BCMSMostRequestItem[] = [];
  const responseBuffer: BCMSMostRequestItem[] = [];
  let app: express.Application;
  let processing = false;
  let watch: NodeJS.Timeout;

  function startWatch() {
    clearInterval(watch);
    watch = setInterval(async () => {
      if (!processing) {
        processing = true;
        const items: BCMSMostRequestItem[] = [];
        let loop = true;
        while (loop) {
          const item = requestBuffer.pop();
          if (!item) {
            loop = false;
          } else {
            if (!items.find((e) => e.outputPath === item.outputPath)) {
              items.push(item);
            }
          }
        }
        if (items.length > 0) {
          await PPLB.manage<BCMSMostRequestItem>(
            config.media.ppc,
            items,
            async (data, chunkId) => {
              cnsl.info(chunkId, `Processing: ${data.outputPath}`);
              let output = '';
              let error = '';
              try {
                await General.exec(
                  `bcms-most --media-processor --media-image ${Buffer.from(
                    JSON.stringify({
                      inputPath: data.inputPath,
                      outputPath: data.outputPath,
                      optionsRaw: data.optionsRaw,
                      options: data.options,
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
                cnsl.info(chunkId, `Done: ${data.outputPath}`);
                data.callback();
                // if (responseBuffer.length > 0) {
                //   let responseBufferIndex = 0;
                //   while (responseBufferIndex < responseBuffer.length) {
                //     if (
                //       responseBuffer[responseBufferIndex].outputPath ===
                //       data.outputPath
                //     ) {
                //       responseBuffer[responseBufferIndex].callback();
                //       responseBuffer.splice(responseBufferIndex, 1);
                //     } else {
                //       responseBufferIndex++;
                //     }
                //   }
                // }
              }
              processedRequests.push(data.outputPath);
            },
          );
        }
        processing = false;
      } else {
        if (requestBuffer.length === 0 && responseBuffer.length > 0) {
          while (responseBuffer.length > 0) {
            responseBuffer.pop().callback();
          }
        }
      }
      console.log('!!');
    }, 1000);
  }

  const self: BCMSMostImageHandlerPrototype = {
    startServer(port) {
      startWatch();
      if (!port) {
        port = 8001;
      }
      app = express();
      app.use(cors());
      app.use('/media/:options', async (req, res) => {
        const pathToFile = [
          '..',
          config.media.output,
          req.params.options,
          req.path,
        ]
          .join('/')
          .replace(/\/\//g, '/');
        if (req.method === 'GET') {
          res.sendFile(path.join(process.cwd(), pathToFile.slice(1)));
          return;
        }
        if (await FS.exist(pathToFile.split('/'))) {
          if (req.method === 'POST') {
            res.send('Success.');
            return;
          }
          res.sendFile(path.join(process.cwd(), pathToFile.slice(1)));
          return;
        } else {
          const srcParts = req.path.split('.');
          const firstPart = srcParts.slice(0, srcParts.length - 1).join('.');
          const firstPartSplit = firstPart.split('-');
          const lastPart = srcParts[srcParts.length - 1];
          const sizeIndex = parseInt(firstPartSplit[firstPartSplit.length - 1]);
          if (isNaN(sizeIndex)) {
            cnsl.error('', `Size index in NaN for "${req.originalUrl}".`);
            res.status(400);
            res.end();
            return;
          }
          const srcPathToFile =
            `../${config.media.output}` +
            firstPartSplit.slice(0, firstPartSplit.length - 1).join('-') +
            '.' +
            lastPart;
          const options = BCMSMostImageHandlerParseOptions(req.params.options, sizeIndex);
          const item: BCMSMostRequestItem = {
            outputPath: pathToFile,
            inputPath: srcPathToFile,
            options,
            optionsRaw: req.params.options,
            async callback() {
              if (req.method === 'POST') {
                res.send('Success.');
                return;
              }
              if (await FS.exist(pathToFile.split('/'))) {
                res.sendFile(path.join(process.cwd(), 'bcms', pathToFile));
              } else {
                res.status(404);
                res.end();
              }
            },
          };
          if (!options.sizes) {
            const injectablePath = pathToFile.replace(
              `-${sizeIndex}.`,
              `-@sizeIndex.`,
            );
            const ops: BCMSMostImageHandlerOptions = JSON.parse(
              JSON.stringify(options),
            );
            const done: number[] = [];
            autoSizes.forEach((size, i) => {
              if (i !== sizeIndex) {
                ops.sizeIndex = i;
                item.callback = () => {
                  {
                    done.push(1);
                    if (done.length === autoSizes.length) {
                      res.sendFile(
                        path.join(process.cwd(), 'bcms', pathToFile),
                      );
                    }
                  }
                };
                requestBuffer.push({
                  outputPath: injectablePath.replace('@sizeIndex', '' + i),
                  inputPath: srcPathToFile,
                  options: ops,
                  optionsRaw: req.params.options,
                  callback() {
                    done.push(1);
                    console.log(done);
                    if (done.length === autoSizes.length) {
                      res.send('Success.');
                    }
                  },
                });
              }
            });
          }
          if (
            req.path.endsWith('.webp') ||
            processedRequests.find((e) => e === item.outputPath)
          ) {
            responseBuffer.push(item);
          } else if (requestBuffer.find((e) => e.outputPath === pathToFile)) {
            responseBuffer.push(item);
          } else {
            requestBuffer.push(item);
          }
        }
        return;
      });
      app.listen(port, () => cnsl.info('', `Server started on port ${port}`));
      return app;
    },
  };
  return self;
}
