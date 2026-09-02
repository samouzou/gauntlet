import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <circle cx="11" cy="16" r="6.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="21" cy="16" r="6.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="11" cy="16" r="2" fill="currentColor" />
      <circle cx="21" cy="16" r="2" fill="currentColor" />
      <path
        d="M14.5 11.5h3M14.5 20.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
