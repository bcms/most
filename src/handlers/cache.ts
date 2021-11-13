import { Media } from '@becomes/cms-client';
import { useObjectUtility } from '@becomes/purple-cheetah';
import {
  BCMSMostCacheContent,
  BCMSMostCacheContentItemSchema,
  BCMSMostFunctionCache,
  BCMSMostCacheHandler,
  BCMSMostCacheContentInfo,
} from '../types';
import { FS } from '@becomes/purple-cheetah/types';

/**
 * Function which will initialize caches and return a cache
 * control object.
 */
export function createBcmsMostCacheHandler({
  fs,
}: {
  fs: FS;
}): BCMSMostCacheHandler {
  const objectUtil = useObjectUtility();
  const cache: {
    content: BCMSMostCacheContent;
    contentInfo: BCMSMostCacheContentInfo;
    media: Media[];
    function: BCMSMostFunctionCache;
    processMedia: Media[];
  } = {
    content: undefined as never,
    contentInfo: undefined as never,
    function: undefined as never,
    media: undefined as never,
    processMedia: undefined as never,
  };
  return {
    get: {
      async contentInfo() {
        if (cache.contentInfo) {
          return JSON.parse(JSON.stringify(cache.contentInfo));
        } else if (await fs.exist('content-info.cache.json', true)) {
          cache.contentInfo = JSON.parse(
            (await fs.read('content-info.cache.json')).toString(),
          );
        } else {
          cache.contentInfo = {
            pullAfter: Date.now() - 1,
          };
        }
        return JSON.parse(JSON.stringify(cache.contentInfo));
      },
      async content() {
        if (cache.content) {
          return JSON.parse(JSON.stringify(cache.content));
        } else if (await fs.exist('content.cache.json', true)) {
          cache.content = JSON.parse(
            (await fs.read('content.cache.json')).toString(),
          );
        } else {
          cache.content = {};
        }
        return JSON.parse(JSON.stringify(cache.content));
      },
      async media() {
        if (cache.media) {
          return JSON.parse(JSON.stringify(cache.media));
        } else if (await fs.exist('media.cache.json', true)) {
          cache.media = JSON.parse(
            (await fs.read('media.cache.json')).toString(),
          );
        } else {
          cache.media = [];
        }
        return cache.media;
      },
      async processMedia() {
        if (cache.processMedia) {
          return JSON.parse(JSON.stringify(cache.processMedia));
        } else if (await fs.exist('process-media.cache.json', true)) {
          cache.processMedia = JSON.parse(
            (await fs.read('process-media.cache.json')).toString(),
          );
        } else {
          cache.processMedia = [];
        }
        return JSON.parse(JSON.stringify(cache.processMedia));
      },
      async function() {
        if (cache.function) {
          return JSON.parse(JSON.stringify(cache.function));
        } else if (await fs.exist('function.cache.json', true)) {
          cache.function = JSON.parse(
            (await fs.read('function.cache.json')).toString(),
          );
        } else {
          cache.function = {};
        }
        return JSON.parse(JSON.stringify(cache.function));
      },
    },
    update: {
      async contentInfo(data) {
        cache.contentInfo = data;
        await fs.save(
          'content-info.cache.json',
          JSON.stringify(cache.contentInfo, null, '  '),
        );
      },
      async content(data) {
        if (typeof data !== 'object') {
          throw Error(
            `Expected "data" to be "object" but got "${typeof data}".`,
          );
        }
        for (const key in data) {
          objectUtil.compareWithSchema(
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
        await fs.save(
          'content.cache.json',
          JSON.stringify(cache.content, null, '  '),
        );
      },
      async media(media) {
        cache.media = media;
        await fs.save(
          'media.cache.json',
          JSON.stringify(cache.media, null, '  '),
        );
      },
      async processMedia(media) {
        cache.processMedia = media;
        await fs.save(
          'process-media.cache.json',
          JSON.stringify(cache.processMedia, null, '  '),
        );
      },
      async function(data) {
        cache.function = data;
        await fs.save(
          'function.cache.json',
          JSON.stringify(cache.function, null, '  '),
        );
      },
    },
  };
}
