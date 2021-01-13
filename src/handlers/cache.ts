import { Media } from '@becomes/cms-client';
import {
  BCMSMostCacheContent,
  BCMSMostCacheContentItemSchema,
  BCMSMostFunctionCache,
} from '../types';
import { FS, General } from '../util';

export interface BCMSMostCacheHandlerPrototype {
  get: {
    content<T extends BCMSMostCacheContent>(): Promise<T>;
    media(): Promise<Media[]>;
    processMedia(): Promise<Media[]>;
    function<T>(): Promise<T>;
  };
  update: {
    content<T extends BCMSMostCacheContent>(cache: T): Promise<void>;
    media(media: Media[]): Promise<void>;
    processMedia(media: Media[]): Promise<void>;
    function<T>(data: T): Promise<void>;
  };
}

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
