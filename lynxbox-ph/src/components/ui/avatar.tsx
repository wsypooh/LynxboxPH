import * as React from "react";
import Image from "next/image";

export function Avatar({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarImage({ className = "", alt = "", src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (!src) {
    // Return empty div instead of img to avoid warning when no src is provided
    return <div className={`aspect-square h-full w-full bg-gray-200 ${className}`} />;
  }
  
  // Filter out props that are incompatible with Next.js Image
  const { width, height, crossOrigin, decoding, fetchPriority, loading, ...imageProps } = props;
  
  return (
    <Image 
      className={`aspect-square h-full w-full ${className}`} 
      alt={alt} 
      src={src}
      {...imageProps}
      fill
      sizes="40px"
    />
  );
}

export function AvatarFallback({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`.trim()}
      {...props}
    />
  );
}
