import { BCMSClient, BCMSClientPrototype } from '@becomes/cms-client';
import {
  BCMSMostCacheHandler,
  BCMSMostCacheHandlerPrototype,
  BCMSMostContentHandler,
  BCMSMostContentHandlerPrototype,
  BCMSMostFunctionHandler,
  BCMSMostFunctionHandlerPrototype,
  BCMSMostMediaHandler,
  BCMSMostMediaHandlerPrototype,
} from './handlers';
import { BCMSMostConfig } from './types';

export interface BCMSMostPrototype {
  updateConfig(config: BCMSMostConfig): void;
  client: BCMSClientPrototype;
  cache: BCMSMostCacheHandlerPrototype;
  content: BCMSMostContentHandlerPrototype;
  media: BCMSMostMediaHandlerPrototype;
  function: BCMSMostFunctionHandlerPrototype;
}

const MAX_PPC = 16;

export function BCMSMost(
  config?: BCMSMostConfig,
  client?: BCMSClientPrototype,
) {
  if (!config) {
    config = require(`${process.cwd()}/bcms.config.js`);
  }
  if (!client) {
    client = BCMSClient({
      cmsOrigin: config.cms.origin,
      key: config.cms.key,
    });
  }
  const cache = BCMSMostCacheHandler();
  const content = BCMSMostContentHandler(config, client, cache);
  const media = BCMSMostMediaHandler(config, client, cache, MAX_PPC);
  const fn = BCMSMostFunctionHandler(config, client, cache);
  const self: BCMSMostPrototype = {
    updateConfig(conf) {
      config = conf;
    },
    client,
    cache,
    content,
    media,
    function: fn,
  };
  return self;
}
