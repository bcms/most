/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';
import { BCMSGatsbyOptions } from './gatsby';
import { BCMSMostGatsbyOptionsSchema } from './gatsby/types';
import { BCMSMost, BCMSMostPrototype } from './main';
import { General } from './util';

let options: BCMSGatsbyOptions;
let bcmsMost: BCMSMostPrototype;

export async function onPreInit<T>(
  data: T,
  ops: BCMSGatsbyOptions,
): Promise<void> {
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
  bcmsMost = BCMSMost({
    cms: options.cms,
    entries: options.entries,
    functions: options.functions,
    media: {
      output: '',
    },
  });
  await bcmsMost.content.pull();
}

function createSource(
  name: string,
  _data: any,
  createNodeId: any,
  createContentDigest: any,
  createNode: any,
) {
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
}

export async function sourceNodes({
  actions,
  createNodeId,
  createContentDigest,
}) {
  console.log('HERE');
  const cache = await bcmsMost.cache.get.content();
  const { createNode } = actions;
  console.log();
  options.entries.forEach((entryOption) => {
    const cacheData = cache[entryOption.name];
    if (cacheData instanceof Array) {
      cacheData.forEach((data) => {
        createSource(
          entryOption.name,
          data,
          createNodeId,
          createContentDigest,
          createNode,
        );
      });
    } else {
      createSource(
        entryOption.name,
        cacheData,
        createNodeId,
        createContentDigest,
        createNode,
      );
    }
  });
}

exports.createResolvers = ({ createResolvers }) => {
  const resolvers: {
    [name: string]: {
      data: any;
    };
  } = {};
  options.entries.forEach((entryOption) => {
    resolvers[
      `Bcms${entryOption.name
        .substring(0, 1)
        .toUpperCase()}${entryOption.name.substring(1).toLowerCase()}`
    ] = {
      data: {
        async resolve(source, args, context, info) {
          console.log(source);
          return source.data;
        },
      },
    };
  });
  // const resolvers = {
  //   BcmsHome: {
  //     meta: {
  //       async resolve(source, args, context, info) {
  //         console.log('HERE');
  //         const cache = await bcmsMost.cache.get.content();
  //         return cache.home.meta;
  //       },
  //     },
  //   },
  // };
  createResolvers(resolvers);
};
