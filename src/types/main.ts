import { BCMSClientPrototype } from '@becomes/cms-client';
import { BCMSMostPipe } from './pipe';
import {
  BCMSMostCacheHandler,
  BCMSMostContentHandler,
  BCMSMostFunctionHandler,
  BCMSMostImageHandler,
  BCMSMostMediaHandler,
} from './handlers';

/**
 * Output type from the `BCMSMost` function.
 */
export interface BCMSMost {
  /**
   * Local client object created from the `@becomes/cms-client`
   */
  client: BCMSClientPrototype;
  /**
   * Cache handler object.
   */
  cache: BCMSMostCacheHandler;
  /**
   * Content handler object.
   */
  content: BCMSMostContentHandler;
  /**
   * Media handler object
   */
  media: BCMSMostMediaHandler;
  /**
   * Image handler object.
   */
  image: BCMSMostImageHandler;
  /**
   * Function handler object
   */
  function: BCMSMostFunctionHandler;
  /**
   * Pipe handler object.
   */
  pipe: BCMSMostPipe;
  close: () => void;
}
