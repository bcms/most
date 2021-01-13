import { BCMSClientPrototype } from '@becomes/cms-client';
import { BCMSMostConfig } from '../types';
import { Console } from '../util';
import { BCMSMostCacheHandlerPrototype } from './cache';

export interface BCMSMostFunctionHandlerPrototype {
  call(name?: string): Promise<void>;
}

export function BCMSMostFunctionHandler(
  config: BCMSMostConfig,
  client: BCMSClientPrototype,
  cache: BCMSMostCacheHandlerPrototype,
) {
  const cnsl = Console('BCMSMostFunctionHandler');
  const self: BCMSMostFunctionHandlerPrototype = {
    async call() {
      cnsl.info('started', '');
      const startTime = Date.now();
      const functionCache = await cache.get.function();
      if (config.functions) {
        for (let i = 0; i < config.functions.length; i = i + 1) {
          const fnConfig = config.functions[i];
          const stage = `[ ${i + 1}/${config.functions.length} ] ${
            fnConfig.name
          }`;
          cnsl.info(stage, 'calling ...');
          const callFunctionTimeOffset = Date.now();
          const result = await client.function.call(
            fnConfig.name,
            fnConfig.payload,
          );
          if (result.success === false) {
            cnsl.error(stage, result.result);
          } else {
            if (fnConfig.modify) {
              functionCache[
                fnConfig.name.replace(/-/g, '_')
              ] = await fnConfig.modify(result.result);
            } else {
              functionCache[fnConfig.name.replace(/-/g, '_')] = result.result;
            }
            cnsl.info(
              stage,
              `Done in: ${(Date.now() - callFunctionTimeOffset) / 1000}s`,
            );
          }
        }
      }
      await cache.update.function(functionCache);
      cnsl.info('done', `${(Date.now() - startTime) / 1000}s`);
    },
  };
  return self;
}
