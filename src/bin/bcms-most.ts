import { BCMSClient } from '@becomes/cms-client';
import { Config, ConfigSchema, Media } from '../types';
import { Arg, Console, General } from '../util';
import { BCMSMost } from '../main';

async function main() {
  const options = Arg.parse(process.argv);
  const config: Config = await import(`${process.cwd()}/bcms.config.js`);
  try {
    General.object.compareWithSchema(config, ConfigSchema, 'config');
  } catch (error) {
    throw Error(`Error in the configuration file: ${error.message}`);
  }
  const client = BCMSClient({
    cmsOrigin: config.cms.origin,
    key: config.cms.key,
  });
  const bcms = BCMSMost(config, client);
  if (options.pullContent === true) {
    await bcms.content.pull();
  } else if (options.pullMedia === true) {
    await bcms.media.pull();
  } else if (options.processMedia) {
    await bcms.media.process();
  } else if (options.pageParser === true) {
    await bcms.parser();
  } else if (options.callFunctions === true) {
    await bcms.function.call();
  }
}
main().catch((error) => {
  const cnsl = Console('BCMS Most');
  cnsl.error('', error);
  process.exit(1);
});
