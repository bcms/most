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
  style?: React.CSSProperties;
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
