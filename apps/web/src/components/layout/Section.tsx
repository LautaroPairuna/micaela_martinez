// src/components/layout/Section.tsx
import * as React from 'react';

type Width = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'bleed';

type SectionBaseProps = {
  width?: Width;                  // default: 'lg'
  padY?: boolean | 'sm' | 'md' | 'lg' | 'xl'; // default: 'md'
  className?: string;
  innerClassName?: string;
  dividerTop?: boolean;
  dividerBottom?: boolean;
  bleedBackground?: React.ReactNode;
};

type SectionProps<C extends React.ElementType> =
  React.PropsWithChildren<SectionBaseProps & { as?: C }> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof SectionBaseProps | 'as' | 'children'>;

export function Section<C extends React.ElementType = 'section'>(props: SectionProps<C>) {
  const {
    as,
    width = 'lg',
    padY = 'md',
    className,
    innerClassName,
    dividerTop,
    dividerBottom,
    bleedBackground,
    children,
    ...rest
  } = props;

  const Tag = (as || 'section') as React.ElementType;

  const padClass =
    padY === false ? '' :
    padY === 'sm'   ? 'section-pad-y-sm' :
    padY === 'lg'   ? 'section-pad-y-lg' :
    padY === 'xl'   ? 'section-pad-y-xl' :
    padY === true   ? 'section-pad-y'    : // boolean true -> alias md
                      'section-pad-y-md';  // 'md' por defecto

  const base = cx(
    dividerTop && 'divider-top',
    dividerBottom && 'divider-bottom',
    padClass,
    className
  );

  const widthMap: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
    sm:  'container-fluid container-sm',
    md:  'container-fluid container-md',
    lg:  'container-fluid container-lg',
    xl:  'container-fluid container-xl',
    '2xl':'container-fluid container-2xl',
  };

  if (width === 'full') {
    return (
      <Tag className={base} {...rest}>
        <div className={cx('container-fluid', innerClassName)}>{children}</div>
      </Tag>
    );
  }

  if (width === 'bleed') {
    return (
      <Tag className={cx('section-bleed', base)} {...rest}>
        {bleedBackground && <div className="bleed-bg">{bleedBackground}</div>}
        <div className={cx('bleed-inner', innerClassName)}>{children}</div>
      </Tag>
    );
  }

  return (
    <Tag className={base} {...rest}>
      <div className={cx(widthMap[width], innerClassName)}>{children}</div>
    </Tag>
  );
}

/* util mínima para concatenar clases */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default Section;
