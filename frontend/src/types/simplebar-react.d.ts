declare module 'simplebar-react' {
  import { ComponentType, HTMLAttributes } from 'react';

  interface SimpleBarProps extends HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    options?: {
      autoHide?: boolean;
      scrollbarMinSize?: number;
      scrollbarMaxSize?: number;
      direction?: 'rtl' | 'ltr';
      forceVisible?: boolean | 'x' | 'y';
      clickOnTrack?: boolean;
      scrollIntoView?: boolean;
    };
    scrollableNodeProps?: HTMLAttributes<HTMLDivElement>;
    tag?: keyof JSX.IntrinsicElements;
  }

  const SimpleBar: ComponentType<SimpleBarProps>;
  export default SimpleBar;
}
