"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href: string;
  /** Dar sidebar: küçük kare alana sığdır */
  collapsed?: boolean;
  /** Navbar vs. sidebar genişliği */
  variant?: "sidebar" | "navbar" | "auth";
  className?: string;
};

export function BrandLogo({ href, collapsed, variant = "sidebar", className }: BrandLogoProps) {
  const size =
    variant === "auth"
      ? "h-auto w-full max-w-[min(100%,420px)] max-h-28 object-contain object-center"
      : variant === "navbar"
        ? "h-9 w-auto max-w-[min(100%,260px)] object-contain object-left md:h-10 md:max-w-[300px]"
        : collapsed
          ? "h-9 w-9 object-contain object-left"
          : "h-10 w-auto max-w-[200px] object-contain object-left";

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        className
      )}
      title="Cyprus International University — Uluslararası Kıbrıs Üniversitesi"
    >
      <Image
        src="/ciu-logo.png"
        alt="Cyprus International University — Uluslararası Kıbrıs Üniversitesi"
        width={420}
        height={112}
        priority={variant === "auth" || variant === "navbar"}
        className={cn("transition-all duration-300", size)}
      />
    </Link>
  );
}
