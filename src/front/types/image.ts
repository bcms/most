export interface BCMSImageOptions {
  step?: number;
  position?: 'fill';
  quality?: number;
  sizes?: Array<{
    width: number;
    height?: number;
  }>;
}
export interface BCMSImageDeconstructedSrc {
  firstPart: string;
  lastPart: string;
}
export interface BCMSGatsbyImageProps {
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
  src: string;
  alt: string;
  onClick?: () => void;
  autoMaxWidth?: boolean;
  options?: {
    step?: number;
    position?: 'fill';
    quality?: number;
    sizes?: Array<{
      width: number;
      height?: number;
    }>;
  };
}
