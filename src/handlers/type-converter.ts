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
      const clear = ['types-ts', 'types-js'];
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
          ['types-ts', ...item.outputFile.split('/')],
          item.content,
        );
      }
      await rootFs.save(
        ['types-ts', 'index.ts'],
        ts
          .map((e) => `export * from './${e.outputFile.replace('.ts', '')}';`)
          .join('\n'),
      );
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
