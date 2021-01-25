// eslint-disable-next-line no-shadow
export enum MediaType {
  DIR = 'DIR',
  IMG = 'IMG',
  VID = 'VID',
  TXT = 'TXT',
  GIF = 'GIF',
  OTH = 'OTH',
  PDF = 'PDF',
  CODE = 'CODE',
  JS = 'JS',
  HTML = 'HTML',
  CSS = 'CSS',
  JAVA = 'JAVA',
  PHP = 'PHP',
  FONT = 'FONT',
}

export interface Media {
  _id: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  type: MediaType;
  mimetype: string;
  size: number;
  name: string;
  path: string;
  isInRoot: boolean;
  hasChildren: boolean;
  parentId: string;
}

export interface MediaResponse {
  data: Media;
  bin: () => Promise<ArrayBuffer>;
}

export interface MediaCache {
  hash: string;
  media: Media[];
}
