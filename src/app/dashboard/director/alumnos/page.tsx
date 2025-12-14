'use client';

import * as React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';
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
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { User, Group } from '@/lib/types';
import { fetchUsers, updateUser, fetchGroups } from '@/lib/firebase/data';
import { IdCard } from '@/components/dashboard/id-card';

export default function AlumnosPage() {
  const [studentList, setStudentList] = React.useState<User[]>([]); // Changed from Student[] to User[]
  const [groupList, setGroupList] = React.useState<Group[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  
  const [addStudentOpen, setAddStudentOpen] = React.useState(false);
  const [editStudentOpen, setEditStudentOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<User | null>(null); // Changed from Student to User

  const [newStudentName, setNewStudentName] = React.useState("");
  const [newStudentEmail, setNewStudentEmail] = React.useState("");
  const [newStudentGroupId, setNewStudentGroupId] = React.useState<string>("none");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterGroup, setFilterGroup] = React.useState("all");

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const [allUsers, groupsData] = await Promise.all([fetchUsers(), fetchGroups()]);
      // Filter for students on the client side
      const studentsData = allUsers.filter(user => user.role === 'estudiante');
      setStudentList(studentsData);
      setGroupList(groupsData);
    } catch (error) {
      console.error("Error loading Firebase data", error);
      toast({ title: "Error al cargar datos", description: "No se pudieron obtener los datos del servidor.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { loadData() }, [loadData]);

  const handleCreateStudent = async () => {
    if (!newStudentName || !newStudentEmail) {
      toast({
        title: "Datos incompletos",
        description: "El nombre y el correo son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setDataLoading(true);
    try {
      const createUser = httpsCallable(functions, 'createUser');
      await createUser({
        name: newStudentName,
        email: newStudentEmail,
        role: 'estudiante',
        groupId: newStudentGroupId === 'none' ? undefined : newStudentGroupId,
      });

      await loadData();
      toast({ title: "Alumno Creado", description: `Se ha creado el perfil para ${newStudentName}. Se ha enviado un correo para restablecer la contraseña.` });
      setAddStudentOpen(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentGroupId('none');
    } catch (error: any) {
      console.error("create student error", error);
      const message = error.message.includes("already-exists") 
        ? "El correo electrónico ya está en uso por otro usuario."
        : "Hubo un error al registrar al alumno.";
      toast({ title: "No se pudo crear", description: message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    try {
      await updateUser(editingStudent.id, {
        name: editingStudent.name,
        email: editingStudent.email,
        // @ts-ignore
        groupId: editingStudent.groupId || undefined
      });
      await loadData();
      toast({ title: "Alumno actualizado", description: `Los datos de ${editingStudent.name} fueron actualizados.` });
      setEditStudentOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error(error);
      toast({ title: "No se pudo actualizar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const deleteUser = httpsCallable(functions, 'deleteUser');
      await deleteUser({ uid: studentId });
      toast({ title: "Alumno eliminado", description: "El alumno ha sido eliminado del sistema." });
      await loadData();
    } catch (error) {
      console.error("remove student error", error);
      toast({ title: "No se pudo eliminar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const openEditModal = (student: User) => { // Changed from Student to User
    setEditingStudent(student);
    setEditStudentOpen(true);
  };

  const filteredStudents = React.useMemo(() => {
    return studentList.filter(student => {
        // @ts-ignore
        if (filterGroup !== "all" && student.groupId !== filterGroup) {
            return false;
        }
        if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        return true;
    });
  }, [studentList, filterGroup, searchTerm]);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Alumnos</CardTitle>
                <CardDescription>Crea y gestiona las cuentas de los alumnos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex-1 w-full">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nombre..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <Select value={filterGroup} onValueChange={setFilterGroup}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por grupo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los grupos</SelectItem>
                                {groupList.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full md:w-auto"><PlusCircle className="h-4 w-4 mr-2"/>Agregar Alumno</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Agregar Alumno</DialogTitle><DialogDescription>Ingresa la información del nuevo alumno.</DialogDescription></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2"><label className="block text-sm font-medium">Nombre Completo</label><Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Ej. Juan Pérez"/></div>
                                <div className="space-y-2"><label className="block text-sm font-medium">Correo electrónico</label><Input value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} placeholder="ejemplo@correo.com" type="email"/></div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Asignar Grupo (Opcional)</label>
                                    <Select value={newStudentGroupId} onValueChange={setNewStudentGroupId}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin grupo</SelectItem>
                                            {groupList.map(group => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="mt-4"><Button onClick={handleCreateStudent} disabled={dataLoading}>Crear Alumno</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredStudents.map(student => (
                        <IdCard 
                            key={student.id}
                            user={student} 
                            onEdit={() => openEditModal(student)}
                            onDelete={() => handleRemoveStudent(student.id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Edit Student Modal */}
        <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Editar Alumno</DialogTitle><DialogDescription>Actualiza la información del alumno.</DialogDescription></DialogHeader>
                {editingStudent && (
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-sm font-medium">Nombre</label><Input value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} placeholder="Nombre completo"/></div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Email</label><Input value={editingStudent.email} onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})} placeholder="Email" type="email"/></div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Grupo</label>
                            <Select 
                                // @ts-ignore
                                value={editingStudent.groupId || 'none'} 
                                // @ts-ignore
                                onValueChange={(value) => setEditingStudent({ ...editingStudent, groupId: value === 'none' ? undefined : value })}                            
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin grupo</SelectItem>
                                    {groupList.map(group => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                <DialogFooter className="mt-4"><Button onClick={handleUpdateStudent} disabled={dataLoading}>Actualizar Alumno</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}