'use client';

import * as React from 'react';
import { PlusCircle, Search, CheckSquare, Square, Users } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import { fetchUsers, updateUser, fetchGroups, logActivity } from '@/lib/firebase/data';
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
  const [newStudentMatricula, setNewStudentMatricula] = React.useState("");
  const [newStudentGroupId, setNewStudentGroupId] = React.useState<string>("none");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterGroup, setFilterGroup] = React.useState("all");

  const { profile: currentUser } = useAuth();

  // Bulk assignment states
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
  const [bulkTargetGroup, setBulkTargetGroup] = React.useState<string>("none");

  const { toast } = useToast();
  const functions = getFunctions(undefined, 'us-central1');

  const loadData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const [allUsers, groupsData] = await Promise.all([fetchUsers(), fetchGroups()]);
      // Filter for students on the client side (including both synonyms)
      const studentsData = allUsers.filter(user => user.role === 'estudiante' || user.role === 'alumno');
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
        email: newStudentEmail.trim().toLowerCase(),
        role: 'estudiante',
        groupId: newStudentGroupId === 'none' ? undefined : newStudentGroupId,
        matricula: newStudentMatricula.trim() || undefined,
      });

      await loadData();
      toast({ title: "Alumno Creado", description: `Se ha creado el perfil para ${newStudentName}. Se ha enviado un correo para restablecer la contraseña.` });
      setAddStudentOpen(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentMatricula('');
      setNewStudentGroupId('none');
    } catch (error: any) {
      console.error("create student error", error);
      const code = error?.code || "";
      let description = "Hubo un error al registrar al alumno.";

      if (error?.message?.includes("already-exists") || code.includes("already-exists")) {
        description = "El correo electrónico ya está en uso por otro usuario.";
      } else if (code.includes("unauthenticated") || code.includes("permission-denied")) {
        description = "Solo un director autenticado puede crear alumnos. Inicia sesión nuevamente e inténtalo otra vez.";
      } else if (code.includes("failed-precondition") || code.includes("app-check")) {
        description = "La solicitud fue bloqueada por App Check. Registra la app web en App Check o añade NEXT_PUBLIC_RECAPTCHA_SITE_KEY para emitir tokens válidos.";
      }

      toast({ title: "No se pudo crear", description, variant: "destructive" });
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
        groupId: editingStudent.groupId || undefined,
        matricula: editingStudent.matricula || undefined
      });

      // REGISTRO DE LOG
      await logActivity({
        action: 'ALUMNO_ACTUALIZADO',
        details: `Actualización manual de perfil del alumno ${editingStudent.name}. Grupo: ${editingStudent.groupId || 'Ninguno'}`,
        targetId: editingStudent.id,
        targetType: 'user',
        createdBy: currentUser?.id || 'system',
        creatorName: currentUser?.name || 'Administrador',
        creatorRole: 'director'
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

  const handleBulkAssign = async () => {
    if (bulkTargetGroup === "none" || selectedStudents.length === 0) {
      toast({ title: "Atención", description: "Selecciona un grupo y al menos un alumno.", variant: "warning" });
      return;
    }

    setDataLoading(true);
    try {
      const batchUpdates = selectedStudents.map(id => updateUser(id, { groupId: bulkTargetGroup === 'none' ? undefined : bulkTargetGroup }));
      await Promise.all(batchUpdates);

      // REGISTRO DE LOG MASIVO
      await logActivity({
        action: 'ASIGNACION_MASIVA',
        details: `Se reasignaron ${selectedStudents.length} alumnos al grupo ${groupList.find(g => g.id === bulkTargetGroup)?.name || bulkTargetGroup}`,
        targetId: bulkTargetGroup,
        targetType: 'group',
        createdBy: currentUser?.id || 'system',
        creatorName: currentUser?.name || 'Administrador',
        creatorRole: 'director'
      });

      await loadData();
      toast({
        title: "Asignación Masiva Exitosa",
        description: `Se han movido ${selectedStudents.length} alumnos al grupo seleccionado.`
      });
      setBulkAssignOpen(false);
      setSelectedStudents([]);
      setBulkTargetGroup("none");
    } catch (error) {
      console.error("Bulk assign error", error);
      toast({ title: "Error", description: "No se pudo completar la asignación masiva.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
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
      // Filter by group
      const groupExists = groupList.some(g => g.id === student.groupId);
      const isUnassigned = !student.groupId || student.groupId === 'none' || student.groupId === '' || !groupExists;

      if (filterGroup === "unassigned" && !isUnassigned) {
        return false;
      }
      if (filterGroup !== "all" && filterGroup !== "unassigned" && student.groupId !== filterGroup) {
        return false;
      }
      // Filter by search term
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && !student.matricula?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [studentList, filterGroup, searchTerm]);

  // Contar alumnos sin grupo o con grupo inexistente
  const unassignedCount = React.useMemo(() => {
    return studentList.filter(s => {
      const groupExists = groupList.some(g => g.id === s.groupId);
      return !s.groupId || s.groupId === 'none' || s.groupId === '' || !groupExists;
    }).length;
  }, [studentList, groupList]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestionar Alumnos</CardTitle>
          <CardDescription>Crea y gestiona las cuentas de los alumnos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o matrícula..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSelectAll}
                title={selectedStudents.length === filteredStudents.length ? "Deseleccionar todos" : "Seleccionar todos"}
                className={selectedStudents.length > 0 ? "text-primary border-primary bg-primary/5" : ""}
              >
                {selectedStudents.length === filteredStudents.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {selectedStudents.length > 0 && (
                <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 animate-in fade-in zoom-in duration-200">
                      <Users className="h-4 w-4 mr-2" />
                      Reasignar {selectedStudents.length}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Asignación Masiva</DialogTitle>
                      <DialogDescription>
                        Mover {selectedStudents.length} alumnos seleccionados a un nuevo grupo.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Grupo Destino</label>
                        <Select value={bulkTargetGroup} onValueChange={setBulkTargetGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el grupo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin grupo</SelectItem>
                            {groupList.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancelar</Button>
                      <Button onClick={handleBulkAssign} disabled={bulkTargetGroup === "" || dataLoading}>
                        Confirmar Reasignación
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto"><PlusCircle className="h-4 w-4 mr-2" />Agregar Alumno</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Agregar Alumno</DialogTitle><DialogDescription>Ingresa la información del nuevo alumno.</DialogDescription></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><label className="block text-sm font-medium">Nombre Completo</label><Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Ej. Juan Pérez" /></div>
                    <div className="space-y-2"><label className="block text-sm font-medium">Matrícula (Opcional)</label><Input value={newStudentMatricula} onChange={(e) => setNewStudentMatricula(e.target.value)} placeholder="Ej. 20251234" /></div>
                    <div className="space-y-2"><label className="block text-sm font-medium">Correo electrónico</label><Input value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} placeholder="ejemplo@correo.com" type="email" /></div>
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
          </div>

          {/* Filtros de Grupo - Chips Elegantes */}
          <div className="flex gap-2 mb-6 pb-4 border-b flex-wrap">
            <button
              onClick={() => setFilterGroup('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${filterGroup === 'all'
                ? 'bg-[#8B1A2B] text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos <span className="ml-1.5 opacity-75">({studentList.length})</span>
            </button>
            {unassignedCount > 0 && (
              <button
                onClick={() => setFilterGroup('unassigned')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${filterGroup === 'unassigned'
                  ? 'bg-orange-600 text-white shadow-md scale-105'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
              >
                ⚠️ Sin Grupo <span className="ml-1.5 opacity-75">({unassignedCount})</span>
              </button>
            )}
            {groupList.map(group => {
              const count = studentList.filter(s => s.groupId === group.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={group.id}
                  onClick={() => setFilterGroup(group.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${filterGroup === group.id
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {group.name} <span className="ml-1.5 opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Banner informativo cuando se filtran alumnos sin grupo */}
          {filterGroup === 'unassigned' && (
            <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-orange-900">
                    Mostrando {filteredStudents.length} alumno(s) sin grupo asignado
                  </p>
                  <p className="text-sm text-orange-700">
                    Estos alumnos necesitan ser asignados a un grupo. Haz clic en "Editar" para asignarlos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredStudents.map(student => (
              <IdCard
                key={student.id}
                user={student}
                selectable
                selected={selectedStudents.includes(student.id)}
                onSelect={() => toggleSelectStudent(student.id)}
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
              <div className="space-y-2"><label className="block text-sm font-medium">Nombre</label><Input value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} placeholder="Nombre completo" /></div>
              <div className="space-y-2"><label className="block text-sm font-medium">Matrícula</label><Input value={editingStudent.matricula || ''} onChange={(e) => setEditingStudent({ ...editingStudent, matricula: e.target.value })} placeholder="Número de matrícula" /></div>
              <div className="space-y-2"><label className="block text-sm font-medium">Email</label><Input value={editingStudent.email} onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })} placeholder="Email" type="email" /></div>
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