'use client';

import { Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { TeamStats } from '../lib/api';

interface StatsCardsProps {
  stats: TeamStats | null;
  isLoading?: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Teams',
      value: stats?.total ?? 0,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Verified',
      value: stats?.verified ?? 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Pending',
      value: stats?.pending ?? 0,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'Rejected',
      value: stats?.rejected ?? 0,
      icon: XCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgColor} rounded-xl p-5 border border-zinc-200 dark:border-zinc-800`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mt-1" />
              ) : (
                <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>
                  {card.value}
                </p>
              )}
            </div>
            <div className={`p-3 ${card.color} rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
