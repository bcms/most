import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { BCMSClient, BCMSMedia } from '@becomes/cms-client';
import { Config, PageParserNuxtOutput, MediaCache } from './interfaces';
import { Logger, FS, General, ErrorHandler } from './util';

interface MediaQueue {
  process: Array<{
    id: string;
    status: 'running' | 'done';
  }>;
  next: () =>
    | {
        file: BCMSMedia;
        bin: () => Promise<Buffer>;
      }
    | undefined;
}

export class BCMS {
  private Client: BCMSClient;
  private bcms: any = {};

  constructor(
    private readonly api?: {
      origin: string;
      key: string;
      secret: string;
    },
  ) {}

  /**
   * Will return CMS client that can be used for
   * communication with CMS API.
   */
  public async client(): Promise<BCMSClient> {
    if (this.Client) {
      return this.Client;
    } else {
      this.Client = await BCMSClient.instance(
        this.api.origin,
        {
          id: this.api.key,
          secret: this.api.secret,
        },
        false,
      );
      return this.Client;
    }
  }

  /**
   * Will return content of `bcms.cache.json`
   * file if present, otherwise will return
   * an empty object;
   */
  public async cache() {
    if (this.bcms && JSON.stringify(this.bcms) !== '{}') {
      return this.bcms;
    }
    if ((await FS.exist('/bcms.cache.json')) === false) {
      return {};
    }
    return JSON.parse((await FS.read('/bcms.cache.json')).toString());
  }

  /**
   * Pull entries from CMS and parse them
   * according to `bcms.config.js` file.
   */
  public async pullContent(): Promise<void> {
    Logger.info(`
    ---------------------
    - BCMS PULL CONTENT -
    ---------------------
    `);
    this.bcms = await this.cache();
    const contentChanges = {};
    const startTime = Date.now();
    const client = await this.client();
    const bcmsConfig: Config = await import(`${process.cwd()}/bcms.config.js`);
    if (typeof bcmsConfig === 'object' && bcmsConfig.entries instanceof Array) {
      for (const i in bcmsConfig.entries) {
        const config = bcmsConfig.entries[i];
        if (typeof config.name !== 'string') {
          throw ErrorHandler.throw(
            `Error in property "name" of element [${i}]. Expected "string" but got "${typeof config.name}"`,
          );
        }
        if (/[0-9a-z_-_]+/g.test(config.name) === false) {
          throw ErrorHandler.throw(
            `Name "${config.name}" property of element [${i}] does not match regex "[^0-9a-z_-_]+"`,
          );
        }
        if (typeof config.templateId !== 'string') {
          throw ErrorHandler.throw(
            `Error in property "templateId" of element [${i}]. Expected "string" but got "${typeof config.templateId}"`,
          );
        }
        Logger.info(`[${i}] ${config.name} ...`);
        const timeOffset = Date.now();
        if (config.parse === true) {
          const entries = await client
            .template(config.templateId)
            .entry()
            .getAllParsed();
        } else {
          this.bcms[config.name] = await client
            .template(config.templateId)
            .entry()
            .getAll();
        }
        if (typeof config.modify === 'function') {
          this.bcms[config.name] = await config.modify(this.bcms[config.name]);
        }
        Logger.info(
          `--- Time to response: ${(Date.now() - timeOffset) / 1000}s\n`,
        );
      }
    } else {
      Logger.error(bcmsConfig);
      throw ErrorHandler.throw(
        `Invalid configuration of "${process.cwd()}/bcms.config.js" file.`,
      );
    }
    await FS.save(JSON.stringify(this.bcms, null, '  '), '/bcms.cache.json');
    Logger.info(
      `Pull content completed in: ${(Date.now() - startTime) / 1000}s`,
    );
  }

  /**
   * Used for creating pages and page assets.
   */
  public async pageParser(createPage?: any, config?: Config): Promise<void> {
    if (!config) {
      config = await import(`${process.cwd()}/bcms.config.js`);
    }
    const startTime = Date.now();
    Logger.info(`
    ---------------------
    - BCMS PAGE PARSING -
    ---------------------
    `);
    const bcms = await this.cache();
    if (typeof config.pageParser === 'object') {
      if (config.pageParser.nuxt instanceof Array) {
        let output: PageParserNuxtOutput[] = [];
        for (const i in config.pageParser.nuxt) {
          const timeOffset = Date.now();
          const pageParserConfig = config.pageParser.nuxt[i];
          if (!bcms[pageParserConfig.entries]) {
            throw ErrorHandler.throw(
              `Entries for "${pageParserConfig.entries}" do not exist.`,
            );
          }
          Logger.info(
            `Parsing pages for: ${pageParserConfig.entries} - ${pageParserConfig.type}`,
          );
          if (pageParserConfig.type === 'single') {
            for (const j in bcms[pageParserConfig.entries]) {
              const o = await pageParserConfig.handler(
                bcms[pageParserConfig.entries][j],
                bcms[pageParserConfig.entries],
              );
              if (o) {
                if (o instanceof Array) {
                  for (const k in o) {
                    if (typeof o[k].output !== 'string') {
                      throw ErrorHandler.throw(
                        `Error in return type of "pageParser.nuxt[${i}"].handler.return[${k}]". ` +
                          `Expected property "output" to be "string" but got "${typeof o[
                            k
                          ].output}".`,
                      );
                    }
                  }
                  output = [...output, ...o];
                } else {
                  if (typeof o.output !== 'string') {
                    throw ErrorHandler.throw(
                      `Error in return type of "pageParser.nuxt[${i}"].handler.return". ` +
                        `Expected property "output" to be "string" but got "${typeof o.output}".`,
                    );
                  }
                  output.push(o);
                }
              }
            }
          } else {
            const o = await pageParserConfig.handler(
              bcms[pageParserConfig.entries],
            );
            if (o) {
              if (o instanceof Array) {
                for (const k in o) {
                  if (typeof o[k].output !== 'string') {
                    throw ErrorHandler.throw(
                      `Error in return type of "pageParser.nuxt[${i}"].handler.return[${k}]". ` +
                        `Expected property "output" to be "string" but got "${typeof o[
                          k
                        ].output}".`,
                    );
                  }
                }
                output = [...output, ...o];
              } else {
                if (typeof o.output !== 'string') {
                  throw ErrorHandler.throw(
                    `Error in return type of "pageParser.nuxt[${i}"].handler.return". ` +
                      `Expected property "output" to be "string" but got "${typeof o.output}".`,
                  );
                }
                output.push(o);
              }
            }
          }
          Logger.info(`--- Finished in ${(Date.now() - timeOffset) / 1000}s`);
        }
        for (const i in output) {
          if (typeof output[i].data === 'object') {
            await FS.save(
              `module.exports = ${JSON.stringify(output[i].data)}`,
              `/bcms-cache${
                output[i].output.startsWith('/')
                  ? output[i].output
                  : '/' + output[i].output
              }.js`,
            );
          }
        }
      } else if (config.pageParser.gatsby instanceof Array) {
        for (const i in config.pageParser.gatsby) {
          Logger.info(
            `[${i}] Creating page/s for "${config.pageParser.gatsby[i].page}"`,
          );
          const template = path.join(
            process.cwd(),
            'src',
            config.pageParser.gatsby[i].page,
          );
          await config.pageParser.gatsby[i].handler(createPage, template, bcms);
        }
      } else {
        throw ErrorHandler.throw(`No known framework.`);
      }
    } else {
      throw ErrorHandler.throw('Invalid configuration.');
    }
    Logger.info(`--- Time to parse pages: ${(Date.now() - startTime) / 1000}s`);
  }

  /**
   * Will return hash string of all media files
   * available on CMS. Useful for media caching.
   */
  public async getMediaHash() {
    const client = await this.client();
    const media = (await client.media.all()).filter(
      (e) => e.file.type !== 'DIR',
    );
    return crypto
      .createHash('sha256')
      .update(
        Buffer.from(
          JSON.stringify(
            media.map((e) => {
              return e.file;
            }),
          ),
        ).toString('base64'),
      )
      .digest('hex');
  }

  /**
   * Pull all media from CMS if needed. Check
   * caching media documentation for more information
   * about how to speed up builds by skipping necessary
   * pulling and processing of CMS media.
   */
  public async pullMedia(
    /** Allowed number of parallel workloads. */
    ppc?: number,
  ): Promise<void> {
    Logger.info(`
    -------------------
    - BCMS PULL MEDIA -
    -------------------
    `);
    const startTime = Date.now();
    const client = await this.client();
    const bcmsConfig: Config = await import(`${process.cwd()}/bcms.config.js`);
    if (!ppc) {
      if (bcmsConfig.media && bcmsConfig.media.ppc) {
        ppc = bcmsConfig.media.ppc;
      } else {
        ppc = os.cpus().length;
      }
    }
    if (typeof bcmsConfig.media !== 'object') {
      throw ErrorHandler.throw(
        `Missing "media" configuration in ${process.cwd()}/bcms.config.js`,
      );
    }
    if (typeof bcmsConfig.media.output !== 'string') {
      throw ErrorHandler.throw(
        `Invalid value for property "media.output" in configuration. ` +
          `Expected "string" but got "${typeof bcmsConfig.media.output}".`,
      );
    }
    const media = (await client.media.all()).filter(
      (e) => e.file.type !== 'DIR',
    );
    let pullMedia = true;
    let mediaCache: MediaCache = {
      hash: '',
      media: [],
      timestamp: 0,
    };
    const mediaToDownloadAndProcess: Array<{
      file: BCMSMedia;
      bin: () => Promise<Buffer>;
    }> = [];
    {
      const hash = crypto
        .createHash('sha256')
        .update(
          Buffer.from(
            JSON.stringify(
              media.map((e) => {
                return e.file;
              }),
            ),
          ).toString('base64'),
        )
        .digest('hex');
      if ((await FS.exist('/bcms-media.cache.json')) === true) {
        mediaCache = JSON.parse(
          (await FS.read('/bcms-media.cache.json')).toString(),
        );
      }
      if (mediaCache.hash === hash) {
        pullMedia = false;
      } else {
        mediaCache.timestamp = Date.now();
        mediaCache.hash = hash;
        if (!mediaCache.media) {
          mediaCache.media = [];
        }
        media.forEach((e) => {
          const m = mediaCache.media.find((t) => t._id === e.file._id);
          if (!m) {
            mediaToDownloadAndProcess.push(e);
          }
        });
        mediaCache.media = media.map((e) => {
          return e.file;
        });
      }
    }
    if (pullMedia === true) {
      if (bcmsConfig.media.process === true) {
        if (!bcmsConfig.media.sizeMap) {
          bcmsConfig.media.sizeMap = [
            {
              width: 350,
            },
            {
              width: 600,
            },
            {
              width: 1200,
            },
            {
              width: 1920,
            },
          ];
        } else {
          General.compareWithSchema(
            { data: bcmsConfig.media.sizeMap },
            {
              data: {
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
            'config.media.sizeMap',
          );
        }
      }
      const queue: MediaQueue = {
        process: [],
        next: () => {
          return mediaToDownloadAndProcess.length > 0
            ? mediaToDownloadAndProcess.pop()
            : undefined;
        },
      };
      await new Promise((resolve, reject) => {
        for (let i = 0; i < ppc; i = i + 1) {
          const id = crypto.randomBytes(16).toString('hex');
          queue.process.push({
            id,
            status: 'running',
          });
          this.processMedia(bcmsConfig, queue)
            .then(() => {
              queue.process[i].status = 'done';
              if (!queue.process.find((e) => e.status === 'running')) {
                resolve();
              }
            })
            .catch((error) => {
              reject(error);
            });
        }
      });
    }
    await FS.save(
      JSON.stringify(mediaCache, null, '  '),
      '/bcms-media.cache.json',
    );
    Logger.info(`Pull media completed in: ${(Date.now() - startTime) / 1000}s`);
  }

  private async processMedia(config: Config, queue: MediaQueue) {
    while (true) {
      const media = queue.next();
      if (!media) {
        break;
      }
      Logger.info(
        `[${media.file.path}/${media.file.name}] ` + 'Pulling and saving',
      );
      if (config.media.process === true) {
        try {
          await General.exec(
            `bcms-ssgf --process-media ${Buffer.from(
              JSON.stringify({
                output: config.media.output,
                name: media.file.name,
                type: media.file.type,
                path: media.file.path,
                mimetype: media.file.mimetype,
                sizeMap: config.media.sizeMap,
              }),
            ).toString('base64')}`,
            (type, data) => {
              process.stdout.write(data);
            },
          );
        } catch (error) {
          if (config.media.failOnError === true) {
            throw error;
          } else {
            Logger.error(`[${media.file.path}/${media.file.name}] ${error}`);
          }
        }
      } else {
        try {
          const data = await media.bin();
          await FS.save(
            data,
            path.join(config.media.output, media.file.path, media.file.name),
          );
          Logger.info(
            `[${media.file.path}/${
              media.file.name
            }] Saved at: ${process.cwd()}/${path.join(
              config.media.output,
              media.file.path,
              media.file.name,
            )}`,
          );
        } catch (error) {
          if (config.media.failOnError === true) {
            throw error;
          } else {
            Logger.error(`[${media.file.path}/${media.file.name}] ${error}`);
          }
        }
      }
    }
  }

  /**
   * Will start parallel parsing and processing of
   * media parsed to it. If `process` flag is provided
   * if the configuration file and set to `true`,
   * library `sharp` will be used to transform and compress
   * images according to the configuration.
   */
  private async parseMedia(
    config: Config,
    pointer: number,
    media: Array<{
      file: BCMSMedia;
      bin: () => Promise<Buffer>;
    }>,
    ppc: number,
  ): Promise<number> {
    let pointerTo = pointer + ppc;
    if (pointerTo >= media.length) {
      pointerTo = media.length;
    }
    const done = [];
    return new Promise((resolve, reject) => {
      for (let i = pointer; i < pointerTo; i = i + 1) {
        if (i < media.length) {
          Logger.info(
            `[${i}] ` +
              'Pulling and saving: ' +
              `${media[i].file.path}/${media[i].file.name}`,
          );
          if (config.media.process === true) {
            General.exec(
              `bcms-ssgf --process-media ${Buffer.from(
                JSON.stringify({
                  output: config.media.output,
                  name: media[i].file.name,
                  type: media[i].file.type,
                  path: media[i].file.path,
                  mimetype: media[i].file.mimetype,
                  sizeMap: config.media.sizeMap,
                }),
              ).toString('base64')}`,
              (type, data) => {
                process.stdout.write(data);
              },
            )
              .then(() => {
                done.push(true);
                if (done.length === pointerTo - pointer) {
                  resolve(pointerTo);
                }
              })
              .catch((error) => {
                if (config.media.failOnError === true) {
                  reject(error);
                } else {
                  Logger.error(`[${i}] ${error}`);
                  done.push(true);
                  if (done.length === pointerTo - pointer) {
                    resolve(pointerTo);
                  }
                }
              });
          } else {
            media[i]
              .bin()
              .then(async (data) => {
                await FS.save(
                  data,
                  path.join(
                    config.media.output,
                    media[i].file.path,
                    media[i].file.name,
                  ),
                );
                Logger.info(
                  `[${i}] Saved at: ${process.cwd()}/${path.join(
                    config.media.output,
                    media[i].file.path,
                    media[i].file.name,
                  )}`,
                );
                done.push(true);
                if (done.length === pointerTo - pointer) {
                  resolve(pointerTo);
                }
              })
              .catch((error) => {
                if (config.media.failOnError === true) {
                  reject(error);
                } else {
                  Logger.error(`[${i}] ${error}`);
                  done.push(true);
                  if (done.length === pointerTo - pointer) {
                    resolve(pointerTo);
                  }
                }
              });
          }
        }
      }
    });
  }

  /**
   * Will call functions from the configuration file and
   * place responses in `bcms.cache.json` file.
   */
  public async callFunctions() {
    Logger.info(`
    -----------------------
    - BCMS CALL FUNCTIONS -
    -----------------------
    `);
    this.bcms = await this.cache();
    this.bcms.__functions = {};
    const startTime = Date.now();
    const client = await this.client();
    const bcmsConfig: Config = await import(`${process.cwd()}/bcms.config.js`);
    if (
      typeof bcmsConfig === 'object' &&
      bcmsConfig.functions instanceof Array
    ) {
      for (const i in bcmsConfig.functions) {
        const timeOffset = Date.now();
        const func = bcmsConfig.functions[i];
        const name = func.name.replace(/-/g, '_');
        Logger.info(`[${i}] Calling function "${func.name}"`);
        this.bcms.__functions[name] = await client.fn(
          func.name,
          func.payload ? func.payload : undefined,
        );
        if (typeof func.modify === 'function') {
          this.bcms.__functions[name] = await func.modify(
            this.bcms.__functions[name],
          );
        }
        Logger.info(
          `--- Function call completed in ${(Date.now() - timeOffset) / 1000}s`,
        );
      }
    } else {
      throw ErrorHandler.throw('Invalid configuration for "functions".');
    }
    await FS.save(JSON.stringify(this.bcms, null, '  '), '/bcms.cache.json');
    Logger.info(
      `Call functions completed in: ${(Date.now() - startTime) / 1000}s`,
    );
  }
}
