import { Media } from '@becomes/cms-client';
import {
  BCMSMostCacheContent,
  BCMSMostCacheContentItemSchema,
  BCMSMostFunctionCache,
} from '../types';
import { FS, General } from '../util';

/**
 * Output type of the `BCMSMostCacheHandler()` function.
 *
 * Caches are used to provide faster access and easier
 * manipulation over BCMS API output. In addition to this,
 * caches are lowering a load on the BCMS API by providing
 * a local copy of the data stored in the BCMS. Caches are
 * stored in the filesystem under `root/bcms/*` as a JSON
 * files. Event thou they can be modified manually, it is
 * not recommended because changes can be over written by
 * the handler. Caches are split into 4 parts:
 *
 * - `content.cache.json` - file storing cached data of the
 * BCMS content API,
 * - `media.cache.json` - file storing cached data of the
 * BCMS media API (only media indexes and metadata are stored),
 * - `function.cache.json` - file storing cached responses from
 * the function calls.
 * - `process-media.cache.json` - file storing metadata of media
 * files waiting for processing.
 *
 * `BCMSMostCacheHandler` provides easy access to this files
 * and manipulation of them.
 */
export interface BCMSMostCacheHandlerPrototype {
  /**
   * Object storing methods for accessing caches.
   */
  get: {
    /**
     * This method will return cached content data. Content data is
     * located in the `root/bcms/content.cache.json`. Once
     * handler is initialized, data is stored in memory
     * and this method will return that a copy, not data from
     * the file itself.
     */
    content<T extends BCMSMostCacheContent>(): Promise<T>;
    /**
     * This method will return cached media data. Media data is
     * located in the `root/bcms/media.cache.json`. Once
     * handler is initialized, data is stored in memory
     * and this method will return a copy, not data from
     * the file itself.
     */
    media(): Promise<Media[]>;
    /**
     * This method will return cached media data
     * waiting for processing. Media data is
     * located in the `root/bcms/process-media.cache.json`. Once
     * handler is initialized, data is stored in memory
     * and this method will return a copy, not data from
     * the file itself.
     */
    processMedia(): Promise<Media[]>;
    /**
     * This method will return cached function responses
     * data. Function responses data is
     * located in the `root/bcms/function.cache.json`. Once
     * handler is initialized, data is stored in memory
     * and this method will return a copy, not data from
     * the file itself.
     */
    function<T>(): Promise<T>;
  };
  /**
   * Object storing methods for updating caches.
   */
  update: {
    /**
     * This method will update `root/bcms/content.cache.json`
     * and in-memory copy of the data with provided cache object.
     * Use this method with care because invalid cache object can
     * break this handler or some other handler which is using
     * cache and expects cache to be structured in a specific way.
     */
    content<T extends BCMSMostCacheContent>(cache: T): Promise<void>;
    /**
     * This method will update `root/bcms/media.cache.json`
     * and in-memory copy of the data with provided cache object.
     * Use this method with care because invalid cache object can
     * break this handler or some other handler which is using
     * cache and expects cache to be structured in a specific way.
     */
    media(media: Media[]): Promise<void>;
    /**
     * This method will update `root/bcms/process-media.cache.json`
     * and in-memory copy of the data with provided cache object.
     * Use this method with care because invalid cache object can
     * break this handler or some other handler which is using
     * cache and expects cache to be structured in a specific way.
     */
    processMedia(media: Media[]): Promise<void>;
    /**
     * This method will update `root/bcms/function.cache.json`
     * and in-memory copy of the data with provided cache object.
     * Use this method with care because invalid cache object can
     * break this handler or some other handler which is using
     * cache and expects cache to be structured in a specific way.
     */
    function<T>(data: T): Promise<void>;
  };
}

/**
 * Function which will initialize caches and return a cache
 * control object.
 */
export function BCMSMostCacheHandler() {
  const cache: {
    content: BCMSMostCacheContent;
    media: Media[];
    function: BCMSMostFunctionCache;
    processMedia: Media[];
  } = {
    content: undefined,
    function: undefined,
    media: undefined,
    processMedia: undefined,
  };
  const self: BCMSMostCacheHandlerPrototype = {
    get: {
      async content() {
        if (cache.content) {
          return JSON.parse(JSON.stringify(cache.content));
        } else if (await FS.exist(['content.cache.json'])) {
          cache.content = JSON.parse(
            (await FS.read(['content.cache.json'])).toString(),
          );
        } else {
          cache.content = {};
        }
        return JSON.parse(JSON.stringify(cache.content));
      },
      async media() {
        if (cache.media) {
          return JSON.parse(JSON.stringify(cache.media));
        } else if (await FS.exist(['media.cache.json'])) {
          cache.media = JSON.parse(
            (await FS.read(['media.cache.json'])).toString(),
          );
        } else {
          cache.media = [];
        }
        return cache.media;
      },
      async processMedia() {
        if (cache.processMedia) {
          return JSON.parse(JSON.stringify(cache.processMedia));
        } else if (await FS.exist(['process-media.cache.json'])) {
          cache.processMedia = JSON.parse(
            (await FS.read(['process-media.cache.json'])).toString(),
          );
        } else {
          cache.processMedia = [];
        }
        return JSON.parse(JSON.stringify(cache.processMedia));
      },
      async function() {
        if (cache.function) {
          return JSON.parse(JSON.stringify(cache.function));
        } else if (await FS.exist(['function.cache.json'])) {
          cache.function = JSON.parse(
            (await FS.read(['function.cache.json'])).toString(),
          );
        } else {
          cache.function = {};
        }
        return JSON.parse(JSON.stringify(cache.function));
      },
    },
    update: {
      async content(data) {
        if (typeof data !== 'object') {
          throw Error(
            `Expected "data" to be "object" but got "${typeof data}".`,
          );
        }
        for (const key in data) {
          General.object.compareWithSchema(
            {
              key: data[key],
            },
            {
              key: {
                __type: 'array',
                __required: true,
                __child: {
                  __type: 'object',
                  __content: BCMSMostCacheContentItemSchema,
                },
              },
            },
            `cache.content.${key}`,
          );
        }
        cache.content = data;
        await FS.save(JSON.stringify(cache.content, null, '  '), [
          'content.cache.json',
        ]);
      },
      async media(media) {
        cache.media = media;
        await FS.save(JSON.stringify(cache.media, null, '  '), [
          'media.cache.json',
        ]);
      },
      async processMedia(media) {
        cache.processMedia = media;
        await FS.save(JSON.stringify(cache.processMedia, null, '  '), [
          'process-media.cache.json',
        ]);
      },
      async function(data) {
        cache.function = data;
        await FS.save(JSON.stringify(cache.media, null, '  '), [
          'function.cache.json',
        ]);
      },
    },
  };
  return self;
}
