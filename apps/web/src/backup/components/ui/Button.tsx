"use client";

import Link from "next/link";
import type { Route } from "next";
import type { UrlObject } from "url";
import { ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: never;
  };

type ButtonAsLink = CommonProps & {
  href: Route | UrlObject;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(_props: ButtonProps) {
  const {
    children,
    className = "",
    loading = false,
    disabled = false,
  } = _props;

  const _size: Size = _props.size ?? "md";
  const _variant: Variant = _props.variant ?? "soft";

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };
  const variants: Record<Variant, string> = {
    primary: "text-white bg-[var(--rose)] hover:bg-[var(--rose-600)]",
    outline:
      "border border-[color:color-mix(in_oklab,var(--rose)_45%,white_5%)] " +
      "text-[color:color-mix(in_oklab,var(--rose)_85%,white_5%)] hover:bg-[var(--rose)]/15",
    ghost: "bg-transparent text-white/90 hover:bg-white/10",
    soft: "bg-white/[0.06] text-white hover:bg-white/[0.10] border border-white/10",
  };
  const cls = `${base} ${sizes[_size]} ${variants[_variant]} ${className}`;

  // RENDER COMO LINK
  if ("href" in _props) {
    const { href, onClick, target, rel } = _props as ButtonAsLink;
    return (
      <Link
        href={href}
        onClick={onClick}
        target={target}
        rel={rel}
        className={cls}
        aria-disabled={disabled || undefined}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin text-white/80" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
        )}
        {children}
      </Link>
    );
  }

  // RENDER COMO BUTTON (solo props nativos, sin propagar 'loading', 'variant', etc.)
  const {
    type = "button",
    onClick,
    onFocus,
    onBlur,
    onMouseDown,
    onMouseUp,
    onKeyDown,
    onKeyUp,
    autoFocus,
    name,
    value,
    form,
    formAction,
    formEncType,
    formMethod,
    formNoValidate,
    formTarget,
  } = _props as ButtonAsButton;

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      autoFocus={autoFocus}
      name={name}
      value={value}
      form={form}
      formAction={formAction}
      formEncType={formEncType}
      formMethod={formMethod}
      formNoValidate={formNoValidate}
      formTarget={formTarget}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin text-white/80" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
