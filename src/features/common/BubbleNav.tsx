'use client';

import { useRouter } from 'next/navigation';

const bubbles = [
  { title: 'Chat', emoji: '💬', link: '/chat' },
  { title: 'Kalender', emoji: '📅', link: '/calendar' },
  { title: 'Todo', emoji: '📝', link: '/todos' },
];

export default function BubbleNav({ active }: { active?: string }) {
  const router = useRouter();
  return (
    <div className="flex gap-4 justify-center mb-4">
      {bubbles.map((b) => (
        <button
          key={b.link}
          className={`flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-lg font-semibold transition
            ${active === b.title ? 'bg-purple-700 text-white scale-105' : 'bg-gray-100 text-black hover:bg-purple-200'}
          `}
          onClick={() => router.push(b.link)}
        >
          <span className="text-2xl mb-1">{b.emoji}</span>
          <span className="text-xs">{b.title}</span>
        </button>
      ))}
    </div>
  );
}
