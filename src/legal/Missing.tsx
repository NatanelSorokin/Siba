import type { ReactNode } from 'react';

/** Visible marker for a required business detail that hasn't been filled in yet. */
export function Missing({ label }: { label: string }) {
  return (
    <mark className="rounded-md bg-sun-200 px-1.5 py-0.5 text-[0.9em] font-semibold text-ink-900 [box-decoration-break:clone]">
      [יש להשלים: {label}]
    </mark>
  );
}

/** Renders the value, or the "missing" marker when it is empty. */
export function req(value: string, label: string): ReactNode {
  return value.trim() ? value : <Missing label={label} />;
}
