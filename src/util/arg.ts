import * as arg from 'arg';
import { Options } from '../interfaces';

export class Arg {
  public static parse(rawArgs: string[]): Options {
    const args = arg(
      {
        '--pull-media': Boolean,
        '--process-media': String,
        '--pull-content': Boolean,
        '--page-parser': Boolean,
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
      processMedia: args['--pull-media'] || undefined,
      pageParser: args['--page-parser'] || false,
      apiKey: args['--api-key'] || undefined,
      apiSecret: args['--api-secret'] || undefined,
      apiOrigin: args['--api-origin'] || undefined,
    };
    return options;
  }
}
