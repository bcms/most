import * as path from 'path';
import {
  createHTTPError,
  createMiddleware,
  createQueue,
} from '@becomes/purple-cheetah';
import { FS, HTTPStatus, Middleware } from '@becomes/purple-cheetah/types';
import { Request, Response } from 'express';
import { BCMSMostConfig, BCMSMostConfigMedia } from '../../types';
import { BCMSMostImageHandler } from '../../types/handlers/image';

export function createBcmsMostMediaMiddleware({
  config,
  fs,
  image,
}: {
  config: BCMSMostConfig;
  fs: FS;
  image: BCMSMostImageHandler;
}): Middleware {
  const mediaConfig = config.media as BCMSMostConfigMedia;
  const queue = createQueue({ name: 'Image process' });
  return createMiddleware({
    name: 'BCMS Most Media Middleware',
    path: '/media/:options',
    handler({ logger, name }) {
      const errorHandler = createHTTPError({ logger, place: name });
      return async (req: Request, res: Response) => {
        if (req.method !== 'GET') {
          throw errorHandler.occurred(405, 'Method not allowed');
        }
        if (!req.query.rext) {
          throw errorHandler.occurred(
            HTTPStatus.BAD_REQUEST,
            'Missing query "rext"',
          );
        }
        const pathToFile = path.join(
          process.cwd(),
          mediaConfig.output,
          req.params.options.replace(/\/\//g, '/').replace(/\.\./g, ''),
          req.path.replace(/\/\//g, '/').replace(/\.\./g, ''),
        );
        if (await fs.exist(pathToFile, true)) {
          res.sendFile(pathToFile);
          return;
        }
        await queue({
          name: pathToFile,
          async handler() {
            const result = await image.resolver({
              rootExt: req.query.rext as string,
              path: req.path,
              pathToFile,
              rawOptions: req.params.options,
            });
            if (result.status !== 200) {
              throw errorHandler.occurred(result.status, result.message);
            }
          },
        }).wait;
        res.status(200).sendFile(pathToFile);
      };
    },
  });
}
