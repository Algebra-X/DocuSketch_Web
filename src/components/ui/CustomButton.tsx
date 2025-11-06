// src/components/ui/CustomButton.tsx
import React from "react";
import { LucideIcon } from "lucide-react";

export type ButtonSize = "sm" | "md" | "lg" | "gg";
export type HoverColor = "green" | "blue" | "red" | "gray"| "pink";

interface ButtonProps {
  text: string;
  size?: ButtonSize;
  hoverColor?: HoverColor;
  onClick?: () => void;
  Icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
  /** ← Добавили */
  type?: "button" | "submit" | "reset";
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-2 px-4 text-sm",
  md: "py-3 px-8 text-base",
  lg: "py-4 px-10 text-lg",
  gg: "py-8 px-30 text-4xl",
};

const hoverClasses: Record<HoverColor, string> = {
  green: "hover:bg-green-600",
  blue: "hover:bg-blue-600",
  red: "hover:bg-red-600",
  gray: "hover:bg-gray-600",
  pink: "hover:bg-[#ff007c] hover:text-white",
};

export default function Button({
  text,
  size = "md",
  hoverColor = "green",
  onClick,
  Icon,
  className = "",
  disabled = false,
  type = "button",           
}: ButtonProps) {
  return (
    <button
      type={type}              
      onClick={onClick}
      disabled={disabled}
      className={
        `w-full ${sizeClasses[size]} rounded-2xl shadow-md transition duration-300 ease-in-out text-cream accent-background ` +
        `${hoverClasses[hoverColor]} ` +
        `${className} disabled:opacity-50`
      }
    >
      <div className="flex items-center justify-center space-x-2">
        <span>{text}</span>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
    </button>
  );
}
