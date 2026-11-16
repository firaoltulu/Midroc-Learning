import Box from '@mui/material/Box';
import type { ElementType, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

export function ScrollReveal({
  children,
  delay = 0,
  component = 'div',
}: {
  children: ReactNode;
  delay?: number;
  component?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [canAnimate] = useState(
    () =>
      typeof window !== 'undefined' &&
      'IntersectionObserver' in window &&
      !(
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ),
  );
  const [visible, setVisible] = useState(!canAnimate);

  useEffect(() => {
    const element = ref.current;
    if (!canAnimate || !element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.unobserve(entry.target);
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [canAnimate]);

  return (
    <Box
      component={component}
      ref={ref}
      sx={(theme) => ({
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: canAnimate
          ? theme.transitions.create(['opacity', 'transform'], {
              duration: theme.transitions.duration.standard,
              delay: visible ? delay : 0,
            })
          : 'none',
        '@media (prefers-reduced-motion: reduce)': {
          opacity: '1 !important',
          transform: 'none !important',
          transition: 'none !important',
        },
      })}
    >
      {children}
    </Box>
  );
}
