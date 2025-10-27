"use client";
import React, {createContext, useContext, useMemo} from "react";

type TabsContextValue = {
  value: string;
  setValue?: (v: string) => void;
};

const TabsCtx = createContext<TabsContextValue>({ value: "" });

type TabsProps = React.PropsWithChildren<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
}>;

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const val = value ?? defaultValue ?? "";
  const ctx = useMemo(() => ({ value: val, setValue: onValueChange }), [val, onValueChange]);
  return (
    <TabsCtx.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`inline-flex rounded-lg bg-muted p-1 ${className}`.trim()}>{children}</div>;
}

export function TabsTrigger({ value, children, className = "" }: React.PropsWithChildren<{ value: string; className?: string }>) {
  const { value: current, setValue } = useContext(TabsCtx);
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setValue?.(value)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className = "", children }: React.PropsWithChildren<{ value: string; className?: string }>) {
  const { value: current } = useContext(TabsCtx);
  if (current !== value) return null;
  return <div className={className}>{children}</div>;
}
