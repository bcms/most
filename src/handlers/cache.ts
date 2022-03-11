import type { FS } from '@banez/fs/types';
import type { BCMSEntryParsed, BCMSTemplate } from '@becomes/cms-client/types';
import type {
  BCMSMediaExtended,
  BCMSMostCacheHandler,
  BCMSMostMediaHandler,
} from '../types';

export function createBcmsMostCacheHandler({
  rootFs,
  getMediaHandler,
}: {
  rootFs: FS;
  getMediaHandler(): BCMSMostMediaHandler;
}): BCMSMostCacheHandler {
  const contentChangesFileName = 'content-changes.cache.json';
  const contentFileName = 'content.cache.json';
  const mediaFileName = 'media.cache.json';
  const fnFileName = 'function.cache.json';
  const templateFileName = 'template.cache.json';

  let mediaHandler: BCMSMostMediaHandler | undefined = undefined;

  const self: BCMSMostCacheHandler = {
    template: {
      async get() {
        if (await rootFs.exist(templateFileName, true)) {
          return JSON.parse(await rootFs.readString(templateFileName));
        }
        return [];
      },
      async find(query) {
        const output: BCMSTemplate[] = [];
        const cache = await self.template.get();
        for (let i = 0; i < cache.length; i++) {
          const item = cache[i];
          if (query(item)) {
            output.push(item);
          }
        }
        return output;
      },
      async findOne(query) {
        const cache = await self.template.get();
        for (let i = 0; i < cache.length; i++) {
          const item = cache[i];
          if (query(item)) {
            return item;
          }
        }
        return null;
      },
      async set(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.template.get();
        for (let i = 0; i < input.length; i++) {
          const inputItem = input[i];
          let found = false;
          for (let j = 0; j < cache.length; j++) {
            const cacheItem = cache[j];
            if (inputItem._id === cacheItem._id) {
              cache[j] = inputItem;
              found = true;
              break;
            }
          }
          if (!found) {
            cache.push(inputItem);
          }
        }
        if (input.length > 0) {
          await rootFs.save(
            templateFileName,
            JSON.stringify(cache, null, '  '),
          );
        }
      },
      async remove(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.template.get();
        for (let i = 0; i < input.length; i++) {
          const inputItem = input[i];
          for (let j = 0; j < cache.length; j++) {
            const cacheItem = cache[j];
            if (cacheItem._id === inputItem._id) {
              cache.splice(j, 1);
              break;
            }
          }
        }
        await rootFs.save(templateFileName, JSON.stringify(cache, null, '  '));
      },
    },
    content: {
      changes: {
        async get() {
          if (await rootFs.exist(contentChangesFileName, true)) {
            return JSON.parse(await rootFs.readString(contentChangesFileName));
          }
          return null;
        },
        async set(data) {
          await rootFs.save(
            contentChangesFileName,
            JSON.stringify(data, null, '  '),
          );
        },
      },
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
      async update(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.content.get();
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          for (const groupName in cache) {
            const cacheItems = cache[groupName];
            let found = false;
            for (let j = 0; j < cacheItems.length; j++) {
              const cacheItem = cacheItems[j];
              if (cacheItem._id === item._id) {
                cache[groupName][j] = item;
                found = true;
                break;
              }
            }
            if (found) {
              break;
            }
          }
        }
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
      async remove(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.content.get();
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          for (const groupName in cache) {
            const cacheItems = cache[groupName];
            let found = false;
            for (let j = 0; j < cacheItems.length; j++) {
              const cacheItem = cacheItems[j];
              if (cacheItem._id === item._id) {
                cache[groupName].splice(j, 1);
                found = true;
                break;
              }
            }
            if (found) {
              break;
            }
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
          items: [],
        };
      },
      async find(query) {
        const cache = await self.media.get();
        const output: BCMSMediaExtended[] = [];
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
        if (!mediaHandler) {
          mediaHandler = getMediaHandler();
        }
        const input = items instanceof Array ? items : [items];
        const cache = await self.media.get();
        for (let i = 0; i < input.length; i++) {
          const inputItem = input[i];
          let found = false;
          for (let j = 0; j < cache.items.length; j++) {
            const cacheItem = cache.items[j];
            if (inputItem._id === cacheItem._id) {
              const fullPath = mediaHandler.getPath(inputItem, cache.items);
              cache.items[j] = {
                ...inputItem,
                fullPath: fullPath ? fullPath : `/${inputItem.name}`,
              };
              found = true;
              break;
            }
          }
          if (!found) {
            const fullPath = mediaHandler.getPath(inputItem, cache.items);
            cache.items.push({
              ...inputItem,
              fullPath: fullPath ? fullPath : `/${inputItem.name}`,
            });
          }
        }
        if (input.length > 0) {
          await rootFs.save(mediaFileName, JSON.stringify(cache, null, '  '));
        }
      },
      async remove(items) {
        const input = items instanceof Array ? items : [items];
        const cache = await self.media.get();
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          for (let j = 0; j < cache.items.length; j++) {
            const cacheItem = cache.items[j];
            if (cacheItem._id === item._id) {
              cache.items.splice(j, 1);
              break;
            }
          }
        }
        if (input.length > 0) {
          await rootFs.save(mediaFileName, JSON.stringify(cache, null, '  '));
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
