import * as path from 'path';
import { BCMSClient, BCMSClientPrototype } from '@becomes/cms-client';
import { BCMSMost, BCMSMostConfig } from './types';
import {
  createBodyParserMiddleware,
  createCorsMiddleware,
  createPurpleCheetah,
  createRequestLoggerMiddleware,
  useFS,
} from '@becomes/purple-cheetah';
import { createBcmsMostMediaMiddleware } from './server';
import {
  createBcmsMostCacheHandler,
  createBcmsMostContentHandler,
  createBcmsMostFunctionHandler,
  createBcmsMostImageHandler,
  createBcmsMostMediaHandler,
} from '.';
import { createBcmsMostPipe } from './pipe';
import { initBcmsMostConfig } from './config';

export const MAX_PPC = 16;

export async function createBcmsMost(data?: {
  serverPort?: number;
  disableServer?: boolean;
  /**
   * If not provided, `bcms.config.js` file must be available
   * at the root of the project (**{cwd}/bcms.config.js**).
   */
  config?: BCMSMostConfig;
  /**
   * If not provided, client will be created using data from
   * the configuration.
   */
  client?: BCMSClientPrototype;
}): Promise<BCMSMost> {
  const disableServer = data && data.disableServer ? true : false;
  const config = data && data.config ? data.config : await initBcmsMostConfig();
  const client: BCMSClientPrototype =
    data && data.client
      ? data.client
      : BCMSClient({
          cmsOrigin: config.cms.origin,
          key: config.cms.key,
        });
  const fs = useFS({
    base: path.join(process.cwd(), 'bcms'),
  });

  const image = createBcmsMostImageHandler({ config });
  const cache = createBcmsMostCacheHandler({ fs });
  const content = createBcmsMostContentHandler({
    cache,
    config,
    client,
  });
  const media = createBcmsMostMediaHandler({
    fs,
    config,
    client,
    cache,
    MAX_PPC,
  });
  const fn = createBcmsMostFunctionHandler({
    cache,
    client,
    config,
  });
  const pipe = createBcmsMostPipe({
    fs,
    cache,
    client,
    config,
    content,
    image,
    media,
  });
  if (disableServer) {
    return {
      cache,
      client,
      content,
      media,
      function: fn,
      close() {
        /** Do nothing */
      },
      image,
      pipe,
    };
  } else {
    return await new Promise<BCMSMost>((resolve, reject) => {
      try {
        createPurpleCheetah({
          port: data && data.serverPort ? data.serverPort : 3001,
          logPath: path.join(process.cwd(), 'bcms', 'logs'),
          middleware: [
            createBodyParserMiddleware(),
            createCorsMiddleware(),
            createRequestLoggerMiddleware(),
            createBcmsMostMediaMiddleware({ config, fs, image }),
          ],
          onReady(pc) {
            resolve({
              cache,
              client,
              content,
              media,
              function: fn,
              close() {
                pc.getServer().close();
              },
              image,
              pipe,
            });
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
