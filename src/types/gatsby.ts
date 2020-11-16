export type GatsbyCreatePage<T> = (data: {
  component: string;
  path: string;
  context?: T;
}) => void;
