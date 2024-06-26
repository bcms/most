import type { BCMSClient, BCMSTemplate } from '@becomes/cms-client/types';
import { createBcmsMostDefaultOnMessage } from '@becomes/cms-most/on-message';
import type {
  BCMSMostCacheHandler,
  BCMSMostTemplateHandler,
} from '@becomes/cms-most/types';
import { createBcmsMostConsole } from '@becomes/cms-most/util';

export function createBcmsMostTemplateHandler({
  cache,
  client,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
}): BCMSMostTemplateHandler {
  const cnsl = createBcmsMostConsole('Template handler');

  return {
    async pull() {
      const startTime = Date.now();
      const onMessage = createBcmsMostDefaultOnMessage();

      onMessage('info', cnsl.info('pull', 'Started ...'));
      const templates = await client.template.getAll();
      onMessage(
        'info',
        cnsl.info(
          'pull',
          `Done in ${((Date.now() - startTime) / 1000).toFixed(
            2,
          )}s\n${templates.map((e) => '- ' + e.label).join('\n')}`,
        ),
      );
      await cache.template.set(templates);
    },
    async find(query) {
      const cacheContent = await cache.template.get();
      const output: BCMSTemplate[] = [];
      for (let i = 0; i < cacheContent.length; i++) {
        const item = cacheContent[i];
        if (await query(item, cacheContent)) {
          output.push(item);
        }
      }
      return output;
    },
    async findOne(query) {
      const cacheContent = await cache.template.get();
      for (let i = 0; i < cacheContent.length; i++) {
        const item = cacheContent[i];
        if (await query(item, cacheContent)) {
          return item;
        }
      }
      return null;
    },
  };
}
