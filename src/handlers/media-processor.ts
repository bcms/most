import * as sharp from 'sharp';
import { Media, MediaType } from '@becomes/cms-client';
import { BCMSMostConfigMedia, BCMSMostImageOptions } from '../types';
import { FS } from '@becomes/purple-cheetah/types';

const autoSizes = [350, 600, 900, 1200, 1400, 1920];

export async function BCMSMostMediaProcessor({
  media,
  config,
  fs,
}: {
  media: Media;
  config: BCMSMostConfigMedia;
  fs: FS;
}): Promise<void> {
  if (config.sizeMap) {
    if (media.type === MediaType.IMG) {
      const path: string[] = media.isInRoot
        ? ['..', ...config.output.split('/').filter((e) => !!e)]
        : [
            '..',
            ...config.output.split('/').filter((e) => !!e),
            ...media.path.split('/').filter((e) => !!e),
          ];
      const nmp = media.name.split('.');
      const nameParts = {
        name: nmp.slice(0, nmp.length - 1).join('.'),
        ext: nmp[nmp.length - 1].toLowerCase(),
      };
      for (const i in config.sizeMap) {
        const configOption = config.sizeMap[i];
        const fileName = `${nameParts.name}-${configOption.width}.${nameParts.ext}`;
        if (!(await fs.exist([...path, fileName].join('/'), true))) {
          const original = await fs.read([...path, media.name].join('/'));
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
            await fs.save([...path, fileName].join('/'), output);
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
            await fs.save([...path, fileName].join('/'), output);
          }
          if (createWebP) {
            output = await sharp(original)
              .resize({ width: configOption.width, withoutEnlargement: true })
              .webp({
                quality: configOption.quality ? configOption.quality : 50,
              })
              .toBuffer();
            await fs.save(
              [...path, `${nameParts.name}-${configOption.width}.webp`].join(
                '/',
              ),
              output,
            );
          }
        }
      }
    }
  }
}

export async function BCMSMostMediaImageProcessor({
  data,
  fs,
}: {
  data: {
    inputPath: string;
    outputPath: string;
    optionsRaw: string;
    options: BCMSMostImageOptions;
  };
  fs: FS;
}): Promise<void> {
  const inputPathParts = data.inputPath.split('/');
  if (!(await fs.exist(data.inputPath, true))) {
    if (!data.inputPath.endsWith('.webp')) {
      // eslint-disable-next-line no-console
      console.error('', `File does not exist: ${data.inputPath}`);
    }
    // eslint-disable-next-line no-console
    console.error('Input file does not exist', data.inputPath);
    return;
  }
  const inputFile = await fs.read(data.inputPath);
  const inputFileName = inputPathParts[inputPathParts.length - 1];
  const nmp = inputFileName.split('.');
  const inputFileNameInfo = {
    name: nmp.slice(0, nmp.length - 1).join('.'),
    ext: nmp[nmp.length - 1].toLowerCase(),
  };
  const resizeOptions: sharp.ResizeOptions = {};
  if (!data.options.sizes) {
    resizeOptions.width = autoSizes[data.options.sizeIndex];
    resizeOptions.withoutEnlargement = true;
  } else {
    const target = data.options.sizes[data.options.sizeIndex];
    if (!target) {
      // eslint-disable-next-line no-console
      console.error(
        '',
        `Size for index "${data.options.sizeIndex}" does not exist.`,
      );
      return;
    }
    resizeOptions.width = target.width;
    resizeOptions.height = target.height;
    resizeOptions.fit = 'cover';
  }
  let outputFile: Buffer | null = null;
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
    await fs.save(data.outputPath, outputFile as Buffer);
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
    await fs.save(op, outputFile);
  }
}
