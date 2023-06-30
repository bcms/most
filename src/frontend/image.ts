import type { BCMSMediaParsed } from '@becomes/cms-client/types';
import type {
  BCMSImageHandler,
  BCMSMostImageProcessorProcessOptions,
} from '../types';
import { BCMSImageConfig } from './image-config';
import { Buffer } from 'buffer';

function optionsToString(options: BCMSMostImageProcessorProcessOptions) {
  const ops: string[] = [];
  if (options.position) {
    ops.push(`_p${options.position}`);
  }
  if (options.quality) {
    ops.push(`_q${options.quality}`);
  }
  if (options.sizes) {
    if (options.sizes.auto) {
      ops.push('_sa');
    } else if (options.sizes.exec) {
      ops.push(
        `_se${options.sizes.exec
          .map((e) => `${e.width}x${e.height ? e.height : 'a'}`)
          .join('-')}`,
      );
    } else if (options.sizes.steps) {
      ops.push(`_ss${options.sizes.steps}`);
    }
  }
  return ops.join('');
}

export function createBcmsImageHandler(
  media: BCMSMediaParsed,
  options?: BCMSMostImageProcessorProcessOptions,
  basePath?: string,
): BCMSImageHandler {
  if (!basePath) {
    basePath = '/bcms-media';
  }
  let parsable = true;
  if (!options) {
    options = {
      position: 'cover',
      sizes: {
        auto: true,
      },
    };
  }
  const mediaName = media.name.toLowerCase();
  if (
    !mediaName.endsWith('.jpg') &&
    !mediaName.endsWith('.jpeg') &&
    !mediaName.endsWith('.png')
  ) {
    parsable = false;
  }
  const aspectRatio = media.width / media.height;
  const optionString = optionsToString(options);
  const srcParts = media.src.split('.');
  const srcMain = srcParts.slice(0, srcParts.length - 1).join('.');
  const srcExt = srcParts[srcParts.length - 1];

  function closest(
    _width: number,
    ops?: BCMSMostImageProcessorProcessOptions,
  ): [number, number, number] {
    if (!ops) {
      ops = options as BCMSMostImageProcessorProcessOptions;
    }
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
    const width = _width * dpr;
    let delta = 100000;
    let bestI = 0;
    let wids: number[] = [];
    let heis: number[] = [];
    if (ops.sizes) {
      if (ops.sizes.exec) {
        for (let i = 0; i < ops.sizes.exec.length; i++) {
          const size = ops.sizes.exec[i];
          wids.push(size.width);
          if (size.height) {
            heis.push(size.height);
          } else {
            heis.push(size.width / aspectRatio);
          }
        }
      } else if (ops.sizes.auto) {
        wids = [350, 650, 900, 1200, 1920];
        heis = wids.map((e) => e / aspectRatio);
      } else if (ops.sizes.steps) {
        const widthStep = media.width / ops.sizes.steps;
        for (let i = 0; i <= ops.sizes.steps; i++) {
          wids.push(widthStep + widthStep * i);
        }
      }
    }
    for (let i = 0; i < wids.length; i = i + 1) {
      let d = width - wids[i];
      d = d < 0 ? -d : d;
      if (d < delta) {
        delta = d;
        bestI = i;
      }
    }
    return [bestI, wids[bestI], heis[bestI]];
  }
  const output = '/bcms-media';

  return {
    parsable,
    optionString,
    getSrcSet(ops) {
      if (BCMSImageConfig.localeImageProcessing && !parsable) {
        return [
          `${output}${media.src}`,
          `${output}${media.src}`,
          media.width,
          media.height,
          -1,
        ];
      }
      const [index, wid, hei] = closest(ops ? ops.width : 0);
      if (BCMSImageConfig.localeImageProcessing) {
        return [
          `${basePath}/${optionString}${srcMain}_${index}.webp`,
          `${basePath}/${optionString}${srcMain}_${index}.${srcExt}`,
          wid,
          hei,
          index,
        ];
      } else {
        const fileNameParts = media.name.split('.');
        return [
          `${BCMSImageConfig.cmsOrigin}/api/media/pip/${media._id}/bin/${
            BCMSImageConfig.publicApiKeyId
          }/${Buffer.from(
            `ops=${optionString}&idx=${index}&webp=true`,
          ).toString('hex')}/${fileNameParts
            .slice(0, fileNameParts.length - 1)
            .join('.')}.webp`,
          `${BCMSImageConfig.cmsOrigin}/api/media/pip/${media._id}/bin/${
            BCMSImageConfig.publicApiKeyId
          }/${Buffer.from(`ops=${optionString}&idx=${index}`).toString(
            'hex',
          )}/${media.name}`,
          wid,
          hei,
          index,
        ];
      }
    },
  };
}
