'use client';

import * as React from 'react';
import { Trash2, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Group, User, Subject } from "@/lib/types";
import { addGroup, fetchGroups, deleteGroup, fetchUsers, addSubject, fetchSubjects, deleteSubject, updateGroup, updateSubject } from "@/lib/firebase/data";

export default function EstructuraPage() {
  const [groupList, setGroupList] = React.useState<Group[]>([]);
  const [staffList, setStaffList] = React.useState<User[]>([]);
  const [subjectList, setSubjectList] = React.useState<Subject[]>([]);
  const [cycleList, setCycleList] = React.useState<string[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);

  const [addGroupOpen, setAddGroupOpen] = React.useState(false);
  const [addCycleOpen, setAddCycleOpen] = React.useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = React.useState(false);
  const [editGroupOpen, setEditGroupOpen] = React.useState(false);
  const [editSubjectOpen, setEditSubjectOpen] = React.useState(false);

  const [newGroupSemester, setNewGroupSemester] = React.useState(1);
  const [newGroupIdentifier, setNewGroupIdentifier] = React.useState("A");
  const [newGroupCycleId, setNewGroupCycleId] = React.useState("");
  const [newGroupCounselorId, setNewGroupCounselorId] = React.useState("");
  
  const [newCycleName, setNewCycleName] = React.useState("");

  const [newSubjectName, setNewSubjectName] = React.useState("");
  const [newSubjectTeacherId, setNewSubjectTeacherId] = React.useState("");

  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [editingGroupIdentifier, setEditingGroupIdentifier] = React.useState("");
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);

  const { toast } = useToast();

  const counselorsList = staffList.filter((u) => u.role === "orientador");
  const teachersList = staffList.filter((u) => u.role === "profesor");

  const loadData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const [groupsData, users, subjectsData] = await Promise.all([fetchGroups(), fetchUsers(), fetchSubjects()]);
      setGroupList(groupsData);
      setStaffList(users);
      setSubjectList(subjectsData);
    } catch (error) {
      console.error("Error loading Firebase data", error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los datos del servidor.",
        variant: "destructive"
      });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const uniqueCycles = Array.from(new Set(groupList.map((group) => group.cycleId))).filter(Boolean);
    setCycleList(uniqueCycles);
    if (!newGroupCycleId && uniqueCycles.length > 0) {
      setNewGroupCycleId(uniqueCycles[0]);
    }
  }, [groupList, newGroupCycleId]);

  const handleCreateGroup = async () => {
    if (!newGroupSemester || !newGroupIdentifier || !newGroupCycleId || !newGroupCounselorId) {
      toast({ title: "Datos incompletos", description: "Por favor completa todos los campos del grupo.", variant: "destructive" });
      return;
    }

    const groupName = `Grado ${newGroupSemester} - ${newGroupIdentifier.toUpperCase()}`;

    try {
      await addGroup({
        name: groupName,
        cycleId: newGroupCycleId,
        counselorId: newGroupCounselorId,
        semester: Number(newGroupSemester),
      });
      toast({ title: "Grupo creado", description: `El grupo ${groupName} fue creado.` });
      setNewGroupSemester(1);
      setNewGroupIdentifier("A");
      setAddGroupOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "No se pudo crear", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    const groupName = `Grado ${editingGroup.semester} - ${editingGroupIdentifier.toUpperCase()}`;

    try {
      await updateGroup(editingGroup.id, {
        name: groupName,
        cycleId: editingGroup.cycleId,
        counselorId: editingGroup.counselorId,
        semester: Number(editingGroup.semester),
      });
      toast({ title: "Grupo actualizado", description: `El grupo ${groupName} fue actualizado.` });
      setEditGroupOpen(false);
      setEditingGroup(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "No se pudo actualizar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      toast({ title: "Grupo eliminado", description: "El grupo ya no aparece en el panel." });
      await loadData();
    } catch (error) {
      console.error("remove group error", error);
      toast({ title: "No se pudo eliminar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleCreateCycle = () => {
    if (!newCycleName) {
      toast({ title: "Datos incompletos", description: "Ingresa un nombre para el ciclo escolar.", variant: "destructive" });
      return;
    }
    setCycleList((prev) => Array.from(new Set([...prev, newCycleName])));
    setNewCycleName("");
    setAddCycleOpen(false);
    toast({ title: "Ciclo escolar creado", description: `El ciclo ${newCycleName} fue creado.` });
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName || !newSubjectTeacherId) {
      toast({ title: "Datos incompletos", description: "Por favor completa todos los campos de la materia.", variant: "destructive" });
      return;
    }
    try {
      await addSubject({ name: newSubjectName, teacherId: newSubjectTeacherId });
      toast({ title: "Materia creada", description: `La materia ${newSubjectName} fue creada.` });
      setNewSubjectName("");
      setNewSubjectTeacherId("");
      setAddSubjectOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "No se pudo crear", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    try {
      await updateSubject(editingSubject.id, { name: editingSubject.name, teacherId: editingSubject.teacherId });
      toast({ title: "Materia actualizada", description: `La materia ${editingSubject.name} fue actualizada.` });
      setEditSubjectOpen(false);
      setEditingSubject(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "No se pudo actualizar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    try {
      await deleteSubject(subjectId);
      toast({ title: "Materia eliminada", description: "La materia ya no aparece en el panel." });
      await loadData();
    } catch (error) {
      console.error("remove subject error", error);
      toast({ title: "No se pudo eliminar", description: "Intenta nuevamente.", variant: "destructive" });
    }
  };

  const openEditGroupModal = (group: Group) => {
    setEditingGroup(group);
    setEditingGroupIdentifier(group.name.split(' - ')[1] || '');
    setEditGroupOpen(true);
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estructura Escolar</CardTitle>
                  <CardDescription>Define ciclos académicos, semestres y grupos de estudiantes.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={addCycleOpen} onOpenChange={setAddCycleOpen}>
                    <DialogTrigger asChild><Button variant="secondary">Agregar Ciclo</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nuevo Ciclo Escolar</DialogTitle><DialogDescription>Escribe el nombre del ciclo escolar.</DialogDescription></DialogHeader>
                      <div className="space-y-2"><label className="block text-sm font-medium">Nombre del Ciclo</label><Input value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} placeholder="Ej. Ciclo 2025-2026"/></div>
                      <DialogFooter className="mt-4"><Button onClick={handleCreateCycle}>Guardar Ciclo</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                    <DialogTrigger asChild><Button>Agregar Grupo</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Crear Nuevo Grupo</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-sm font-medium">Ciclo Escolar</label><Select value={newGroupCycleId} onValueChange={setNewGroupCycleId}><SelectTrigger><SelectValue placeholder="Seleccionar ciclo" /></SelectTrigger><SelectContent>{cycleList.map((cycle) => (<SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>))}</SelectContent></Select></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><label className="block text-sm font-medium">Grado/Semestre</label><Select value={String(newGroupSemester)} onValueChange={(val) => setNewGroupSemester(Number(val))}><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5, 6].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><label className="block text-sm font-medium">Identificador de Grupo</label><Input value={newGroupIdentifier} onChange={(e) => setNewGroupIdentifier(e.target.value)} placeholder="Ej. A, B, 101"/></div>
                        </div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Orientador Encargado</label><Select value={newGroupCounselorId} onValueChange={setNewGroupCounselorId}><SelectTrigger><SelectValue placeholder="Seleccionar orientador" /></SelectTrigger><SelectContent>{counselorsList.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                      </div>
                      <DialogFooter className="mt-4"><Button onClick={handleCreateGroup} disabled={dataLoading}>Crear Grupo</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Orientador</TableHead><TableHead>Ciclo</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {groupList.map((group) => {
                    const counselor = staffList.find((u) => u.id === group.counselorId);
                    return (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{counselor?.name || "N/A"}</TableCell>
                        <TableCell>{group.cycleId || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditGroupModal(group)}><Pencil className="h-4 w-4" /><span className="sr-only">Editar</span></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveGroup(group.id)} disabled={dataLoading}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div><CardTitle>Materias</CardTitle><CardDescription>Gestiona las materias y sus asignaciones.</CardDescription></div>
                    <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
                        <DialogTrigger asChild><Button>Agregar Materia</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Nueva Materia</DialogTitle><DialogDescription>Ingresa la información de la materia.</DialogDescription></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2"><label className="block text-sm font-medium">Nombre de la materia</label><Input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Ej. Matematicas"/></div>
                                <div className="space-y-2"><label className="block text-sm font-medium">Profesor</label><Select value={newSubjectTeacherId} onValueChange={setNewSubjectTeacherId}><SelectTrigger><SelectValue placeholder="Seleccionar profesor" /></SelectTrigger><SelectContent>{teachersList.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
                            </div>
                            <DialogFooter className="mt-4"><Button onClick={handleCreateSubject} disabled={dataLoading}>Crear Materia</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Profesor</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {subjectList.map((subject) => {
                    const teacher = staffList.find((u) => u.id === subject.teacherId);
                    return (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{teacher?.name || "N/A"}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingSubject(subject); setEditSubjectOpen(true);}}><Pencil className="h-4 w-4" /><span className="sr-only">Editar</span></Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveSubject(subject.id)} disabled={dataLoading}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Group Modal */}
          <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Grupo</DialogTitle><DialogDescription>Actualiza la información del grupo.</DialogDescription></DialogHeader>
              {editingGroup && (
                <div className="space-y-4">
                    <div className="space-y-2"><label className="block text-sm font-medium">Ciclo Escolar</label><Select value={editingGroup.cycleId} onValueChange={(value) => setEditingGroup({...editingGroup, cycleId: value})}><SelectTrigger><SelectValue placeholder="Seleccionar ciclo" /></SelectTrigger><SelectContent>{cycleList.map((cycle) => (<SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>))}</SelectContent></Select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="block text-sm font-medium">Grado/Semestre</label><Select value={String(editingGroup.semester)} onValueChange={(val) => setEditingGroup({...editingGroup, semester: Number(val)})}><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5, 6].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Identificador de Grupo</label><Input value={editingGroupIdentifier} onChange={(e) => setEditingGroupIdentifier(e.target.value)} placeholder="Ej. A, B, 101"/></div>
                    </div>
                    <div className="space-y-2"><label className="block text-sm font-medium">Orientador</label><Select value={editingGroup.counselorId} onValueChange={(value) => setEditingGroup({...editingGroup, counselorId: value})}><SelectTrigger><SelectValue placeholder="Seleccionar orientador" /></SelectTrigger><SelectContent>{counselorsList.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                </div>
              )}
              <DialogFooter className="mt-4"><Button onClick={handleUpdateGroup} disabled={dataLoading}>Actualizar Grupo</Button></DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Edit Subject Modal */}
        <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Editar Materia</DialogTitle><DialogDescription>Actualiza la información de la materia.</DialogDescription></DialogHeader>
                {editingSubject && (
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-sm font-medium">Nombre de la materia</label><Input value={editingSubject.name} onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})} placeholder="Ej. Matematicas"/></div>
                        <div className="space-y-2"><label className="block text-sm font-medium">Profesor</label><Select value={editingSubject.teacherId} onValueChange={(value) => setEditingSubject({...editingSubject, teacherId: value})}><SelectTrigger><SelectValue placeholder="Seleccionar profesor" /></SelectTrigger><SelectContent>{teachersList.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
                    </div>
                )}
                <DialogFooter className="mt-4"><Button onClick={handleUpdateSubject} disabled={dataLoading}>Actualizar Materia</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
