// Small form controls used only by this tool's form. Styled to match the
// shared primitives in src/shell/ui.tsx (same border/bg/focus tokens) so
// they look native, without adding to the shared shell itself — nothing
// here is generic enough to belong there (single-line text/number inputs,
// a repeatable key/value row editor).

import type { ChangeEvent, ReactNode } from 'react';
import { Button } from '../shell/ui';

const inputClassName =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]';

export interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--color-fg)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'number';
}

export function TextField({ label, value, onChange, placeholder, hint, type = 'text' }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className={inputClassName}
      />
    </Field>
  );
}

export interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function CheckboxField({ label, checked, onChange, hint }: CheckboxFieldProps) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span className="flex flex-col">
        <span className="font-medium text-[var(--color-fg)]">{label}</span>
        {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
      </span>
    </label>
  );
}

export interface ListEditorColumn<T> {
  placeholder: string;
  getValue: (item: T) => string;
  setValue: (item: T, value: string) => T;
}

export interface ListEditorProps<T> {
  items: T[];
  columns: ListEditorColumn<T>[];
  onChange: (items: T[]) => void;
  makeEmpty: () => T;
  addLabel: string;
  emptyLabel: string;
}

/** A repeatable row editor for simple 2-field records (env vars, build args, labels). */
export function ListEditor<T>({ items, columns, onChange, makeEmpty, addLabel, emptyLabel }: ListEditorProps<T>) {
  const updateRow = (index: number, column: ListEditorColumn<T>, value: string) => {
    const next = items.slice();
    next[index] = column.setValue(next[index], value);
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-xs text-[var(--color-muted)]">{emptyLabel}</p>}
      {items.map((item, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          {columns.map((column, columnIndex) => (
            <input
              key={columnIndex}
              type="text"
              value={column.getValue(item)}
              placeholder={column.placeholder}
              onChange={(event) => updateRow(index, column, event.target.value)}
              className={`${inputClassName} min-w-0 flex-1 basis-24`}
            />
          ))}
          <Button variant="ghost" onClick={() => removeRow(index)} aria-label="Remove row">
            ✕
          </Button>
        </div>
      ))}
      <Button variant="ghost" className="self-start" onClick={() => onChange([...items, makeEmpty()])}>
        {addLabel}
      </Button>
    </div>
  );
}
