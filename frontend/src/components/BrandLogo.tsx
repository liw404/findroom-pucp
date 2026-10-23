import React from 'react';

interface BrandLogoProps {
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ onClick, size = 'md' }) => {
  const iconDimension = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 text-left focus:outline-none group"
    >
      {/* Isotipo SVG minimalista de líneas geométricas (trazo de 1.5px) */}
      <div
        className={`${iconDimension} rounded-lg bg-[#0F2042] text-white flex items-center justify-center border border-slate-800 shadow-sm group-hover:bg-[#1D4ED8] transition-colors duration-150`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
        >
          <path
            d="M3 20H21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M5 20V8.5L12 4L19 8.5V20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 20V12.5H15V20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 9.25H15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`${textSize} font-semibold tracking-tight text-[#0F2042] group-hover:text-[#1D4ED8] transition-colors`}
        >
          FindRoom
        </span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/90">
          PUCP Campus
        </span>
      </div>
    </button>
  );
};

export default BrandLogo;
