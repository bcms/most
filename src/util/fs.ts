import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

export class FS {
  private static basePath = process.cwd();

  public static async save(data, location) {
    const parts = location.split('/');
    let b = `${this.basePath}`;
    // tslint:disable-next-line: prefer-for-of
    for (let j = 0; j < parts.length; j = j + 1) {
      if (parts[j].indexOf('.') === -1) {
        b = path.join(b, parts[j]);
        try {
          if ((await util.promisify(fs.exists)(b)) === false) {
            await util.promisify(fs.mkdir)(b);
          }
        } catch (error) {
          Logger.error(`Failed to create directory '${b}'`);
        }
      }
    }
    await util.promisify(fs.writeFile)(
      path.join(b, parts[parts.length - 1]),
      data,
    );
  }
  public static async read(location: string) {
    return await util.promisify(fs.readFile)(
      path.join(this.basePath, location),
    );
  }
  public static async exist(location: string) {
    return await util.promisify(fs.exists)(path.join(this.basePath, location));
  }
}
