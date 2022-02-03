import { PropParsed } from '@becomes/cms-client';
import { Prop } from './prop';

export interface PropGroupPointer {
  _id: string;
  items: Array<{
    props: Prop[];
  }>;
}

export interface PropGroupPointerParsed {
  [name: string]: PropParsed;
}
