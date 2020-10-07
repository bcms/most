import { ObjectSchema } from './object-schema';

export interface ConfigPageParserNuxtOutput {
  output: string;
  data: any | any[];
}

export interface ConfigPageParserNuxt {
  entries: string;
  type: 'many' | 'single';
  handler: (
    items: any[] | any,
    allItems?: any[],
  ) => Promise<
    ConfigPageParserNuxtOutput | ConfigPageParserNuxtOutput[] | void
  >;
}

export interface ConfigPageParserGatsby {
  page: string;
  handler: (
    createPage: any,
    component: any,
    contentCache: any,
  ) => Promise<void>;
}

export interface ConfigMediaSizeMap {
  width: number;
  /** Default is 50 */
  quality?: number;
}

export interface ConfigMedia {
  output: string;
  ppc?: number;
  process?: boolean;
  sizeMap?: ConfigMediaSizeMap[];
  failOnError?: boolean;
}

export interface Config {
  cms: {
    origin: string;
    key: {
      id: string;
      secret: string;
    };
  };
  entries: Array<{
    name: string;
    templateId: string;
    aggregate?: boolean;
    parse?: boolean;
    modify?: (entries: any, bcms: any) => Promise<any>;
  }>;
  functions?: Array<{
    name: string;
    payload?: any;
    modify?: (response: any) => Promise<any>;
  }>;
  media: ConfigMedia;
  parser?: {
    nuxt?: ConfigPageParserNuxt[];
    gatsby?: ConfigPageParserGatsby[];
  };
}

export const ConfigMediaSizeMapSchema: ObjectSchema = {
  width: {
    __type: 'number',
    __required: true,
  },
  quality: {
    __type: 'number',
    __required: false,
  },
};

export const ConfigPageParserNuxtOutputSchema: ObjectSchema = {
  output: {
    __type: 'string',
    __required: true,
  },
};

export const ConfigPageParserNuxtSchema: ObjectSchema = {
  entries: {
    __type: 'string',
    __required: true,
  },
  type: {
    __type: 'string',
    __required: true,
  },
  handler: {
    __type: 'function',
    __required: true,
  },
};

export const ConfigPageParserGatsbySchema: ObjectSchema = {
  page: {
    __type: 'string',
    __required: true,
  },
  handler: {
    __type: 'function',
    __required: true,
  },
};

export const ConfigSchema: ObjectSchema = {
  cms: {
    __type: 'object',
    __required: true,
    __child: {
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
    },
  },
  entries: {
    __type: 'array',
    __required: true,
    __child: {
      __type: 'object',
      __content: {
        name: {
          __type: 'string',
          __required: true,
        },
        templateId: {
          __type: 'string',
          __required: true,
        },
        aggregate: {
          __type: 'boolean',
          __required: false,
        },
        parse: {
          __type: 'boolean',
          __required: false,
        },
        modify: {
          __type: 'function',
          __required: false,
        },
      },
    },
  },
  functions: {
    __type: 'array',
    __required: false,
    __child: {
      __type: 'object',
      __content: {
        name: {
          __type: 'string',
          __required: true,
        },
        modify: {
          __type: 'function',
          __required: false,
        },
      },
    },
  },
  media: {
    __type: 'object',
    __required: true,
    __child: {
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
          __content: ConfigMediaSizeMapSchema,
        },
      },
      failOnError: {
        __type: 'boolean',
        __required: false,
      },
    },
  },
  parser: {
    __type: 'object',
    __required: false,
    __child: {
      nuxt: {
        __type: 'array',
        __required: false,
        __child: {
          __type: 'object',
          __content: ConfigPageParserNuxtSchema,
        },
      },
      gatsby: {
        __type: 'array',
        __required: false,
        __child: {
          __type: 'object',
          __content: ConfigPageParserGatsbySchema,
        },
      },
    },
  },
};
