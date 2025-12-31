'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Student } from "@/lib/types";
import { Pencil, Trash2, Mail, GraduationCap } from "lucide-react";

interface IdCardProps {
  user: User | Student;
  onEdit: (user: User | Student) => void;
  onDelete?: (userId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function IdCard({ user, onEdit, onDelete, selectable, selected, onSelect }: IdCardProps) {
  const isStudent = 'matricula' in user;
  const role = isStudent ? 'Estudiante' : (user as User).role;

  const getBadgeVariant = () => {
    if (isStudent) return "default";
    switch ((user as User).role) {
      case "director": return "destructive";
      case "orientador": return "secondary";
      case "profesor": return "outline";
      default: return "default";
    }
  };

  return (
    <Card className={`relative transition-all duration-200 ${selected ? 'ring-2 ring-primary shadow-lg border-primary/50' : ''}`}>
      {selectable && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
          />
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-semibold">{user.name}</h3>

          <Badge variant={getBadgeVariant()} className="capitalize mt-1">
            {role}
          </Badge>

          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {isStudent && (user as Student).matricula && (
              <div className="flex items-center gap-2 justify-center">
                <GraduationCap className="h-4 w-4" />
                <span>{(user as Student).matricula}</span>
              </div>
            )}
          </div>

        </div>
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
