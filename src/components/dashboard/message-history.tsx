'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchMessages } from '@/lib/firebase/data';
import type { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper to safely convert a Firestore Timestamp or other date formats
const toDate = (timestamp: any): Date => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        // Handle Firestore Timestamp object
        return timestamp.toDate();
    }
    // Fallback for strings, numbers, or standard Date objects
    return new Date(timestamp);
};

function getRecipientText(recipient: string) {
    switch (recipient) {
        case 'all':
            return 'Para Todos';
        case 'teachers':
            return 'Solo Maestros';
        case 'counselors':
            return 'Solo Orientadores';
        case 'students':
            return 'Solo Alumnos';
        default:
            return 'Desconocido';
    }
}

export function MessageHistory() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const fetchedMessages = await fetchMessages();
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Error loading messages", error);
        toast({
          title: "Error al cargar comunicados",
          description: "No se pudieron obtener los mensajes del servidor.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Comunicados</CardTitle>
        <CardDescription>Aquí puedes ver los últimos mensajes enviados.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p>Aún no se han enviado mensajes.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="p-4 border rounded-md">
                <p className="text-sm text-gray-800 dark:text-gray-200">{msg.content}</p>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                        {getRecipientText(msg.recipientFilter)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(toDate(msg.timestamp), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
