import * as arg from 'arg';
import { Options } from '../types';

export interface ArgPrototype {
  parse(rawArgs: string[]): Options;
}

function argUtil(): ArgPrototype {
  return {
    parse(rawArgs) {
      const args = arg(
        {
          '--pull-media': Boolean,
          '--process-media': Boolean,
          '--pull-content': Boolean,
          '--page-parser': Boolean,
          '--call-functions': Boolean,
          '--media': String,
          '--configMedia': String,
          '--api-key': String,
          '--api-secret': String,
          '--api-origin': String,
        },
        {
          argv: rawArgs.slice(2),
        },
      );
      const options: Options = {
        pullContent: args['--pull-content'] || false,
        pullMedia: args['--pull-media'] || false,
        processMedia: args['--process-media'] || undefined,
        media: args['--media'] || undefined,
        configMedia: args['--configMedia'] || undefined,
        pageParser: args['--page-parser'] || false,
        callFunctions: args['--call-functions'] || false,
        apiKey: args['--api-key'] || undefined,
        apiSecret: args['--api-secret'] || undefined,
        apiOrigin: args['--api-origin'] || undefined,
      };
      return options;
    },
  };
}

export const Arg = argUtil();
