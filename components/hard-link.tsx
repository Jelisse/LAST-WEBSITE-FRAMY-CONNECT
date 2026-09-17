import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const HardLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'>>(
  function HardLink({ children, ...props }, ref) {
    return (
      <a ref={ref} {...props}>
        {children}
      </a>
    );
  },
);

export default HardLink;
