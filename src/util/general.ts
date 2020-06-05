import * as childProcess from 'child_process';

export class General {
  public static compareWithSchema(
    object: any,
    schema: any,
    level?: string,
  ): void {
    if (typeof level === 'undefined') {
      level = 'root';
    }
    if (typeof object === 'undefined') {
      throw new Error(`${level}: 'object' cannot be 'undefined'`);
    }
    if (typeof schema === 'undefined') {
      throw new Error(`${level}: 'schema' cannot be 'undefined'`);
    }
    for (const key in schema) {
      if (typeof object[key] === 'undefined') {
        if (schema[key].__required === true) {
          throw new Error(`${level}: Object is missing property '${key}'.`);
        }
      } else {
        if (object[key] instanceof Array) {
          if (schema[key].__type === 'array') {
            if (object[key].length > 0) {
              if (typeof object[key][0] === 'object') {
                if (schema[key].__child.__type !== 'object') {
                  throw new Error(
                    `${level}: Type mismatch at '${key}'. Expected '${schema[key].__child.__type}' but got 'object'.`,
                  );
                }
                // tslint:disable-next-line: forin
                for (const i in object[key]) {
                  this.compareWithSchema(
                    object[key][i],
                    schema[key].__child.__content,
                    level + `.${key}`,
                  );
                }
              } else {
                const checkType = object[key].find(
                  (e) => typeof e !== schema[key].__child.__type,
                );
                if (checkType) {
                  throw new Error(
                    `${level}: Type mismatch found in an array '${key}'. Expected '${
                      schema[key].__child.__type
                    }' but got a '${typeof checkType}'.`,
                  );
                }
              }
            }
          } else {
            throw new Error(
              `${level}: Type mismatch of property '${key}'. Expected 'object.array' but got '${typeof object[
                key
              ]}'.`,
            );
          }
        } else {
          if (typeof object[key] !== schema[key].__type) {
            throw new Error(
              `${level}: Type mismatch of property '${key}'. Expected '${
                schema[key].__type
              }' but got '${typeof object[key]}'.`,
            );
          }
          if (schema[key].__type === 'object') {
            this.compareWithSchema(
              object[key],
              schema[key].__child,
              level + `.${key}`,
            );
          }
        }
      }
    }
  }
  public static async exec(
    cmd: string,
    stdOutput?: (type: 'err' | 'out', data: string) => void,
  ) {
    return new Promise((resolve, reject) => {
      const proc = childProcess.exec(cmd);
      let err = '';
      if (stdOutput) {
        proc.stdout.on('data', (data) => {
          stdOutput('out', data);
        });
      }
      proc.stderr.on('data', (data) => {
        err += data;
        if (stdOutput) {
          stdOutput('err', data);
        }
      });
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(`Process exit with non-zero code.\n${err}`);
        } else {
          resolve();
        }
      });
    });
  }
}
