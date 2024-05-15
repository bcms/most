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
} from '@becomes/cms-most/types/handlers';

export interface BCMSMost {
  /**
   * BCMS Client object. For more information about
   * the BCMS client visit [the repo](https://github.com/becomesco/cms-client)
   */
  client: BCMSClient;
  /**
   * Local cache handler.
   */
  cache: BCMSMostCacheHandler;
  /**
   * Content handler.
   */
  content: BCMSMostContentHandler;
  /**
   * Function handler.
   */
  function: BCMSMostFunctionHandler;
  /**
   * Media handler.
   */
  media: BCMSMostMediaHandler;
  /**
   * Image processor.
   */
  imageProcessor: BCMSMostImageProcessorHandler;
  /**
   * @ignore
   */
  http: BCMSMostHttpHandler;
  /**
   * Type converter.
   */
  typeConverter: BCMSMostTypeConverterHandler;
  /**
   * Local backend server. Default port 3001
   */
  server: BCMSMostServerHandler;
  /**
   * Template handler.
   */
  template: BCMSMostTemplateHandler;
  /**
   * Connect to BCMS socket server. This function will
   * also add listeners and state update handlers.
   */
  socketConnect(): Promise<void>;
}
