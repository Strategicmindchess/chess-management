'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, digit: string) {
    const digits = value.padEnd(length, ' ').split('');
    digits[index] = digit;
    onChange(digits.join('').replace(/\s+$/, ''));
  }

  function handleChange(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-12 rounded-lg border border-slate-300 text-center text-lg font-semibold text-slate-900',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          )}
        />
      ))}
    </div>
  );
}
