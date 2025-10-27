import * as React from "react";

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

export function AvatarImage({ className = "", alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={`aspect-square h-full w-full ${className}`.trim()} alt={alt} {...props} />;
}

export function AvatarFallback({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`.trim()}
      {...props}
    />
  );
}
