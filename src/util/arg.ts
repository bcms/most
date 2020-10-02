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
          '--all': Boolean,
          '--pull-media': Boolean,
          '--process-media': Boolean,
          '--pull-content': Boolean,
          '--parse': String,
          '--call-functions': Boolean,
          '--media': String,
          '--media-config': String,
          '--media-processor': Boolean,
          '--api-key': String,
          '--api-secret': String,
          '--api-origin': String,
        },
        {
          argv: rawArgs.slice(2),
        },
      );
      const options: Options = {
        all: args['--all'] || false,
        pullContent: args['--pull-content'] || false,
        pullMedia: args['--pull-media'] || false,
        processMedia: args['--process-media'] || undefined,
        media: args['--media'] || undefined,
        mediaConfig: args['--media-config'] || undefined,
        parse: args['--parse'] || undefined,
        mediaProcessor: args['--media-processor'] || false,
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
