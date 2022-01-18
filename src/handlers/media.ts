import type { BCMSClient } from '@becomes/cms-client/types';
import type {
  BCMSMostCacheHandler,
  BCMSMostConfig,
  BCMSMostMediaHandler,
} from '../types';

export function createBcmsMostMediaHandler({
  client,
}: {
  cache: BCMSMostCacheHandler;
  client: BCMSClient;
  config: BCMSMostConfig;
}): BCMSMostMediaHandler {
  // let output = ['static', 'bcms-media'];
  // let ppc = os.cpus().length;

  // if (config.media) {
  //   if (config.media.output) {
  //     output = config.media.output.split('/');
  //   }
  //   if (config.media.ppc) {
  //     ppc = config.media.ppc;
  //   }
  // }

  return {
    async pull() {
      const allMedia = await client.media.getAll();
      console.log(allMedia);
    }
  }
}
