import type { BCMSClient } from '@becomes/cms-client/types';
import { createBcmsMostDefaultOnMessage } from '../on-message';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostFunctionHandler,
} from '../types';
import { createBcmsMostConsole } from '../util';

export function createBcmsMostFunctionHandler({
  cache,
  client,
  config,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
  config: BCMSMostConfig;
}): BCMSMostFunctionHandler {
  const cnsl = createBcmsMostConsole('Function handler');

  return {
    async call(data) {
      const onMessage =
        data && data.onMessage
          ? data.onMessage
          : createBcmsMostDefaultOnMessage();
      if (data && data.name) {
        onMessage('info', cnsl.info('call', `Calling ${data.name} ...`));
        const res = await client.function.call(data.name, data.payload);
        cache.function.set(data.name, res.result);
        onMessage('info', cnsl.info('call', `${data.name} Done.`));
      } else if (config.functions && config.functions.call) {
        for (let i = 0; i < config.functions.call.length; i++) {
          const fnToCall = await config.functions.call[i]();
          onMessage('info', cnsl.info('call', `Calling ${fnToCall.name} ...`));
          const res = await client.function.call(
            fnToCall.name,
            fnToCall.payload,
          );
          if (!res.success) {
            onMessage('error', cnsl.error('call', res.result));
          } else {
            await cache.function.set(fnToCall.name, res.result);
            onMessage(
              'info',
              cnsl.info('call', `${fnToCall.name.replace(/-/g, '_')} Done.`),
            );
          }
        }
      }
    },
  };
}
