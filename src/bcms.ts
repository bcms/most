import * as path from 'path';
import { BCMSClient, BCMSMedia } from '@becomes/cms-client';
import { ErrorHandler } from './util/error';
import { Logger } from './util/logger';
import { FS } from './util/fs';
import { General } from './util/general';
import { Config, PageParserNuxtOutput } from './interfaces/config';

export class BCMS {
  private Client: BCMSClient;
  private bcms: any = {};

  constructor(
    private api: {
      origin: string;
      key: string;
      secret: string;
    },
  ) {}

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

  public async cache() {
    if (this.bcms && JSON.stringify(this.bcms) !== '{}') {
      return this.bcms;
    }
    if ((await FS.exist('/bcms.cache.json')) === false) {
      return {};
    }
    return JSON.parse((await FS.read('/bcms.cache.json')).toString());
  }

  public async pullContent(): Promise<void> {
    Logger.info(`
    ---------------------
    - BCMS PULL CONTENT -
    ---------------------
    `);
    this.bcms = await this.cache();
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
          this.bcms[config.name] = await client
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
      throw ErrorHandler.throw(
        `Invalid configuration of "${process.cwd()}/bcms.config.js" file.`,
      );
    }
    await FS.save(JSON.stringify(this.bcms, null, '  '), '/bcms.cache.json');
    Logger.info(
      `Pull content completed in: ${(Date.now() - startTime) / 1000}s`,
    );
    await this.pageParser(bcmsConfig);
    Logger.info(
      `Total time for pulling content and parsing pages: ${
        (Date.now() - startTime) / 1000
      }s`,
    );
  }

  public async pageParser(config?: Config, createPage?: any): Promise<void> {
    if (!config) {
      config = await import(`${process.cwd()}/bcms.config.js`);
    }
    const bcms = await this.cache();
    if (typeof config.pageParser === 'object') {
      if (config.pageParser.nuxt instanceof Array) {
        let output: PageParserNuxtOutput[] = [];
        for (const i in config.pageParser.nuxt) {
          const pageParserConfig = config.pageParser.nuxt[i];
          if (!bcms[pageParserConfig.entries]) {
            throw ErrorHandler.throw(
              `Entries for "${pageParserConfig.entries}" do not exist.`,
            );
          }
          if (pageParserConfig.type === 'single') {
            for (const j in bcms[pageParserConfig.entries]) {
              const o = await pageParserConfig.handler(
                bcms[pageParserConfig.entries][j],
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
      }
    }
  }

  public async pullMedia(
    /** Allowed number of parallel workloads. */
    ppc?: number,
  ): Promise<void> {
    Logger.info(`
    -------------------
    - BCMS PULL MEDIA -
    -------------------
    `);
    if (!ppc) {
      ppc = 1;
    }
    const startTime = Date.now();
    const client = await this.client();
    const bcmsConfig: Config = await import(`${process.cwd()}/bcms.config.js`);
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
    let pointer = 0;
    while (pointer < media.length) {
      try {
        pointer = await this.parseMedia(bcmsConfig, pointer, media, ppc);
      } catch (error) {
        if (bcmsConfig.media.failOnError === true) {
          throw ErrorHandler.throw(error);
        } else {
          Logger.error(error);
          pointer = pointer + ppc;
        }
      }
    }
    Logger.info(`Pull media completed in: ${(Date.now() - startTime) / 1000}s`);
  }

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
      for (let i = pointer; i < pointerTo; i = i + i) {
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
              )}`,
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
}
