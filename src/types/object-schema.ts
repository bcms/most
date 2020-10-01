export interface ObjectPropSchema {
  __type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
  __required: boolean;
  __child?:
    | {
        __type?: 'string' | 'number' | 'boolean' | 'object' | 'function';
        __content?: ObjectSchema;
      }
    | ObjectSchema;
}

export interface ObjectSchema {
  [key: string]: ObjectPropSchema;
}
