#!/usr/bin/env node

import * as path from 'path';
import { BCMSClient } from '@becomes/cms-client';
import { BCMSMostConfigMedia, Media } from '../types';
import { Arg } from '../util';
import {
  BCMSMostMediaImageProcessor,
  BCMSMostMediaProcessor,
} from '../handlers';
import { initializeFS, useFS, useLogger } from '@becomes/purple-cheetah';
import { createBcmsMost } from '../main';
import { initBcmsMostConfig } from '../config';

async function main() {
  const options = Arg.parse(process.argv);
  if (options.mediaProcessor) {
    const fs = useFS({
      base: path.join(process.cwd(), 'bcms'),
    });
    useLogger({ name: 'main' });
    initializeFS();
    if (options.mediaImage) {
      await BCMSMostMediaImageProcessor({
        data: JSON.parse(Buffer.from(options.mediaImage, 'hex').toString()),
        fs,
      });
    } else {
      const media: Media = JSON.parse(
        Buffer.from(options.media as string, 'hex').toString(),
      );
      const mediaConfig: BCMSMostConfigMedia = JSON.parse(
        Buffer.from(options.mediaConfig as string, 'hex').toString(),
      );
      await BCMSMostMediaProcessor({
        media,
        config: mediaConfig,
        fs,
      });
    }
  } else {
    const config = await initBcmsMostConfig();
    const client = BCMSClient({
      cmsOrigin: config.cms.origin,
      key: config.cms.key,
    });
    const bcms = await createBcmsMost({ config, client });
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
  // eslint-disable-next-line no-console
  console.error('', error);
  process.exit(1);
});
