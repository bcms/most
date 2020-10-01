import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import { Queueable } from './queueable';

export interface FSPrototype {
  save(data: string | Buffer, root: string[]): Promise<void>;
  mkdir(root: string[]): Promise<void>;
  read(root: string[]): Promise<Buffer>;
  exist(root: string[]): Promise<boolean>;
  deleteFile(root: string[]): Promise<void>;
  deleteDir(root: string[]): Promise<void>;
  readdir(root: string[]): Promise<string[]>;
  rename(oldRoot: string[], newRoot: string[]): Promise<void>;
}

function fsUtil(basePathParts: string[]): FSPrototype {
  const queueable = Queueable<void>('save');
  return {
    async save(data, root) {
      return await queueable.exec('save', 'free_one_by_one', async () => {
        const parts = [...basePathParts, ...root];
        let base: string = process.cwd();
        // tslint:disable-next-line: prefer-for-of
        for (let j = 0; j < parts.length; j = j + 1) {
          if (parts[j].indexOf('.') === -1 || parts[j].indexOf('..') !== -1) {
            base = path.join(base, parts[j]);
            try {
              if ((await util.promisify(fs.exists)(base)) === false) {
                await util.promisify(fs.mkdir)(base);
              }
            } catch (error) {
              // tslint:disable-next-line:no-console
              console.log(`Failed to create directory '${base}'`);
            }
          }
        }
        await util.promisify(fs.writeFile)(
          path.join(base, parts[parts.length - 1]),
          data,
        );
      });
    },
    async mkdir(root) {
      const parts = [...basePathParts, ...root];
      let base: string = process.cwd();
      // tslint:disable-next-line: prefer-for-of
      for (let j = 0; j < parts.length; j = j + 1) {
        if (parts[j].indexOf('.') === -1) {
          base = path.join(base, parts[j]);
          try {
            if ((await util.promisify(fs.exists)(base)) === false) {
              await util.promisify(fs.mkdir)(base);
            }
          } catch (error) {
            // tslint:disable-next-line:no-console
            console.log(`Failed to create directory '${base}'`);
          }
        }
      }
    },
    async read(root) {
      return await util.promisify(fs.readFile)(
        path.join(process.cwd(), ...basePathParts, ...root),
      );
    },
    async exist(root) {
      return await util.promisify(fs.exists)(
        path.join(process.cwd(), ...basePathParts, ...root),
      );
    },
    async deleteFile(root) {
      await util.promisify(fs.unlink)(
        path.join(process.cwd(), ...basePathParts, ...root),
      );
    },
    async deleteDir(root) {
      await fse.remove(path.join(process.cwd(), ...basePathParts, ...root));
    },
    async readdir(root) {
      return await util.promisify(fs.readdir)(
        path.join(process.cwd(), ...basePathParts, ...root),
      );
    },
    async rename(oldRoot, newRoot) {
      await util.promisify(fs.rename)(
        path.join(process.cwd(), ...oldRoot),
        path.join(process.cwd(), ...newRoot),
      );
    },
  };
}

export const FS = fsUtil(['bcms']);
