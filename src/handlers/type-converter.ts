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
      const clear = ['types', 'graphql'];
      for (let i = 0; i < clear.length; i++) {
        const item = clear[i];
        if (await rootFs.exist(item)) {
          await rootFs.deleteDir(item);
        }
      }
      const ts = await client.typeConverter.getAll({
        language: 'typescript',
      });
      for (let i = 0; i < ts.length; i++) {
        const item = ts[i];
        await rootFs.save(
          ['types', ...item.outputFile.split('/')],
          item.content,
        );
      }
      await rootFs.save(
        ['types', 'index.d.ts'],
        ts
          .map((e) => `export * from './${e.outputFile.replace('.d.ts', '')}';`)
          .join('\n'),
      );
      const gql = await client.typeConverter.getAll({
        language: 'gql',
      });
      for (let i = 0; i < gql.length; i++) {
        const item = gql[i];
        await rootFs.save(
          ['graphql', ...item.outputFile.split('/')],
          item.content,
        );
      }
    },
  };
}
