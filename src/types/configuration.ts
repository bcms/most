/* eslint-disable @typescript-eslint/no-explicit-any */
import { BCMSMostCacheContentItem } from './cache';
import { BCMSEntryParsed } from './cms';
import { ObjectSchema } from './object-schema';

export interface BCMSMostConfigCms {
  /**
   * Origin of the BCMS (ex. `https://mycms.thebcms.com`)
   */
  origin: string;
  /**
   * Key information from the BCMS dashboard.
   */
  key: {
    id: string;
    secret: string;
  };
}
export const BCMSMostConfigCmsSchema: ObjectSchema = {
  origin: {
    __type: 'string',
    __required: true,
  },
  key: {
    __type: 'object',
    __required: true,
    __child: {
      id: {
        __type: 'string',
        __required: true,
      },
      secret: {
        __type: 'string',
        __required: true,
      },
    },
  },
};
export type BCMSMostConfigEntryModifyFunction<
  K,
  R extends BCMSMostCacheContentItem,
> = (entry: BCMSEntryParsed, cache: K) => Promise<R>;
export interface BCMSMostConfigEntry {
  /**
   * ID of the template which entries will be modified.
   */
  templateId: string;
  /**
   * Function which will be called when entries are available.
   * Have in mind that output must be an array of objects. If
   * each object does not have `_id`, `createdAt` and `updatedAt`
   * properties, they will be appended automatically.
   */
  modify?<Cache, Result extends BCMSMostCacheContentItem>(
    entry: BCMSEntryParsed,
    cache: Cache,
  ): Promise<Result>;
}
export const BCMSMostConfigEntrySchema: ObjectSchema = {
  templateId: {
    __type: 'string',
    __required: true,
  },
  modify: {
    __type: 'function',
    __required: false,
  },
};
export interface BCMSMostConfigFunction<PayloadType> {
  /**
   * Name of the function to call.
   */
  name: string;
  /**
   * If function requires some payload (request body),
   * specify it here.
   */
  payload?: PayloadType;
  /**
   * Transform response of the function call. Of not specified,
   * default response data will be saved.
   */
  modify?<T, K>(response: T): Promise<K>;
}
export const BCMSMostConfigFunctionSchema: ObjectSchema = {
  name: {
    __type: 'string',
    __required: true,
  },
  modify: {
    __type: 'function',
    __required: false,
  },
};
export interface BCMSMostConfigMediaSizeMap {
  /**
   * Scale image to specified width without changing
   * aspect ratio.
   */
  width: number;
  /**
   * Quality of the output. Defaults to 50%.
   */
  quality?: number;
}
export const BCMSMostConfigMediaSizeMapSchema: ObjectSchema = {
  width: {
    __type: 'number',
    __required: true,
  },
  quality: {
    __type: 'number',
    __required: false,
  },
};
export interface BCMSMostConfigMedia {
  /**
   * Where will downloaded media be saved.
   * Default is `static/media`.
   */
  output: string;
  /**
   * Allowed number of parallel processes.
   * Maximum is 16. If not specified,
   * it will default to number of vCPU cores.
   */
  ppc?: number;
  /**
   * Should downloaded media be processed. Processing media implies
   * using `sizeMap` to create multiple versions of the same
   * file. For images this will be creating multiple sizes.
   */
  process?: boolean;
  /**
   * If `process` is set to **true**, specify processing options
   * for each media file. Defaults to:
   *
   * ```
   * sizeMap: [
   *  { width: 350 },
   *  { width: 600 },
   *  { width: 900 },
   *  { width: 1200 },
   *  { width: 1400 },
   *  { width: 1920 },
   * ]
   * ```
   */
  sizeMap?: BCMSMostConfigMediaSizeMap[];
  /**
   * By default errors are only printed in the console. If set
   * to **true**, error in media download of processing will
   * throw an error and brake the process.
   */
  failOnError?: boolean;
}
export const BCMSMostConfigMediaSchema: ObjectSchema = {
  output: {
    __type: 'string',
    __required: true,
  },
  pcc: {
    __type: 'number',
    __required: false,
  },
  process: {
    __type: 'boolean',
    __required: false,
  },
  sizeMap: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'object',
      __content: BCMSMostConfigMediaSizeMapSchema,
    },
  },
  failOnError: {
    __type: 'boolean',
    __required: false,
  },
};
export interface BCMSMostConfig {
  /**
   * Required for connecting to the BCMS.
   */
  cms: BCMSMostConfigCms;
  /**
   * Modify default output of the CMS on a server level. This is
   * useful for doing some modification to the data at the build
   * time.
   */
  entries?: BCMSMostConfigEntry[];
  /**
   * Specify which functions need to be called at build time.
   */
  functions?: BCMSMostConfigFunction<any>[];
  /**
   * Specify media options.
   */
  media?: BCMSMostConfigMedia;
}
export const BCMSMostConfigSchema: ObjectSchema = {
  cms: {
    __type: 'object',
    __required: true,
    __child: BCMSMostConfigCmsSchema,
  },
  entries: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'object',
      __content: BCMSMostConfigEntrySchema,
    },
  },
  functions: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'object',
      __content: BCMSMostConfigFunctionSchema,
    },
  },
  media: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigMediaSchema,
  },
};
