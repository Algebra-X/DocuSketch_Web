// src/components/ui/TooltipIcon.tsx
"use client";

import React, { FC, useId } from "react";
import { FaQuestion } from "react-icons/fa";

interface TooltipIconProps {
  text: string;
  size?: number;
  className?: string;
}

const TooltipIcon: FC<TooltipIconProps> = ({
  text,
  size = 16,
  className = "",
}) => {
  const tooltipId = useId();

  return (
    <div className={`tooltip ${className}`}>
      <button
        type="button"
        className="tooltip__trigger"
        aria-describedby={tooltipId}
      >
        <FaQuestion size={size} className="tooltip__icon" />
      </button>

      <div id={tooltipId} role="tooltip" className="tooltip__content">
        {text}
      </div>
    </div>
  );
};

export default TooltipIcon;
