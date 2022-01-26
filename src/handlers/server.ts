import * as path from 'path';
import { createWorkerManager } from '@banez/workers';
import {
  createBodyParserMiddleware,
  createController,
  createControllerMethod,
  createCorsMiddleware,
  createMiddleware,
  createPurpleCheetah,
} from '@becomes/purple-cheetah';
import type {
  ControllerMethodConfig,
  PurpleCheetah,
} from '@becomes/purple-cheetah/types';
import type { Request, Response } from 'express';
import type {
  BCMSMost,
  BCMSMostCacheHandler,
  BCMSMostImageProcessorHandler,
  BCMSMostMediaHandler,
  BCMSMostServerHandler,
  BCMSMostServerRoute,
  BCMSMostServerRoutes,
} from '../types';

export function createBcmsMostServerRoute<Result = unknown, Body = unknown>(
  config: BCMSMostServerRoute<Result, Body>,
): BCMSMostServerRoute<Result, Body> {
  return config;
}

export function createBcmsMostServerRoutes(
  config: BCMSMostServerRoutes,
): BCMSMostServerRoutes {
  return config;
}

export function createBcmsMostServerHandler({
  cache,
  mediaHandler,
  imageProcessor,
  port,
  getBcmsMost,
}: {
  cache: BCMSMostCacheHandler;
  mediaHandler: BCMSMostMediaHandler;
  imageProcessor: BCMSMostImageProcessorHandler;
  port: number;
  getBcmsMost(): BCMSMost;
}): BCMSMostServerHandler {
  let pc: PurpleCheetah;
  let bcms: BCMSMost;
  const imageWorkers = createWorkerManager({
    count: mediaHandler.ppc,
  });

  return {
    async start(routes) {
      bcms = getBcmsMost();

      await new Promise<void>((resolve, reject) => {
        try {
          pc = createPurpleCheetah({
            port,
            onReady() {
              resolve();
            },
            middleware: [
              createCorsMiddleware(),
              createBodyParserMiddleware({
                limit: 6000000,
              }),
              createMiddleware({
                path: `/api/bcms-images`,
                name: 'BCMS Most image processor middleware',
                handler() {
                  return async (req: Request, res: Response) => {
                    const pathParts = req.path.split('/');
                    const options = imageProcessor.stringToOptions(
                      pathParts[1],
                    );
                    const rawFilePath = '/' + pathParts.slice(2).join('/');
                    const underSplit = rawFilePath.split('_');
                    const fileBasePath = underSplit
                      .slice(0, underSplit.length - 1)
                      .join('_');
                    const media = await cache.media.findOne((e) =>
                      e.fullPath.startsWith(fileBasePath),
                    );
                    if (media) {
                      if (
                        !(await mediaHandler.outputFs.exist(
                          req.path.split('/'),
                          true,
                        ))
                      ) {
                        await imageWorkers.assign(async () => {
                          await mediaHandler.startImageProcessor({
                            media,
                            imageProcessor,
                            options,
                          });
                        });
                      }
                      const filePath = path.join(
                        process.cwd(),
                        ...mediaHandler.output,
                        ...req.path.split('/'),
                      );
                      res.json({
                        exist: true,
                        path: filePath,
                        mimetype: filePath.endsWith('.webp') ? 'image/webp' : media.mimetype,
                        fileName: media.name,
                        fileSize: media.size,
                      });
                    } else {
                      res.json({ exist: false });
                    }
                  };
                },
              }),
            ],
            controllers: [
              createController({
                name: 'BCMS Most server controller',
                path: '/api/bcms',
                methods() {
                  const output: {
                    [name: string]: ControllerMethodConfig<unknown, unknown>;
                  } = {};

                  for (const routeName in routes) {
                    const route = routes[routeName];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    output[routeName] = createControllerMethod<
                      unknown,
                      unknown
                    >({
                      path: routeName,
                      type: route.method,
                      async handler({ request }) {
                        return await route.handler({
                          url: request.originalUrl,
                          bcms,
                          body: request.body || {},
                          params: request.params || {},
                          query:
                            (request.query as { [name: string]: string }) || {},
                          headers: request.headers || {},
                        });
                      },
                    });
                  }

                  return output;
                },
              }),
            ],
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    async stop() {
      if (pc) {
        pc.getServer().close();
      }
    },
  };
}
