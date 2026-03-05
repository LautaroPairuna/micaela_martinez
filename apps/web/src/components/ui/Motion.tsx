'use client';

import { motion, HTMLMotionProps } from 'framer-motion';

interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  fullWidth?: boolean;
}

export function FadeIn({ 
  children, 
  delay = 0, 
  direction = 'up',
  fullWidth = false,
  className = '',
  ...props 
}: FadeInProps) {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
  };

  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </MotionDiv>
  );
}

export function StaggerContainer({ children, delay = 0, stagger = 0.1, className = '', ...props }: any) {
  const MotionDiv = motion.div as any;
  return (
    <MotionDiv
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </MotionDiv>
  );
}

export const ScaleIn = ({ children, delay = 0, className = '', ...props }: any) => {
  const MotionDiv = motion.div as any;
  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className={className}
      {...props}
    >
      {children}
    </MotionDiv>
  );
};
