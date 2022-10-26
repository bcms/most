import * as path from 'path';
import * as dotenv from 'dotenv';
import { createBcmsClient } from '@becomes/cms-client';
import type { BCMSClient } from '@becomes/cms-client/types';
import { BCMSMost, BCMSMostConfig, BCMSMostConfigSchema } from './types';
import { ObjectUtility } from '@banez/object-utility';
import { ObjectUtilityError } from '@banez/object-utility/types';
import {
  createBcmsMostCacheHandler,
  createBcmsMostContentHandler,
  createBcmsMostFunctionHandler,
  createBcmsMostImageProcessor,
  createBcmsMostMediaHandler,
  createBcmsMostHttpHandler,
  createBcmsMostTypeConverterHandler,
  createBcmsMostServerHandler,
  createBcmsMostTemplateHandler,
} from './handlers';
import { createFS } from '@banez/fs';
import { bcmsMostSocketInit } from './sockets';

dotenv.config();

/**
 * Create BCMS Most instance.
 */
export function createBcmsMost(data?: {
  config?: BCMSMostConfig;
  client?: BCMSClient;
}): BCMSMost {
  let config: BCMSMostConfig | undefined = undefined;
  let client: BCMSClient | undefined = undefined;

  if (!data || !data.config) {
    try {
      config = require(`${path.join(process.cwd(), 'bcms.config.js')}`);
    } catch (error) {
      config = require(`${path.join(process.cwd(), 'bcms.config.cjs')}`);
    }
  } else if (data && data.config) {
    config = data.config;
  }
  if (config) {
    if (!data || !data.client) {
      client = createBcmsClient({
        cmsOrigin: config.cms.origin,
        key: {
          id: config.cms.key.id,
          secret: config.cms.key.secret,
        },
        enableCache: config.enableClientCache,
        debug: config.debug,
        userAgent: config.client ? (config.client.userAgent as any) : undefined,
      });
    } else if (data && data.client) {
      client = data.client;
    }
  }

  if (!config) {
    throw Error('Missing configuration.');
  }
  if (!client) {
    throw Error('Missing BCMS client.');
  }
  /**
   * Check Config object.
   */
  {
    const configCheck = ObjectUtility.compareWithSchema(
      config,
      BCMSMostConfigSchema,
      'config',
    );
    if (configCheck instanceof ObjectUtilityError) {
      throw Error(configCheck.message);
    }
  }

  const rootFs = createFS({
    base: path.join(process.cwd(), 'bcms'),
  });

  const cache = createBcmsMostCacheHandler({
    rootFs,
    getMediaHandler() {
      return media;
    },
    config,
  });
  const content = createBcmsMostContentHandler({ cache, client, config });
  const fn = createBcmsMostFunctionHandler({ cache, client, config });
  const media = createBcmsMostMediaHandler({
    cache,
    config,
    client,
    getImageProcessor: () => {
      return imageProcessor;
    },
  });
  const imageProcessor = createBcmsMostImageProcessor({
    config,
    cache,
    mediaHandler: media,
  });
  const httpHandler = createBcmsMostHttpHandler({
    cache,
    config,
    imageProcessor,
    mediaHandler: media,
  });
  const typeConverter = createBcmsMostTypeConverterHandler({
    client,
    rootFs,
  });
  const templateHandler = createBcmsMostTemplateHandler({ cache, client });
  const serverHandler = createBcmsMostServerHandler({
    cache,
    imageProcessor,
    mediaHandler: media,
    config,
    getBcmsMost() {
      return self;
    },
    port: config.server && config.server.port ? config.server.port : 3001,
  });

  const self: BCMSMost = {
    client: client,
    cache,
    content,
    function: fn,
    media,
    imageProcessor,
    http: httpHandler,
    typeConverter,
    template: templateHandler,
    server: serverHandler,
    async socketConnect() {
      await bcmsMostSocketInit({
        cache,
        client: client as BCMSClient,
        mediaHandler: media,
        config: config as BCMSMostConfig,
        typeConverter,
      });
    },
  };

  return self;
}
