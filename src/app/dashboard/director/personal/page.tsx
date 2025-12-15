'use client';

import * as React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { fetchUsers, updateUser } from '@/lib/firebase/data';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { IdCard } from '@/components/dashboard/id-card';

// Definimos el tipo esperado para el rol de usuario
type UserRole = 'orientador' | 'profesor';

export default function PersonalPage() {
  const [staffList, setStaffList] = React.useState<User[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [editStaffOpen, setEditStaffOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<User | null>(null);

  const [newStaffName, setNewStaffName] = React.useState("");
  const [newStaffRole, setNewStaffRole] = React.useState<UserRole>("orientador");
  const [newStaffEmail, setNewStaffEmail] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const users = await fetchUsers();
      setStaffList(users);
    } catch (error) {
      console.error("Error loading Firebase data", error);
      toast({ title: "Error al cargar datos", description: "No se pudieron obtener los datos del servidor.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);


  const functions = getFunctions();

  const handleCreateStaff = async () => {
    if (!newStaffName || !newStaffRole || !newStaffEmail) {
      toast({ title: "Datos incompletos", description: "Por favor completa todos los campos.", variant: "destructive" });
      return;
    }
    setDataLoading(true);
    try {
      const createUser = httpsCallable(functions, 'createUser');

      await createUser({
        name: newStaffName,
        role: newStaffRole,
        email: newStaffEmail.trim().toLowerCase(),
      });

      toast({ title: "Personal añadido", description: `Se creó la cuenta para ${newStaffName} y se le envió un correo para establecer su contraseña.` });
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffRole("orientador");
      setAddStaffOpen(false);
      await loadData();
    } catch (error: any) {
      console.error("create staff error", error);
      const alreadyExists = error?.message?.includes('already-exists') || error?.code === 'already-exists' || error?.code === 'functions/already-exists';
      const description = alreadyExists
        ? 'El correo electrónico ya está en uso por otra cuenta. Elimina por completo el usuario anterior antes de re-registrarlo.'
        : 'Hubo un error al registrar. Verifica que el correo no esté en uso.';
      toast({ title: "No se pudo guardar", description, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;
    try {
        await updateUser(editingStaff.id, { name: editingStaff.name, role: editingStaff.role, email: editingStaff.email });
        toast({ title: "Personal actualizado", description: `Los datos de ${editingStaff.name} han sido actualizados.` });
        setEditStaffOpen(false);
        setEditingStaff(null);
        await loadData();
    } catch (error) {
        console.error("update staff error", error);
        toast({ title: "No se pudo actualizar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      const deleteUserFn = httpsCallable(functions, 'deleteUser');
      await deleteUserFn({ uid: staffId });
      toast({ title: "Personal eliminado", description: "La cuenta se eliminó de Firebase Auth y Firestore." });
      await loadData();
    } catch (error) {
      console.error("remove staff error", error);
      toast({ title: "No se pudo eliminar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const openEditModal = (user: User) => {
    setEditingStaff(user);
    setEditStaffOpen(true);
  }

  const filteredStaff = staffList.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Personal</CardTitle>
                <CardDescription>Crea y gestiona cuentas para profesores y orientadores.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="h-4 w-4 mr-2"/>Agregar Personal</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Agregar Personal</DialogTitle><DialogDescription>Ingresa la información del nuevo personal.</DialogDescription></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2"><label className="block text-sm font-medium">Nombre</label><Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Nombre completo"/></div>
                                <div className="space-y-2"><label className="block text-sm font-medium">Correo electrónico</label><Input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="Correo" type="email"/></div>
                                <div className="space-y-2"><label className="block text-sm font-medium">Rol</label><Select value={newStaffRole} onValueChange={(value) => setNewStaffRole(value as UserRole)}><SelectTrigger><SelectValue placeholder="Seleccionar Rol" /></SelectTrigger><SelectContent><SelectItem value="orientador">Orientador</SelectItem><SelectItem value="profesor">Profesor</SelectItem></SelectContent></Select></div>
                            </div>
                            <DialogFooter className="mt-4"><Button onClick={handleCreateStaff} disabled={dataLoading}>Guardar</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredStaff.map(user => (
                        <IdCard 
                            key={user.id}
                            user={user} 
                            onEdit={() => openEditModal(user)}
                            onDelete={() => handleRemoveStaff(user.id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Edit Staff Modal */}
        <Dialog open={editStaffOpen} onOpenChange={setEditStaffOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Editar Personal</DialogTitle><DialogDescription>Actualiza la información del personal.</DialogDescription></DialogHeader>
                {editingStaff && (
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-sm font-medium">Nombre</label><Input value={editingStaff.name} onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})} placeholder="Nombre completo"/></div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Correo electrónico</label><Input value={editingStaff.email} onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})} placeholder="Correo" type="email"/></div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Rol</label><Select value={editingStaff.role} onValueChange={(value) => setEditingStaff({...editingStaff, role: value as UserRole})}><SelectTrigger><SelectValue placeholder="Seleccionar Rol" /></SelectTrigger><SelectContent><SelectItem value="orientador">Orientador</SelectItem><SelectItem value="profesor">Profesor</SelectItem></SelectContent></Select></div>
                    </div>
                )}
                <DialogFooter className="mt-4"><Button onClick={handleUpdateStaff} disabled={dataLoading}>Actualizar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
