import * as sharp from 'sharp';
import { Media, MediaType } from '@becomes/cms-client';
import { BCMSMostConfigMedia } from '../types';
import { BCMSMostRequestItem } from '../handlers';
import { Console, FS } from '../util';

const autoSizes = [350, 600, 900, 1200, 1400, 1920];

export async function BCMSMostMediaProcessor(
  media: Media,
  config: BCMSMostConfigMedia,
) {
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

export async function BCMSMostMediaImageProcessor(
  data: BCMSMostRequestItem,
): Promise<void> {
  const cnsl = Console('MediaImageProcessor');
  const inputPathParts = data.inputPath.split('/');
  const outputPathParts = data.outputPath.split('/');
  if (!(await FS.exist(inputPathParts))) {
    if (!data.inputPath.endsWith('.webp')) {
      cnsl.error('', `File does not exist: ${data.inputPath}`);
    }
    return;
  }
  const inputFile = await FS.read(inputPathParts);
  const inputFileName = inputPathParts[inputPathParts.length - 1];
  const inputFileNameInfo = {
    name: inputFileName.split('.')[0],
    ext: inputFileName.split('.')[1].toLowerCase(),
  };
  const resizeOptions: sharp.ResizeOptions = {};
  if (!data.options.sizes) {
    resizeOptions.width = autoSizes[data.options.sizeIndex];
    resizeOptions.withoutEnlargement = true;
  } else {
    const target = data.options.sizes[data.options.sizeIndex];
    if (!target) {
      cnsl.error(
        '',
        `Size for index "${data.options.sizeIndex}" does not exist.`,
      );
      return;
    }
    resizeOptions.width = target.width;
    resizeOptions.height = target.height;
    resizeOptions.fit = 'cover';
  }
  let outputFile: Buffer;
  let createWebP = false;
  if (inputFileNameInfo.ext === 'png') {
    createWebP = true;
    outputFile = await sharp(inputFile)
      .resize(resizeOptions)
      .png({
        quality: data.options.quality ? data.options.quality : 70,
      })
      .toBuffer();
  } else if (
    inputFileNameInfo.ext === 'jpg' ||
    inputFileNameInfo.ext === 'jpeg'
  ) {
    createWebP = true;
    outputFile = await sharp(inputFile)
      .resize(resizeOptions)
      .jpeg({
        quality: data.options.quality ? data.options.quality : 70,
      })
      .toBuffer();
  }
  if (createWebP) {
    await FS.save(outputFile, outputPathParts);
    outputFile = await sharp(inputFile)
      .resize(resizeOptions)
      .webp({
        quality: data.options.quality ? data.options.quality : 70,
      })
      .toBuffer();
    const op = data.outputPath
      .replace('.png', '.webp')
      .replace('.jpg', '.webp')
      .replace('.jpeg', '.webp');
    await FS.save(outputFile, op.split('/'));
  }
}
