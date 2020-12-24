/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';
import { BCMSGatsbyOptions } from './gatsby';
import { BCMSMostGatsbyOptionsSchema } from './gatsby/types';
import { BCMSMost, BCMSMostPrototype } from './main';
import { General } from './util';

let options: BCMSGatsbyOptions;
let BcmsMost: BCMSMostPrototype;

function getBCMSMost() {
  if (!BcmsMost) {
    BcmsMost = BCMSMost({
      cms: options.cms,
      entries: options.entries,
      functions: options.functions,
      media: {
        output: '',
      },
    });
  }
  return BcmsMost;
}

export async function onPreInit<T>(
  data: T,
  ops: BCMSGatsbyOptions,
): Promise<void> {
  try {
    options = {
      cms: ops.cms,
      entries: ops.entries,
      parsers: ops.parsers,
      functions: ops.functions,
    };
    General.object.compareWithSchema(
      options,
      BCMSMostGatsbyOptionsSchema,
      'options',
    );
    // options.entries =
    const bcmsMost = getBCMSMost();
    await bcmsMost.content.pull();
    await bcmsMost.client.socket.connect({
      url: 'http://localhost:1280',
      path: '/api/socket/server/',
    });
    bcmsMost.client.socket.subscribe(() => {
      bcmsMost.content.pull().catch((error) => {
        console.error(error);
      });
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

function createSource(
  name: string,
  _data: any,
  createNodeId: any,
  createContentDigest: any,
  createNode: any,
) {
  try {
    const data = { data: _data };
    const nodeContent = JSON.stringify(data);
    const nodeMeta = {
      id: createNodeId(
        `${name}-${
          data.data._id ? data.data._id : crypto.randomBytes(24).toString('hex')
        }`,
      ),
      parent: null,
      internal: {
        type: `Bcms${name.substring(0, 1).toUpperCase()}${name
          .substring(1)
          .toLowerCase()}`,
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
      const cacheData = cache[key];
      if (cacheData instanceof Array) {
        cacheData.forEach((data) => {
          createSource(
            key,
            data,
            createNodeId,
            createContentDigest,
            createNode,
          );
        });
      } else {
        createSource(
          key,
          cacheData,
          createNodeId,
          createContentDigest,
          createNode,
        );
      }
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
      resolvers[
        `Bcms${key.substring(0, 1).toUpperCase()}${key
          .substring(1)
          .toLowerCase()}`
      ] = {
        data: {
          async resolve(source, args, context, info) {
            const cache = await bcmsMost.cache.get.content();
            const type = source.internal.type.replace('Bcms', '').toLowerCase();
            const targetEntryId = JSON.parse(source.internal.content).data._id;
            return cache[type].find((e) => e._id === targetEntryId);
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
