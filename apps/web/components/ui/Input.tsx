"use client";
import { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...rest }: Props) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input className={`input ${className}`} {...rest} />
    </div>
  );
}