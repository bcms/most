import {
  BCMSEntriesModifyFunction,
  ConfigMedia,
  ConfigMediaSchema,
  ObjectSchema,
} from '../../types';

export interface BCMSGatsbyOptions {
  cms: {
    origin: string;
    key: {
      id: string;
      secret: string;
    };
  };
  entries: Array<{
    name: string;
    parse?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modify?: BCMSEntriesModifyFunction<any, any, any>;
  }>;
  functions?: Array<{
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
    modify?: <T, K>(response: T) => Promise<K>;
  }>;
  media?: ConfigMedia;
}

export const BCMSMostGatsbyOptionsSchema: ObjectSchema = {
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
    __required: false,
    __child: {
      __type: 'object',
      __content: {
        name: {
          __type: 'string',
          __required: true,
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
    __required: false,
    __child: ConfigMediaSchema,
  },
};
