import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from 'react';

const HardLink = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<'a'>
>(function HardLink(props, ref) {
  return <a ref={ref} {...props} />;
});

export default HardLink;