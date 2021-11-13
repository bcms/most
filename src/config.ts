import * as os from 'os';
import { useObjectUtility } from '@becomes/purple-cheetah';
import {
  BCMSMostConfig,
  BCMSMostConfigMedia,
  BCMSMostConfigSchema,
} from './types';

export async function initBcmsMostConfig(
  conf?: BCMSMostConfig,
): Promise<BCMSMostConfig> {
  if (!conf) {
    conf = await import(`${process.cwd()}/bcms.config.js`);
  }
  const config = conf as BCMSMostConfig;
  const objectUtil = useObjectUtility();
  try {
    objectUtil.compareWithSchema(config, BCMSMostConfigSchema, 'config');
  } catch (err) {
    const error = err as Error;
    throw Error(`Error in the configuration file: ${error.message}`);
  }
  if (!config.media) {
    config.media = {
      output: 'static/media',
      ppc: os.cpus().length,
      sizeMap: [
        {
          width: 350,
        },
        {
          width: 600,
        },
        {
          width: 900,
        },
        {
          width: 1200,
        },
        {
          width: 1400,
        },
        {
          width: 1920,
        },
      ],
    };
  } else if (!config.media.ppc) {
    config.media.ppc = os.cpus().length;
  }
  if (((config.media as BCMSMostConfigMedia).ppc as number) > 16) {
    config.media.ppc = 16;
  }

  return config;
}
