import type { BCMSClient } from '@becomes/cms-client/types';
import { createBcmsMostDefaultOnMessage } from '../on-message';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostContentHandler,
} from '../types';
import { createBcmsMostConsole } from '../util';

export function createBcmsMostContentHandler({
  cache,
  client,
  config,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
  config: BCMSMostConfig;
}): BCMSMostContentHandler {
  const cnsl = createBcmsMostConsole('Content handler');
  return {
    async pull(data) {
      const startTime = Date.now();
      const onMessage =
        data && data.onMessage
          ? data.onMessage
          : createBcmsMostDefaultOnMessage();
      onMessage('info', cnsl.info('pull', 'Started...'));

      const templateNameMap: {
        [name: string]: string;
      } = {};
      const keyAccess = await client.getKeyAccess();
      for (let i = 0; i < keyAccess.templates.length; i++) {
        const tempAccess = keyAccess.templates[i];
        if (tempAccess.get) {
          const template = await client.template.get({
            templateId: tempAccess._id,
          });
          templateNameMap[template.name] = template._id;
        }
      }
      if (config.entries) {
        if (config.entries.includeFromTemplates) {
          const templateNames = Object.keys(templateNameMap);
          for (const templateName in templateNames) {
            const templateId = templateNames[templateName];
            if (!config.entries.includeFromTemplates.includes(templateId)) {
              delete templateNames[templateName];
            }
          }
        }
        if (config.entries.excludeFromTemplates) {
          const templateNames = Object.keys(templateNameMap);
          for (const templateName in templateNames) {
            const templateId = templateNames[templateName];
            if (config.entries.excludeFromTemplates.includes(templateId)) {
              delete templateNames[templateName];
            }
          }
        }
      }
      for (const templateName in templateNameMap) {
        const timeOffset = Date.now();
        const templateId = templateNameMap[templateName];
        onMessage('info', cnsl.info(templateName, 'getting entries ...'));
        const entries = await client.entry.getAll({
          templateId,
        });
        await cache.content.set({ groupName: templateName, items: entries });
        onMessage(
          'info',
          cnsl.info(
            `${templateName}`,
            `Done in: ${(Date.now() - timeOffset) / 1000}s`,
          ),
        );
      }
      onMessage(
        'info',
        cnsl.info('pull', `Done in: ${(Date.now() - startTime) / 1000}s`),
      );
    },
  };
}
