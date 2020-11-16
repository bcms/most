import { Prop, PropParsed } from '../prop';

export interface PropWidget {
  _id: string;
  props: Prop[];
}

export interface PropWidgetParsed {
  [key: string]: PropParsed;
}
