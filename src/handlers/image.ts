import * as os from 'os';
import * as path from 'path';
import * as cors from 'cors';
import * as express from 'express';
import { BCMSMostConfig } from '../types';
import { Console, FS, General, PPLB } from '../util';
import { MAX_PPC } from '../most';

export interface BCMSMostImageHandlerPrototype {
  startServer(port?: number): express.Application;
  resolver(data: {
    options: string;
    path: string;
    originalPath: string;
    method: string;
  }): Promise<BCMSMostImageResolverResponse>;
  startWatch(): void;
  server(): express.Application;
}
export interface BCMSMostImageResolverResponse {
  status: number;
  filePath?: string;
  message?: string;
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
  callback(): Promise<void>;
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
  let app: express.Application;
  let watch: NodeJS.Timeout;
  let processing = false;

  if (!config.media) {
    config.media = {
      output: 'static/media',
      sizeMap: [
        {
          width: 350,
        },
        {
          width: 600,
        },
        {
          width: 900,
        },
        {
          width: 1200,
        },
        {
          width: 1400,
        },
        {
          width: 1920,
        },
      ],
    };
  } else if (!config.media.ppc) {
    config.media.ppc = os.cpus().length;
  }
  if (config.media.ppc > MAX_PPC) {
    config.media.ppc = MAX_PPC;
  }

  const self: BCMSMostImageHandlerPrototype = {
    server() {
      return app;
    },
    startServer(port) {
      self.startWatch();
      if (!port) {
        port = 8001;
      }
      app = express();
      app.use(cors());
      app.use('/media/:options', async (req, res) => {
        console.log(req.originalUrl);
        const output = await self.resolver({
          method: req.method,
          options: req.params.options,
          originalPath: req.originalUrl,
          path: req.path,
        });
        if (output) {
          if (output.filePath) {
            res.sendFile(output.filePath);
          } else {
            res.status(output.status);
            res.send(output.message);
          }
        } else {
          res.status(500);
          res.send('No output');
          res.end();
        }
      });
      app.listen(port, () => cnsl.info('', `Server started on port ${port}`));
      return app;
    },
    async resolver(data) {
      return await new Promise<BCMSMostImageResolverResponse>((resolve) => {
        const pathToFile = ['..', config.media.output, data.options, data.path]
          .join('/')
          .replace(/\/\//g, '/');
        if (
          data.method === 'GET' ||
          processedRequests.find((e) => e === pathToFile)
        ) {
          resolve({
            status: 200,
            filePath: path.join(process.cwd(), pathToFile.slice(1)),
          });
          return;
        }
        FS.exist(pathToFile.split('/')).then((fileExist) => {
          if (fileExist) {
            if (data.method === 'POST') {
              resolve({
                status: 200,
                message: 'Success.',
              });
              return;
            }
            resolve({
              status: 200,
              filePath: path.join(process.cwd(), pathToFile.slice(1)),
            });
            return;
          } else {
            const srcParts = data.path.split('.');
            const firstPart = srcParts.slice(0, srcParts.length - 1).join('.');
            const firstPartSplit = firstPart.split('-');
            const lastPart = srcParts[srcParts.length - 1];
            const sizeIndex = parseInt(
              firstPartSplit[firstPartSplit.length - 1],
            );
            if (isNaN(sizeIndex)) {
              cnsl.error(
                data.path,
                `Size index in NaN for "${data.originalPath}".`,
              );
              resolve({
                status: 400,
                message: 'Not allowed, size of NaN.',
              });
              return;
            }
            const srcPathToFile =
              `../${config.media.output}` +
              firstPartSplit.slice(0, firstPartSplit.length - 1).join('-') +
              '.' +
              lastPart;
            const options = BCMSMostImageHandlerParseOptions(
              data.options,
              sizeIndex,
            );
            const injectablePath = pathToFile.replace(
              `-${sizeIndex}.`,
              `-@sizeIndex.`,
            );
            const done: number[] = [];
            if (options.sizes) {
              options.sizes.forEach((size, i) => {
                const ops: BCMSMostImageHandlerOptions = JSON.parse(
                  JSON.stringify(options),
                );
                ops.sizeIndex = i;
                console.log('Options', ops);
                requestBuffer.push({
                  outputPath: injectablePath.replace('@sizeIndex', '' + i),
                  inputPath: srcPathToFile,
                  options: ops,
                  optionsRaw: data.options,
                  async callback() {
                    {
                      done.push(1);
                      if (done.length === options.sizes.length) {
                        resolve({
                          status: 200,
                          filePath: path.join(
                            process.cwd(),
                            'bcms',
                            pathToFile,
                          ),
                        });
                        return;
                      }
                    }
                  },
                });
              });
            } else {
              autoSizes.forEach((size, i) => {
                // if (i !== sizeIndex) {
                const ops: BCMSMostImageHandlerOptions = JSON.parse(
                  JSON.stringify(options),
                );
                ops.sizeIndex = i;
                requestBuffer.push({
                  outputPath: injectablePath.replace('@sizeIndex', '' + i),
                  inputPath: srcPathToFile,
                  options: ops,
                  optionsRaw: data.options,
                  async callback() {
                    {
                      done.push(1);
                      if (done.length === autoSizes.length) {
                        resolve({
                          status: 200,
                          filePath: path.join(
                            process.cwd(),
                            'bcms',
                            pathToFile,
                          ),
                        });
                      }
                    }
                  },
                });
                // }
              });
            }
          }
        });
      });
    },
    startWatch() {
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
                  cnsl.info(chunkId, `Done: ${data.outputPath}\n\n${output}`);
                }
                data.callback().catch((e) => {
                  cnsl.error(`callback: ${data.outputPath}`, e);
                });
                processedRequests.push(data.outputPath);
              },
            );
          }
          processing = false;
        }
      }, 1000);
    },
  };
  return self;
}
