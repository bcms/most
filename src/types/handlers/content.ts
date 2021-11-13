/**
 * Return type from the `BCMSMostContentHandler()` function.
 * 
 * This object is used for interaction with the BCMS content API.
 */
 export interface BCMSMostContentHandler {
  /**
   * Pull all content from the BCMS. Cached version (if available) is
   * compared with indexes returned by the BCMS and only modified or
   * new data is requested. Using `BCMSMostCacheHandler`, local
   * cache is updated.
   */
  pull(): Promise<void>;
}