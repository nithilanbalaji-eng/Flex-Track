import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4 [&>*]:w-full">{action}</div>}
    </div>
  );
}
