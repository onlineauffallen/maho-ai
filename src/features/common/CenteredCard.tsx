// src/features/common/CenteredCard.tsx
'use client';

export default function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      {children}
    </div>
  );
}
