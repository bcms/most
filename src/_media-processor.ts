import * as sharp from 'sharp';
import { Media, MediaType } from '@becomes/cms-client';
import { BCMSMostConfigMedia } from './types';
import { FS } from './util';

export async function MediaProcessor(media: Media, config: BCMSMostConfigMedia) {
  if (config.sizeMap) {
    if (media.type === MediaType.IMG) {
      const path: string[] = media.isInRoot
        ? ['..', ...config.output.split('/').filter((e) => !!e)]
        : [
            '..',
            ...config.output.split('/').filter((e) => !!e),
            ...media.path.split('/').filter((e) => !!e),
          ];
      const nameParts = {
        name: media.name.split('.')[0],
        ext: media.name.split('.')[1].toLowerCase(),
      };
      for (const i in config.sizeMap) {
        const configOption = config.sizeMap[i];
        const fileName = `${nameParts.name}-${configOption.width}.${nameParts.ext}`;
        if (!(await FS.exist([...path, fileName]))) {
          const original = await FS.read([...path, media.name]);
          let output: Buffer;
          let createWebP = false;
          if (nameParts.ext === 'png') {
            createWebP = true;
            output = await sharp(original)
              .resize({
                width: configOption.width,
                withoutEnlargement: true,
              })
              .png({
                quality: configOption.quality ? configOption.quality : 50,
              })
              .toBuffer();
            await FS.save(output, [...path, fileName]);
          } else if (nameParts.ext === 'jpg' || nameParts.ext === 'jpeg') {
            createWebP = true;
            output = await sharp(original)
              .resize({
                width: configOption.width,
                withoutEnlargement: true,
              })
              .jpeg({
                quality: configOption.quality ? configOption.quality : 50,
              })
              .toBuffer();
            await FS.save(output, [...path, fileName]);
          }
          if (createWebP) {
            output = await sharp(original)
              .resize({ width: configOption.width, withoutEnlargement: true })
              .webp({
                quality: configOption.quality ? configOption.quality : 50,
              })
              .toBuffer();
            await FS.save(output, [
              ...path,
              `${nameParts.name}-${configOption.width}.webp`,
            ]);
          }
        }
      }
    }
  }
}
