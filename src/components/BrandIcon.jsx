import React, { useId } from 'react';

export default function BrandIcon({ size = 36 }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `brand-bg-${uid}`;
  const leafId = `brand-leaf-${uid}`;
  const warmId = `brand-warm-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Scraps2Snacks"
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20291d" />
          <stop offset="1" stopColor="#10130f" />
        </linearGradient>
        <linearGradient id={leafId} x1="20" y1="17" x2="43" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#35c184" />
          <stop offset="1" stopColor="#3d9b63" />
        </linearGradient>
        <linearGradient id={warmId} x1="41" y1="14" x2="52" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2b544" />
          <stop offset="1" stopColor="#e4572e" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="10" fill={`url(#${bgId})`} />
      <rect x="3.75" y="3.75" width="56.5" height="56.5" rx="9.25" stroke="#f7f8f2" strokeOpacity="0.14" strokeWidth="1.5" />
      <path
        d="M16 34.5h32c-1 10.3-7.8 17-16 17s-15-6.7-16-17Z"
        fill="#f7f8f2"
      />
      <path
        d="M15 33.2c0-2.6 2.1-4.7 4.7-4.7h24.6c2.6 0 4.7 2.1 4.7 4.7v1.6H15v-1.6Z"
        fill="#ffffff"
      />
      <path
        d="M24 39.4c2.1 2.5 4.8 3.8 8 3.8s5.9-1.3 8-3.8"
        stroke="#3d9b63"
        strokeWidth="2.75"
        strokeLinecap="round"
        opacity="0.36"
      />
      <path
        d="M30.4 29.2c-3.3-6.7-1-13.7 6-18.2 3.7 7.1 1.4 14.5-6 18.2Z"
        fill={`url(#${leafId})`}
      />
      <path
        d="M31.1 28.2c1.2-4.5 3-8.1 5.5-10.9"
        stroke="#eaffdf"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.64"
      />
      <path
        d="M22 24.5c3.6-.1 6.6 2.3 7.7 6-4.2.7-7.4-1.9-7.7-6Z"
        fill="#3d9b63"
      />
      <path
        d="M18 27c-.3-5.4 3.2-9.1 9-9.8"
        stroke="#f2b544"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.1 6"
      />
      <path
        d="m46.3 13.5 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5 1.6-3.3Z"
        fill={`url(#${warmId})`}
      />
    </svg>
  );
}
