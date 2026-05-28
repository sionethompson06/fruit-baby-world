import type { ReactNode } from "react";

interface BrandTitleProps {
  children: ReactNode;
  variant?: "hero" | "section" | "small";
  as?: "h1" | "h2" | "h3" | "div";
  className?: string;
}

const variantClasses: Record<NonNullable<BrandTitleProps["variant"]>, string> = {
  hero: "brand-bubblegum-title brand-bubblegum-title--hero",
  section: "brand-bubblegum-title brand-bubblegum-title--section",
  small: "brand-bubblegum-title brand-bubblegum-title--small",
};

/**
 * Reusable public brand title wrapper.
 * Applies bubblegum 3D Margarine title classes.
 * BubblegumSvgFilters must be mounted globally (in layout) for the shine effect.
 */
export default function BrandTitle({
  children,
  variant = "section",
  as: Tag = "h2",
  className,
}: BrandTitleProps) {
  return (
    <Tag
      className={`${variantClasses[variant]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </Tag>
  );
}
