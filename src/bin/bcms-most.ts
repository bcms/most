#!/usr/bin/env node

import { BCMSClient } from '@becomes/cms-client';
import { BCMSMostConfig, BCMSMostConfigMedia, BCMSMostConfigSchema, Media } from '../types';
import { Arg, Console, General } from '../util';
import { BCMSMost } from '../most';
import { MediaProcessor } from '../_media-processor';

async function main() {
  const options = Arg.parse(process.argv);
  if (options.mediaProcessor) {
    const media: Media = JSON.parse(
      Buffer.from(options.media, 'hex').toString(),
    );
    const mediaConfig: BCMSMostConfigMedia = JSON.parse(
      Buffer.from(options.mediaConfig, 'hex').toString(),
    );
    await MediaProcessor(media, mediaConfig);
  } else {
    const config: BCMSMostConfig = await import(`${process.cwd()}/bcms.config.js`);
    try {
      General.object.compareWithSchema(config, BCMSMostConfigSchema, 'config');
    } catch (error) {
      throw Error(`Error in the configuration file: ${error.message}`);
    }
    const client = BCMSClient({
      cmsOrigin: config.cms.origin,
      key: config.cms.key,
    });
    const bcms = BCMSMost(config, client);
    if (options.all) {
      await bcms.content.pull();
      await bcms.function.call();
      await bcms.media.pull();
      await bcms.media.process();
    } else if (options.pullContent === true) {
      await bcms.content.pull();
    } else if (options.pullMedia === true) {
      await bcms.media.pull();
    } else if (options.processMedia) {
      await bcms.media.process();
    } else if (options.callFunctions === true) {
      await bcms.function.call();
    }
  }
}
main().catch((error) => {
  const cnsl = Console('BCMS Most');
  cnsl.error('', error);
  process.exit(1);
});
