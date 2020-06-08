import { Config } from './interfaces/config';
import { General } from './util/general';

export class ConfigBuilder {
  public static build(config: Config) {
    General.compareWithSchema(
      config,
      {
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
              parse: {
                __type: 'boolean',
                __required: true,
              },
              templateId: {
                __type: 'string',
                __required: true,
              },
              modify: {
                __type: 'function',
                __required: true,
              },
            },
          },
        },
        media: {
          output: {
            __type: 'string',
            __required: true,
          },
          process: {
            __type: 'boolean',
            __required: false,
          },
          failOnError: {
            __type: 'boolean',
            __required: false,
          },
          sizeMap: {
            __type: 'array',
            __required: false,
            __child: {
              __type: 'object',
              __content: {
                width: {
                  __type: 'number',
                  __required: true,
                },
                quality: {
                  __type: 'number',
                  __required: false,
                },
              },
            },
          },
        },
        pageParser: {
          __type: 'object',
          __required: false,
          __child: {
            nuxt: {
              __type: 'array',
              __required: false,
              __child: {
                __type: 'object',
                __content: {
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
                },
              },
            },
            gatsby: {
              __type: 'array',
              __required: false,
              __child: {
                __type: 'object',
                __content: {
                  page: {
                    __type: 'string',
                    __required: true,
                  },
                  handler: {
                    __type: 'function',
                    __required: true,
                  },
                },
              },
            },
          },
        },
      },
      'config',
    );
    return config;
  }
}
