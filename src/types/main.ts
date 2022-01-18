import type { BCMSClient } from '@becomes/cms-client/types';
import type {
  BCMSMostCacheHandler,
  BCMSMostContentHandler,
  BCMSMostFunctionHandler,
  BCMSMostMediaHandler,
} from './handlers';

export interface BCMSMost {
  client: BCMSClient;
  cache: BCMSMostCacheHandler;
  content: BCMSMostContentHandler;
  function: BCMSMostFunctionHandler;
  media: BCMSMostMediaHandler;
}
