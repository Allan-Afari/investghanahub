/**
 * Form Input Component for InvestGhanaHub
 * Reusable input field with label and error handling
 */

import { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export default function FormInput({
  label,
  error,
  helpText,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <div className="w-full">
      <label htmlFor={props.name} className="label">
        {label}
        {props.required && <span className="text-ghana-red-500 ml-1">*</span>}
      </label>
      <input
        id={props.name}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {helpText && !error && (
        <p className="text-xs text-dark-500 mt-1">{helpText}</p>
      )}
      {error && (
        <p className="text-sm text-ghana-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

