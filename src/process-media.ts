import * as crypto from 'crypto';
import * as sharp from 'sharp';
import Axios from 'axios';
import { General } from './util/general';
import { FS } from './util/fs';
import { MediaSizeMap } from './interfaces/config';

export class ProcessMedia {
  private static Security = {
    sign: (config) => {
      const data = {
        key: config.key.id,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(3).toString('hex'),
        signature: '',
      };
      let payloadAsString = '';
      if (typeof config.payload === 'object') {
        payloadAsString = Buffer.from(JSON.stringify(config.payload)).toString(
          'base64',
        );
      } else {
        payloadAsString = '' + config.payload;
      }
      data.signature = crypto
        .createHmac('sha256', config.key.secret)
        .update(
          data.nonce + data.timestamp + data.key + payloadAsString,
          config.key.secret,
        )
        .digest('hex');
      return data;
    },
  };
  private static formats = ['original', 'webp'];

  public static async now(media: {
    output: string;
    name: string;
    type: string;
    path: string;
    mimetype: string;
    sizeMap: MediaSizeMap[];
  }): Promise<void> {
    General.compareWithSchema(
      media,
      {
        output: {
          __type: 'string',
          __required: true,
        },
        name: {
          __type: 'string',
          __required: true,
        },
        type: {
          __type: 'string',
          __required: true,
        },
        path: {
          __type: 'string',
          __required: true,
        },
        mimetype: {
          __type: 'string',
          __required: true,
        },
        sizeMap: {
          __type: 'array',
          __required: true,
          __child: {
            __type: 'object',
            __content: {
              width: {
                __type: 'number',
                __required: true,
              },
              quality: {
                __type: 'number',
                __required: false,
              },
            },
          },
        },
      },
      'media',
    );
    const signature = this.Security.sign({
      key: {
        id: process.env.API_KEY,
        secret: process.env.API_SECRET,
      },
      payload: {},
    });
    const response = await Axios({
      url:
        `${process.env.API_ORIGIN}/media/file?path=${media.path}/${media.name}` +
        `&key=${signature.key}&nonce=${signature.nonce}` +
        `&timestamp=${signature.timestamp}&signature=${signature.signature}`,
      method: 'GET',
      responseType: 'arraybuffer',
    });
    if (media.type === 'IMG' && media.mimetype !== 'image/svg+xml') {
      for (const i in media.sizeMap) {
        const size = media.sizeMap[i];
        for (const j in this.formats) {
          const format = this.formats[j];
          let data: Buffer;
          const nameParts = media.name.split('.');
          const srcFormat = nameParts[nameParts.length - 1];
          let path = `${media.output}${media.path}/${nameParts
            .filter((e) => e !== srcFormat)
            .join('.')}-${size.width}.`;
          switch (format) {
            case 'original':
              {
                path = `${path}${srcFormat}`.replace(/\/\//g, '/');
                if (srcFormat === 'png') {
                  data = await sharp(response.data)
                    .resize({
                      width: size.width,
                      withoutEnlargement: true,
                    })
                    .png({ quality: size.quality ? size.quality : 50 })
                    .toBuffer();
                } else if (srcFormat === 'jpg' || srcFormat === 'jpeg') {
                  data = await sharp(response.data)
                    .resize({
                      width: size.width,
                      withoutEnlargement: true,
                    })
                    .jpeg({ quality: size.quality ? size.quality : 50 })
                    .toBuffer();
                }
              }
              break;
            case 'webp':
              {
                path = `${path}${format}`.replace(/\/\//g, '/');
                data = await sharp(response.data)
                  .resize({ width: size.width, withoutEnlargement: true })
                  .webp({ quality: 50 })
                  .toBuffer();
              }
              break;
          }
          await FS.save(data, path);
        }
      }
    }
    await FS.save(response.data, `${media.output}${media.path}/${media.name}`);
  }
}
