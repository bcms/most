import { Media } from "../media";

/**
 * Object created by the `BCMSMostMediaHandler()` function.
 *
 * This object is used for interaction with the BCMS media API.
 */
 export interface BCMSMostMediaHandler {
  /**
   * Method which will compare cached media data (if exist)
   * with indexes returned from the BCMS and only modified
   * new data is requested. Using `BCMSMostCacheHandler`, local
   * cache is updated.
   */
  pull(): Promise<void>;

  /**
   * This method will process specified media. Information
   * from the configuration object will be used to generate
   * the output. By default, for each processable image in media
   * array, different image sizes will be generated for it.
   */
  process(media?: Media[]): Promise<void>;
}