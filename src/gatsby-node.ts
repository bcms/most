/* eslint-disable @typescript-eslint/no-explicit-any */
import { Media, SocketEventName } from '@becomes/cms-client';
import * as crypto from 'crypto';
import Axios from 'axios';
import { BCMSMost, BCMSMostPrototype } from './most';
import { General } from './util';
import {
  BCMSMostCacheContentItem,
  BCMSMostConfig,
  BCMSMostConfigEntryModifyFunction,
  BCMSMostConfigSchema,
} from './types';

const nameMapping: {
  [name: string]: {
    entryIds: string[];
    modify?: BCMSMostConfigEntryModifyFunction<any, any, any>;
  };
} = {};
let options: BCMSMostConfig;
let BcmsMost: BCMSMostPrototype;

function getBCMSMost() {
  if (!BcmsMost) {
    BcmsMost = BCMSMost({
      cms: options.cms,
      functions: options.functions,
      entries: options.entries,
      media: options.media,
    });
  }
  return BcmsMost;
}
function toCamelCase(s: string): string {
  return s
    .split('_')
    .map(
      (e) =>
        `${e.substring(0, 1).toUpperCase()}${e.substring(1).toLowerCase()}`,
    )
    .join('');
}
function createSource(
  name: string,
  _data: BCMSMostCacheContentItem | Media[],
  createNodeId: any,
  createContentDigest: any,
  createNode: any,
) {
  try {
    const data = { data: _data };
    const nodeContent = JSON.stringify(data);
    const nodeMeta = {
      id:
        data.data instanceof Array
          ? crypto.randomBytes(24).toString('hex')
          : createNodeId(
              `${name}-${
                data.data._id
                  ? data.data._id
                  : crypto.randomBytes(24).toString('hex')
              }`,
            ),
      parent: null,
      internal: {
        type: 'Bcms' + toCamelCase(name),
        mediaType: `application/json`,
        content: nodeContent,
        contentDigest: createContentDigest(data),
      },
    };
    const node = Object.assign({}, data, nodeMeta);
    createNode(node);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export async function onPreInit<T>(
  data: T,
  ops: BCMSMostConfig,
): Promise<void> {
  try {
    options = {
      cms: ops.cms,
      entries: ops.entries ? ops.entries : [],
      functions: ops.functions ? ops.functions : [],
      media: ops.media
        ? ops.media
        : {
            output: 'static/media',
            sizeMap: [
              {
                width: 350,
              },
              {
                width: 600,
              },
              {
                width: 900,
              },
              {
                width: 1200,
              },
              {
                width: 1400,
              },
              {
                width: 1920,
              },
            ],
          },
    };
    General.object.compareWithSchema(options, BCMSMostConfigSchema, 'options');
    const bcmsMost = getBCMSMost();
    await bcmsMost.content.pull();
    await bcmsMost.media.pull();
    await bcmsMost.media.process();
    await bcmsMost.client.socket.connect({
      url: ops.cms.origin,
      path: '/api/socket/server/',
    });
    bcmsMost.client.socket.subscribe(async (name, data) => {
      if (name === SocketEventName.ENTRY) {
        let entry = await bcmsMost.client.entry.get({
          entryId: data.entry._id,
          templateId: data.entry.additional.templateId,
          parse: true,
        });
        const cache = await bcmsMost.cache.get.content();
        for (const key in nameMapping) {
          if (nameMapping[key].entryIds.includes(entry._id)) {
            if (nameMapping[key].modify) {
              const temp = JSON.parse(JSON.stringify(entry));
              entry = await nameMapping[key].modify(entry as any, cache);
              entry._id = temp._id;
              entry.createdAt = temp.createdAt;
              entry.updatedAt = temp.updatedAt;
              entry.templateId = temp.templateId;
            }
            cache[key] = cache[key].map((e) => {
              if (e._id === entry._id) {
                e = entry;
              }
              return e;
            });
            break;
          }
        }
        await bcmsMost.cache.update.content(cache);
        await Axios({
          url: 'http://localhost:8000/__refresh',
          method: 'POST',
        });
      }
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
export async function sourceNodes({
  actions,
  createNodeId,
  createContentDigest,
}) {
  try {
    const bcmsMost = getBCMSMost();
    const cache = await bcmsMost.cache.get.content();
    const { createNode } = actions;
    for (const key in cache) {
      if (!nameMapping[key]) {
        nameMapping[key] = {
          entryIds: [],
        };
      }
      const cacheData = cache[key];
      const modifyFn = options.entries.find(
        (e) => e.templateId === cacheData[0].templateId,
      );
      if (modifyFn && modifyFn.modify) {
        nameMapping[key].modify = modifyFn.modify;
      }
      cacheData.forEach((data) => {
        nameMapping[key].entryIds.push(data._id);
        createSource(key, data, createNodeId, createContentDigest, createNode);
      });
    }
    const mediaCache = await bcmsMost.cache.get.media();
    if (mediaCache.length > 0) {
      createSource(
        'media',
        mediaCache,
        createNodeId,
        createContentDigest,
        createNode,
      );
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
exports.createResolvers = async ({ createResolvers }) => {
  try {
    const bcmsMost = getBCMSMost();
    const tempCache = await bcmsMost.cache.get.content();
    const resolvers: {
      [name: string]: {
        data: any;
      };
    } = {};
    for (const key in tempCache) {
      resolvers[`Bcms${toCamelCase(key)}`] = {
        data: {
          async resolve(source, args, context, info) {
            const cache = await bcmsMost.cache.get.content();
            const type = (source.internal.type as string)
              .replace('Bcms', '')
              .split(/(?=[A-Z])/)
              .map((e) => e.toLowerCase())
              .join('');
            const target = JSON.parse(source.internal.content).data;
            const output = cache[type].find((e) => e._id === target._id);
            return output;
          },
        },
      };
    }
    createResolvers(resolvers);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
