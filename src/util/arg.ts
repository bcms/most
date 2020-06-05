import * as arg from 'arg';
import { Options } from '../interfaces';

export class Arg {
  public static parse(rawArgs: string[]): Options {
    const args = arg(
      {
        '--pull-media': Boolean,
        '--pull-content': Boolean,
        '--parse-content': Boolean,
        '--framework': String,
      },
      {
        argv: rawArgs.slice(2),
      },
    );
    const options: Options = {
      pullContent: args['--pull-content'] || false,
      parseContent: args['--parse-content'] || false,
      pullMedia: args['--pull-media'] || false,
    };
    return options;
  }
}
