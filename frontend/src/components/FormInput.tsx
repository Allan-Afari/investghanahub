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
    <div className="w-full mb-4">
      <label htmlFor={props.name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {props.required && <span className="text-ghana-red-500 ml-1">*</span>}
      </label>
      <input
        id={props.name}
        className={`
          w-full px-4 py-2 border rounded-md shadow-sm text-gray-900
          focus:ring-2 focus:ring-ghana-gold-500 focus:border-ghana-gold-500
          ${error ? 'border-ghana-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-ghana-red-600">{error}</p>
      )}
    </div>
  );
}

