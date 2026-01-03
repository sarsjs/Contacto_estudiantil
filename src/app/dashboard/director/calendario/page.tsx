'use client';

import * as React from 'react';
import { CalendarPanel } from '@/components/dashboard/calendar-panel';
import { useAuth } from '@/context/auth-context';

export default function CalendarioPage() {
  const { profile } = useAuth();
  const resolvedRole = profile?.role ?? 'director';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendario Escolar</h1>
        <p className="text-muted-foreground">
          Consulta eventos oficiales y tu agenda personal.
        </p>
      </div>
      <CalendarPanel role={resolvedRole} />
    </div>
  );
}
