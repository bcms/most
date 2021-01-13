import * as childProcess from 'child_process';
import { ObjectSchema } from '../types';

export interface GeneralPrototype {
  object: {
    compareWithSchema<T>(object: T, schema: ObjectSchema, level?: string): void;
  };
  string: {
    getTextBetween(src: string, begin: string, end?: string): string;
    getAllTextBetween(src: string, begin: string, end: string): string[];
  };
  exec(
    cmd: string,
    output: (type: 'stdout' | 'stderr', chunk: string) => void,
    timeout?: number,
  ): Promise<void>;
}

function generalUtil(): GeneralPrototype {
  return {
    object: {
      compareWithSchema(object, schema, level?) {
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
                        schema[key].__child.__content as ObjectSchema,
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
                  schema[key].__child as ObjectSchema,
                  level + `.${key}`,
                );
              }
            }
          }
        }
      },
    },
    string: {
      getTextBetween(src, begin, end) {
        const startIndex = src.indexOf(begin);
        if (startIndex === -1) {
          return '';
        }
        const endIndex = end
          ? src.indexOf(end, startIndex + begin.length)
          : src.length;
        if (endIndex === -1) {
          return '';
        }
        return src.substring(startIndex + begin.length, endIndex);
      },
      getAllTextBetween(src, begin, end) {
        const output: string[] = [];
        const index = {
          begin: src.indexOf(begin, 0),
          end: 0,
        };
        if (index.begin === -1) {
          return [];
        }
        index.end = src.indexOf(end, index.begin);
        if (index.end === -1) {
          return [];
        }
        output.push(src.substring(index.begin + begin.length, index.end));
        // eslint-disable-next-line no-constant-condition
        while (true) {
          index.begin = src.indexOf(begin, index.end);
          if (index.begin === -1) {
            break;
          }
          index.end = src.indexOf(end, index.begin);
          if (index.end === -1) {
            break;
          }
          output.push(src.substring(index.begin + begin.length, index.end));
        }
        return output;
      },
    },
    async exec(cmd, output, timeout) {
      return await new Promise((resolve, reject) => {
        let timeoutTimer: NodeJS.Timeout;
        try {
          const proc = childProcess.exec(cmd);
          if (timeout) {
            timeoutTimer = setTimeout(() => {
              proc.kill();
              reject(Error('Execution killed because of timeout.'));
            }, timeout);
          }
          proc.stdout.on('data', (chunk) => {
            output('stdout', chunk);
          });
          proc.stderr.on('data', (chunk) => {
            output('stderr', chunk);
          });
          proc.on('close', (code) => {
            clearTimeout(timeoutTimer);
            if (code !== 0) {
              reject();
            } else {
              resolve();
            }
          });
        } catch (error) {
          clearTimeout(timeoutTimer);
          reject(error);
        }
      });
    },
  };
}

export const General = generalUtil();
