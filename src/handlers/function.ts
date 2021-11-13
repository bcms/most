import { BCMSClientPrototype } from '@becomes/cms-client';
import { useLogger } from '@becomes/purple-cheetah';
import {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostFunctionHandler,
} from '../types';

export function createBcmsMostFunctionHandler({
  config,
  client,
  cache,
}: {
  config: BCMSMostConfig;
  client: BCMSClientPrototype;
  cache: BCMSMostCacheHandler;
}): BCMSMostFunctionHandler {
  const cnsl = useLogger({ name: 'BCMSMostFunctionHandler' });
  return {
    async call() {
      cnsl.info('started', '');
      const startTime = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const functionCache = await cache.get.function<any>();
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
              functionCache[fnConfig.name.replace(/-/g, '_')] =
                await fnConfig.modify(result.result);
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
}
