"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { SecurityAlert, Student } from "@/lib/types";

export function SecurityAlerts({ alerts, students }: { alerts: SecurityAlert[], students: Student[] }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <div>
            <CardTitle>Alertas de Seguridad</CardTitle>
            <CardDescription>
              Notificaciones importantes sobre la seguridad de los estudiantes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => {
              const student = students.find((s) => s.id === alert.studentId);
              const isAuthorized = alert.type === 'authorized_exit';
              return (
                <TableRow key={alert.id} className={!isAuthorized ? "bg-destructive/10" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student?.avatarUrl} alt={student?.name} />
                        <AvatarFallback>{student?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student?.name || "Desconocido"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(alert.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>
                    <Badge variant={isAuthorized ? "secondary" : "destructive"}>
                      {isAuthorized ? <ShieldCheck className="mr-1 h-3 w-3" /> : <ShieldAlert className="mr-1 h-3 w-3" />}
                      {isAuthorized ? 'Autorizada' : 'No Autorizada'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {alert.details}
                    {alert.authorizationId && <span className="text-xs text-muted-foreground block">ID: {alert.authorizationId}</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
