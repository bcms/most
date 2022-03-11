import type { BCMSClient } from '@becomes/cms-client/types';
import type {
  BCMSMostCacheHandler,
  BCMSMostContentHandler,
  BCMSMostFunctionHandler,
  BCMSMostMediaHandler,
  BCMSMostImageProcessorHandler,
  BCMSMostHttpHandler,
  BCMSMostTypeConverterHandler,
  BCMSMostServerHandler,
  BCMSMostTemplateHandler,
} from './handlers';

export interface BCMSMost {
  client: BCMSClient;
  cache: BCMSMostCacheHandler;
  content: BCMSMostContentHandler;
  function: BCMSMostFunctionHandler;
  media: BCMSMostMediaHandler;
  imageProcessor: BCMSMostImageProcessorHandler;
  http: BCMSMostHttpHandler;
  typeConverter: BCMSMostTypeConverterHandler;
  server: BCMSMostServerHandler;
  template: BCMSMostTemplateHandler;
  socketConnect(): Promise<void>;
}
