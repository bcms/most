import type { BCMSMediaParsed } from '@becomes/cms-client/types';
import type {
  BCMSImageHandler,
  BCMSMostImageProcessorProcessOptions,
} from '../types';

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
  basePath: string,
  media: BCMSMediaParsed,
  options?: BCMSMostImageProcessorProcessOptions,
): BCMSImageHandler {
  let parsable = true;
  if (!options) {
    options = {
      position: 'cover',
      sizes: {
        auto: true,
      },
    };
  }
  if (
    !media.name.endsWith('.jpg') &&
    !media.name.endsWith('.jpeg') &&
    !media.name.endsWith('.png')
  ) {
    parsable = false;
  }
  const optionString = optionsToString(options);
  const srcParts = media.src.split('.');
  const srcMain = srcParts.slice(0, srcParts.length - 1).join('.');
  const srcExt = srcParts[srcParts.length - 1];

  function closest(_width: number): number {
    const ops = options as BCMSMostImageProcessorProcessOptions;
    const width = _width * window.devicePixelRatio;
    let delta = 100000;
    let bestI = 0;
    let wids: number[] = [];
    if (ops.sizes) {
      if (ops.sizes.exec) {
        wids = ops.sizes.exec.map((e) => e.width);
      } else if (ops.sizes.auto) {
        wids = [350, 650, 900, 1200, 1920];
      } else if (ops.sizes.steps) {
        const widthStep = media.width / ops.sizes.steps;
        for (let i = 0; i <= ops.sizes; i++) {
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
    return bestI;
  }

  return {
    parsable,
    optionString,
    getSrcSet(ops) {
      if (!parsable) {
        return [`${basePath}${media.src}`, `${basePath}${media.src}`];
      }
      if (!ops) {
        return [
          `${basePath}/${optionString}${srcMain}_0.webp`,
          `${basePath}/${optionString}${srcMain}_0.${srcExt}`,
        ];
      } else {
        const index = closest(ops.width);
        return [
          `${basePath}/${optionString}${srcMain}_${index}.webp`,
          `${basePath}/${optionString}${srcMain}_${index}.${srcExt}`,
        ];
      }
    },
  };
}
