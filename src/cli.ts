import { Arg } from './util/arg';

export async function cli(args: string[]) {
  const options = Arg.parse(args);
}
