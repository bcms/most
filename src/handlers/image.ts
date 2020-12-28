import * as path from 'path';
import * as express from 'express';
import { BCMSMostConfig } from '../types';
import { Console, General, PPLB } from '../util';

export interface BCMSMostImageHandlerPrototype {
  startServer(port?: number): express.Application;
}
export interface BCMSMostImageHandlerOptions {
  step?: number;
  position?: 'fill';
  quality?: number;
  sizes?: Array<{
    width: number;
    height?: number;
  }>;
}
interface RequestItem {
  callback(): void;
  file: string;
  optionsRaw: string;
  options: BCMSMostImageHandlerOptions;
}

export function BCMSMostImageHandler(config: BCMSMostConfig) {
  const cnsl = Console('BCMSMostImageHandler');
  const requestBuffer: RequestItem[] = [];
  let app: express.Application;
  let processing = false;

  setInterval(async () => {
    if (!processing) {
      processing = true;
      const items: RequestItem[] = [];
      let loop = true;
      while (loop) {
        const item = requestBuffer.pop();
        if (!item) {
          loop = false;
        } else {
          items.push(item);
        }
      }
      if (items.length > 0) {
        await PPLB.manage<RequestItem>(
          config.media.ppc,
          items,
          async (data, chunkId) => {
            cnsl.info(chunkId, `Processing: ${data.file}`);
            let output = '';
            let error = '';
            try {
              await General.exec(
                `bcms-most --media-processor --media-pure ${Buffer.from(
                  JSON.stringify(data.file),
                ).toString('hex')} --media-pure-options ${
                  Buffer.from(data.optionsRaw).toString('hex') +
                  '-' +
                  Buffer.from(JSON.stringify(data.options)).toString('hex')
                } --media-config ${Buffer.from(
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
              cnsl.info(chunkId, `Done: ${data.file}`);
            }
          },
        );
      }
      processing = false;
    }
  }, 1000);

  const self: BCMSMostImageHandlerPrototype = {
    startServer(port) {
      if (!port) {
        port = 8001;
      }
      app = express();
      app.use('/media/:options', (req, res) => {
        cnsl.info('options', req.params.options);
        cnsl.info('', req.path);
        // res.sendFile(
        //   path.join(process.cwd(), config.media ? config.media.output : ''),
        //   req.query.p,
        // );
      });
      app.listen(port, () => cnsl.info('', `Server started on port ${port}`));
      return app;
    },
  };
  return self;
}
