"use client";
import * as React from "react";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

export function Form({ children, ...props }: React.PropsWithChildren<Record<string, any>>) {
  // The shadcn/ui pattern spreads the form methods onto <Form />
  return <FormProvider {...(props as any)}>{children}</FormProvider>;
}

export function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>
) {
  return <Controller {...props} />;
}

export function FormItem({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-2 ${className}`.trim()} {...props} />;
}

export function FormLabel({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`.trim()} {...props} />;
}

export function FormControl({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}

export function FormDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-muted-foreground ${className}`.trim()} {...props} />;
}

export function FormMessage({ className = "", children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { formState } = useFormContext();
  // This simple version does not auto-bind to a field; consumer renders errors manually if needed.
  return (
    <p className={`text-sm text-destructive ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}
