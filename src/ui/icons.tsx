import type { SVGProps } from 'react';

/** Icon nét mảnh (stroke) dùng chung — kế thừa màu chữ qua currentColor. */
function Base({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      {children}
    </svg>
  );
}

export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Base>
);

export const IconDumbbell = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />
  </Base>
);

export const IconBook = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
  </Base>
);

export const IconPulse = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M3 12h4l2.2-5.5 4.2 11 2.4-5.5H21" />
  </Base>
);

export const IconMore = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </Base>
);

export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Base>
);

export const IconBack = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Base>
);

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const IconList = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Base>
);

export const IconNote = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Base>
);

export const IconLayers = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Base>
);

export const IconChat = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 5h16v11H9l-5 4V5Z" />
  </Base>
);

export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Base>
);

export const IconArchive = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 17v3h16v-3" />
  </Base>
);

export const IconInfo = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Base>
);

export const IconWifiOff = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.4M19 13a10 10 0 0 0-3-2M2 9.5a15 15 0 0 1 5-3M22 9.5A15 15 0 0 0 11 5.1" />
    <circle cx="12" cy="19.5" r="0.8" fill="currentColor" />
  </Base>
);
