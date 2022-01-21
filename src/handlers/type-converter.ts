import type { FS } from '@banez/fs/types';
import type { BCMSClient } from '@becomes/cms-client/types';
import type { BCMSMostTypeConverterHandler } from '../types';

export function createBcmsMostTypeConverterHandler({
  rootFs,
  client,
}: {
  rootFs: FS;
  client: BCMSClient;
}): BCMSMostTypeConverterHandler {
  return {
    async pull() {
      const ts = await client.typeConverter.getAll({
        language: 'typescript',
      });
      for (let i = 0; i < ts.length; i++) {
        const item = ts[i];
        await rootFs.save(
          ['types-ts', ...item.outputFile.split('/')],
          item.content,
        );
      }
      const js = await client.typeConverter.getAll({
        language: 'jsDoc',
      });
      for (let i = 0; i < js.length; i++) {
        const item = js[i];
        await rootFs.save(
          ['types-js', ...item.outputFile.split('/')],
          item.content,
        );
      }
    },
  };
}
