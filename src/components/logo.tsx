import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M13 19l-4-4-4 4" />
      <path d="M13 5l-4 4-4-4" />
      <path d="M7 19V5" />
      <path d="M21 19V5" />
    </svg>
  );
}
