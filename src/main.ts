import * as path from 'path';
import { createBcmsClient } from '@becomes/cms-client';
import type { BCMSClient } from '@becomes/cms-client/types';
import { BCMSMost, BCMSMostConfig, BCMSMostConfigSchema } from './types';
import { ObjectUtility } from '@banez/object-utility';
import { ObjectUtilityError } from '@banez/object-utility/types';
import {
  createBcmsMostCacheHandler,
  createBcmsMostContentHandler,
  createBcmsMostFunctionHandler,
  createBcmsMostMediaHandler,
} from './handlers';
import { createFS } from '@banez/fs';

export function createBcmsMost({
  config,
  client,
}: {
  config?: BCMSMostConfig;
  client?: BCMSClient;
}): BCMSMost {
  if (!config) {
    config = require(`${path.join(process.cwd(), 'bcms.config.js')}`);
  }
  if (!config) {
    throw Error('Missing configuration.');
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

  if (!client) {
    client = createBcmsClient({
      cmsOrigin: config.cms.origin,
      key: {
        id: config.cms.key.id,
        secret: config.cms.key.secret,
      },
    });
  }

  const rootFs = createFS({
    base: path.join(process.cwd(), 'bcms'),
  });

  const cache = createBcmsMostCacheHandler({
    rootFs,
  });
  const content = createBcmsMostContentHandler({ cache, client, config });
  const fn = createBcmsMostFunctionHandler({ cache, client, config });
  const media = createBcmsMostMediaHandler({ cache, config, client });

  return {
    client: client,
    cache,
    content,
    function: fn,
    media,
  };
}
