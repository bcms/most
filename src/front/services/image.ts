import * as uuid from 'uuid';
import Axios from 'axios';
import { BCMSImageDeconstructedSrc, BCMSImageOptions } from '../types';

export interface BCMSImageServicePrototype {
  setServerPort(port: number): void;
  closest(width: number, set?: number[]): number;
  checkWebP(): boolean;
  parsable(src: string): boolean;
  toSmallest(src: string, maxWidth: number, minWidth?: number): string;
  getSizeIndex(
    element: HTMLImageElement,
    autoMaxWidth?: boolean,
    options?: BCMSImageOptions,
  ): number;
  parseOptions(options?: BCMSImageOptions): string;
  deconstructSrc(src: string): BCMSImageDeconstructedSrc;
  require(data: {
    options?: BCMSImageOptions;
    sizeIndex: number;
    element: HTMLImageElement | null;
    deconstructedSrc: BCMSImageDeconstructedSrc;
    autoMaxWidth?: boolean;
  }): Promise<number>;
  windowResizeSubscribe(callback: (event: Event) => void): () => void;
}

function imageService(): BCMSImageServicePrototype {
  const requiredUrls: string[] = [];
  const widths = [350, 600, 900, 1200, 1400, 1920];
  const resizeListeners: Array<{
    id: string;
    handler(event: Event): void;
  }> = [];
  const autoSizeIndexMap: {
    [width: string]: number;
  } = {
    '350': 0,
    '600': 1,
    '900': 2,
    '1200': 3,
    '1400': 4,
    '1920': 5,
  };
  let isWebPSupported: boolean;
  let serverPort = 8001;

  if (typeof window !== 'undefined') {
    let delay: NodeJS.Timeout;
    window.addEventListener('resize', (event) => {
      clearTimeout(delay);
      delay = setTimeout(() => {
        resizeListeners.forEach((e) => {
          e.handler(event);
        });
      }, 300);
    });
  }

  const self: BCMSImageServicePrototype = {
    setServerPort(port) {
      serverPort = port;
    },
    closest(width, set) {
      let delta = 100000;
      let bestI = 0;
      const wids = set ? set : widths;
      for (let i = 0; i < wids.length; i = i + 1) {
        let d = width - wids[i];
        d = d < 0 ? -d : d;
        if (d < delta) {
          delta = d;
          bestI = i;
        }
      }
      return wids[bestI];
    },
    checkWebP() {
      const elem = document.createElement('canvas');
      if (elem.getContext && elem.getContext('2d')) {
        isWebPSupported =
          elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } else {
        isWebPSupported = false;
      }
      return isWebPSupported;
    },
    parsable(ext) {
      return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? true : false;
    },
    toSmallest(src, maxWidth, minWidth?) {
      const srcParts = src.split('.');
      const name = srcParts.slice(0, srcParts.length - 1).join('.');
      let ext = srcParts[srcParts.length - 1];
      if (this.parsable(ext)) {
        if (typeof document !== 'undefined' && this.checkWebP()) {
          ext = 'webp';
        }
        const width = this.closest(maxWidth);
        return `${name}-${
          minWidth ? (width < minWidth ? this.closest(minWidth) : width) : width
        }.${ext}`;
      }
      return src;
    },
    getSizeIndex(element, autoMaxWidth, options) {
      if (
        !element ||
        !element.parentElement ||
        !element.parentElement.parentElement
      ) {
        console.log('No element');
        return 0;
      }
      const wid = self.closest(
        element.parentElement.parentElement.offsetWidth,
        options && options.sizes
          ? options.sizes.map((e) => e.width)
          : undefined,
      );
      if (autoMaxWidth) {
        element.style.setProperty('max-width', `${wid}px`);
      }
      if (options && options.sizes) {
        for (let i = 0; i < options.sizes.length; i++) {
          if (options.sizes[i].width === wid) {
            return i;
          }
        }
      }
      return autoSizeIndexMap['' + wid];
    },
    parseOptions(ops) {
      return ops
        ? [
            `_st${ops.step ? ops.step : 'a'}`,
            `_ps${ops.position ? ops.position : 'a'}`,
            `_ql${ops.quality ? ops.quality : 'a'}`,
            `_sz${
              ops.sizes
                ? ops.sizes
                    .map((size) => {
                      return `w${size.width}h${
                        size.height ? size.height : 'a'
                      }`;
                    })
                    .join('-')
                : 'a'
            }`,
          ].join('')
        : 'auto';
    },
    deconstructSrc(src) {
      const srcParts = src.split('.');
      const firstPart = srcParts
        .slice(0, srcParts.length - 1)
        .join('.')
        .replace('/media', '');
      const lastPart = srcParts[srcParts.length - 1];
      return {
        firstPart,
        lastPart,
      };
    },
    async require(data) {
      const parsable = self.parsable(data.deconstructedSrc.lastPart);
      if (parsable === false || !data.element) {
        return 0;
      }
      const opsParsed = self.parseOptions(data.options);
      try {
        const url = `http://localhost:${serverPort}/media/${opsParsed}${data.deconstructedSrc.firstPart}-${data.sizeIndex}.${data.deconstructedSrc.lastPart}`;
        if (requiredUrls.includes(url)) {
          return self.getSizeIndex(
            data.element,
            data.autoMaxWidth,
            data.options,
          );
        }
        await Axios({
          url,
          method: 'POST',
        });
        if (data.options && data.options.sizes) {
          for (let i = 0; i < data.options.sizes.length; i++) {
            requiredUrls.push(
              `http://localhost:${serverPort}/media/${opsParsed}${data.deconstructedSrc.firstPart}-${i}.${data.deconstructedSrc.lastPart}`,
            );
          }
        }
      } catch (error) {
        console.error(error);
        return 0;
      }
      return self.getSizeIndex(data.element, data.autoMaxWidth, data.options);
    },
    windowResizeSubscribe(callback) {
      const id = uuid.v4();
      resizeListeners.push({
        id,
        handler: callback,
      });
      return () => {
        for (let i = 0; i < resizeListeners.length; i++) {
          if (resizeListeners[i].id === id) {
            resizeListeners.splice(i, 1);
          }
        }
      };
    },
  };
  return self;
}

export const BCMSImageService = imageService();
