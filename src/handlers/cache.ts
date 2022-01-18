import type { FS } from '@banez/fs/types';
import type { BCMSEntryParsed, BCMSMedia } from '@becomes/cms-client/types';
import type { BCMSMostCacheHandler } from '../types';

export function createBcmsMostCacheHandler({
  rootFs,
}: {
  rootFs: FS;
}): BCMSMostCacheHandler {
  const contentFileName = 'content.cache.json';
  const mediaFileName = 'media.cache.json';
  const fnFileName = 'function.cache.json';

  const self: BCMSMostCacheHandler = {
    content: {
      async get() {
        if (await rootFs.exist(contentFileName, true)) {
          return JSON.parse(await rootFs.readString(contentFileName));
        }
        return {};
      },
      async find(query) {
        const cache = await self.content.get();
        const output: BCMSEntryParsed[] = [];
        for (const key in cache) {
          const items = cache[key];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (query(item)) {
              output.push(item);
            }
          }
        }
        return output;
      },
      async findInGroup(groupName, query) {
        const cache = await self.content.get();
        const output: BCMSEntryParsed[] = [];
        if (cache[groupName]) {
          const items = cache[groupName];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (query(item)) {
              output.push(item);
            }
          }
        }
        return output;
      },
      async findOne(query) {
        const cache = await self.content.get();
        for (const key in cache) {
          const items = cache[key];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (query(item)) {
              return item;
            }
          }
        }
        return null;
      },
      async findOneInGroup(groupName, query) {
        const cache = await self.content.get();
        if (cache[groupName]) {
          const items = cache[groupName];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (query(item)) {
              return item;
            }
          }
        }
        return null;
      },
      async set({ groupName, items }) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.content.get();
        if (!cache[groupName]) {
          cache[groupName] = [];
        }
        for (let i = 0; i < input.length; i++) {
          const inputItem = input[i];
          const found = false;
          for (let j = 0; j < cache[groupName].length; j++) {
            const item = cache[groupName][j];
            if (item._id === inputItem._id) {
              cache[groupName][j] = inputItem;
              break;
            }
          }
          if (!found) {
            cache[groupName].push(inputItem);
          }
        }
        if (input.length > 0) {
          await rootFs.save(contentFileName, JSON.stringify(cache, null, '  '));
        }
      },
    },
    media: {
      async get() {
        if (await rootFs.exist(mediaFileName, true)) {
          return JSON.parse(await rootFs.readString(mediaFileName));
        }
        return {
          items: []
        };
      },
      async find(query) {
        const cache = await self.media.get();
        const output: BCMSMedia[] = [];
        for (let i = 0; i < cache.items.length; i++) {
          const item = cache.items[i];
          if (query(item)) {
            output.push(item);
          }
        }
        return output;
      },
      async findOne(query) {
        const cache = await self.media.get();
        for (let i = 0; i < cache.items.length; i++) {
          const item = cache.items[i];
          if (query(item)) {
            return item;
          }
        }
        return null;
      },
      async set(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.media.get();
        for (let i = 0; i < input.length; i++) {
          const inputItem = input[i];
          let found = false;
          for (let j = 0; j < cache.items.length; j++) {
            const cacheItem = cache.items[j];
            if (inputItem._id === cacheItem._id) {
              cache.items[j] = inputItem;
              found = true;
            }
          }
          if (!found) {
            cache.items.push(inputItem);
          }
        }
      },
    },
    function: {
      async get() {
        if (await rootFs.exist(fnFileName, true)) {
          return JSON.parse(await rootFs.readString(fnFileName));
        }
        return {};
      },
      async findOne(query) {
        const cache = await self.function.get();
        for (const key in cache) {
          const item = cache[key];
          if (query({ name: key, data: item })) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return item as any;
          }
        }
        return null;
      },
      async set(name, data) {
        const cache = await self.function.get();
        cache[name] = data;
        await rootFs.save(fnFileName, JSON.stringify(cache, null, '  '));
      },
    },
  };

  return self;
}
