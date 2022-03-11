import type { ObjectSchema } from '@banez/object-utility/types';

export interface BCMSMostConfigCms {
  /**
   * Origin of the BCMS (ex. `https://mycms.yourbcms.com`)
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

export interface BCMSMostConfigEntries {
  /**
   * Only entries from specified templates will be pulled.
   */
  includeFromTemplates?: string[];
  /**
   * Entries from specified templates will not be pulled.
   */
  excludeFromTemplates?: string[];
}
export const BCMSMostConfigEntriesSchema: ObjectSchema = {
  includeFromTemplates: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'string',
    },
  },
  excludeFromTemplates: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'string',
    },
  },
};

export interface BCMSMostConfigFunctionCall<Payload = unknown> {
  (): Promise<{
    payload: Payload;
    name: string;
  }>;
}
export interface BCMSMostConfigFunctions {
  call?: BCMSMostConfigFunctionCall[];
}
export const BCMSMostConfigFunctionsSchema: ObjectSchema = {
  call: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'function',
    },
  },
};

export interface BCMSMostConfigMediaSizeMap {
  /**
   * Scale image to specified width without changing
   * aspect ratio.
   */
  width: number;
  /**
   * If height is provided image will be cropped.
   */
  height?: number;
  /**
   * Quality of the output.
   * Defaults to 50%.
   */
  quality?: number;
}
export const BCMSMostConfigMediaSizeMapSchema: ObjectSchema = {
  width: {
    __type: 'number',
    __required: true,
  },
  height: {
    __type: 'number',
    __required: false,
  },
  quality: {
    __type: 'number',
    __required: false,
  },
};
export interface BCMSMostConfigMediaImages {
  /**
   * Should downloaded images be processed. Processing images implies
   * using `sizeMap` to create multiple versions.
   */
  process?: boolean;
  /**
   * If `process` is set to **true**, specify processing options
   * for each image media.
   *
   * Defaults to:
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
}
export const BCMSMostConfigMediaImagesSchema: ObjectSchema = {
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
};
export interface BCMSMostConfigMedia {
  /**
   * Where will downloaded media be saved.
   * Default is `static/media`.
   */
  output?: string;
  /**
   * Allowed number of parallel processes.
   * Maximum is 16. If not specified,
   * it will default to number of vCPU cores.
   */
  ppc?: number;
  /**
   * If binary data should be downloaded.
   */
  download?: boolean;
  images?: BCMSMostConfigMediaImages;
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
    __required: false,
  },
  ppc: {
    __type: 'number',
    __required: false,
  },
  download: {
    __type: 'boolean',
    __required: false,
  },
  images: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigMediaImagesSchema,
  },
  failOnError: {
    __type: 'boolean',
    __required: false,
  },
};

export interface BCMSMostConfigServer {
  port?: number;
}
export const BCMSMostConfigServerSchema: ObjectSchema = {
  port: {
    __type: 'number',
    __required: false,
  },
};

export interface BCMSMostConfig {
  /**
   * Required for connecting to the BCMS.
   */
  cms: BCMSMostConfigCms;
  /**
   * Entry options.
   */
  entries?: BCMSMostConfigEntries;
  functions?: BCMSMostConfigFunctions;
  media?: BCMSMostConfigMedia;
  server?: BCMSMostConfigServer;
  enableClientCache?: boolean;
}
export const BCMSMostConfigSchema: ObjectSchema = {
  cms: {
    __type: 'object',
    __required: true,
    __child: BCMSMostConfigCmsSchema,
  },
  entries: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigEntriesSchema,
  },
  functions: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigFunctionsSchema,
  },
  media: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigMediaSchema,
  },
  server: {
    __type: 'object',
    __required: false,
    __child: BCMSMostConfigServerSchema,
  },
  enableClientCache: {
    __type: 'boolean',
    __required: false,
  },
};
