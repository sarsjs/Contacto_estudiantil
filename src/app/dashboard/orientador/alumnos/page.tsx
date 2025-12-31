'use client';

import * as React from 'react';
import { PlusCircle, Search, HelpCircle, FileDown, Upload, Trash2, UserPlus, CheckSquare, Square, Users } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { fetchUsers, updateUser, fetchGroupsByCounselor, addStudent, logActivity } from '@/lib/firebase/data';
import { IdCard } from '@/components/dashboard/id-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function OrientadorAlumnosPage() {
    const { profile: currentUser } = useAuth();
    const [studentList, setStudentList] = React.useState<User[]>([]);
    const [groupList, setGroupList] = React.useState<Group[]>([]);
    const [dataLoading, setDataLoading] = React.useState(false);

    const [addStudentOpen, setAddStudentOpen] = React.useState(false);
    const [editStudentOpen, setEditStudentOpen] = React.useState(false);
    const [editingStudent, setEditingStudent] = React.useState<User | null>(null);

    const [newStudentName, setNewStudentName] = React.useState("");
    const [newStudentEmail, setNewStudentEmail] = React.useState("");
    const [newStudentMatricula, setNewStudentMatricula] = React.useState("");
    const [newStudentGroupId, setNewStudentGroupId] = React.useState<string>("");

    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterGroup, setFilterGroup] = React.useState("all");

    // Estados para asignación masiva
    const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
    const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
    const [bulkTargetGroup, setBulkTargetGroup] = React.useState<string>("");

    const [importing, setImporting] = React.useState(false);
    const [bulkResult, setBulkResult] = React.useState({ successCount: 0, errors: [] as string[] });
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const { toast } = useToast();
    const functions = getFunctions(undefined, 'us-central1');

    const loadData = React.useCallback(async () => {
        if (!currentUser?.id) return;
        setDataLoading(true);
        try {
            const [allUsers, counselorGroups] = await Promise.all([
                fetchUsers(),
                fetchGroupsByCounselor(currentUser.id)
            ]);

            const groupIds = counselorGroups.map(g => g.id);
            const visibleStudents = allUsers.filter(user => {
                const isStudent = user.role === 'estudiante' || user.role === 'alumno';
                const isUnassigned = !user.groupId || user.groupId === 'none' || user.groupId === '';
                const isMyGroup = groupIds.includes(user.groupId || '');
                return isStudent && (isMyGroup || isUnassigned);
            });

            setStudentList(visibleStudents);
            setGroupList(counselorGroups);
        } catch (error) {
            console.error("Error loading data", error);
            toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setDataLoading(false);
        }
    }, [currentUser, toast]);

    React.useEffect(() => { loadData() }, [loadData]);

    const handleCreateStudent = async () => {
        if (!newStudentName || !newStudentEmail || !newStudentGroupId) {
            toast({ title: "Datos incompletos", description: "Nombre, correo y grupo son obligatorios.", variant: "destructive" });
            return;
        }

        setDataLoading(true);
        try {
            await addStudent({
                name: newStudentName,
                email: newStudentEmail.trim().toLowerCase(),
                groupId: newStudentGroupId,
                matricula: newStudentMatricula.trim() || undefined,
                avatarUrl: `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(newStudentName)}`,
            });

            // REGISTRO DE LOG
            await logActivity({
                action: 'ALUMNO_CREADO',
                details: `Inscripción individual: ${newStudentName}. Grupo: ${groupList.find(g => g.id === newStudentGroupId)?.name || newStudentGroupId}`,
                targetId: newStudentEmail.trim().toLowerCase(),
                targetType: 'user',
                createdBy: currentUser?.id || 'system',
                creatorName: currentUser?.name || 'Orientador',
                creatorRole: 'orientador'
            });

            await loadData();
            toast({ title: "Alumno Registrado", description: `Se ha creado el perfil para ${newStudentName}.` });
            setAddStudentOpen(false);
            resetNewStudentForm();
        } catch (error: any) {
            toast({ title: "Error", description: "No se pudo registrar al alumno.", variant: "destructive" });
        } finally {
            setDataLoading(false);
        }
    };

    const resetNewStudentForm = () => {
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentMatricula('');
        setNewStudentGroupId('');
    };

    const handleUpdateStudent = async () => {
        if (!editingStudent) return;
        try {
            await updateUser(editingStudent.id, {
                name: editingStudent.name,
                email: editingStudent.email,
                groupId: editingStudent.groupId,
                matricula: editingStudent.matricula
            });

            // REGISTRO DE LOG
            await logActivity({
                action: 'ALUMNO_ACTUALIZADO',
                details: `Edición de perfil: ${editingStudent.name}.`,
                targetId: editingStudent.id,
                targetType: 'user',
                createdBy: currentUser?.id || 'system',
                creatorName: currentUser?.name || 'Orientador',
                creatorRole: 'orientador'
            });

            await loadData();
            toast({ title: "Actualizado", description: "Datos guardados correctamente." });
            setEditStudentOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
        }
    };

    const handleBulkAssign = async () => {
        if (!bulkTargetGroup || selectedStudents.length === 0) {
            toast({ title: "Atención", description: "Selecciona un grupo y al menos un alumno.", variant: "warning" });
            return;
        }

        setDataLoading(true);
        try {
            const batchUpdates = selectedStudents.map(id => updateUser(id, { groupId: bulkTargetGroup }));
            await Promise.all(batchUpdates);

            await loadData();

            // REGISTRO DE LOG
            await logActivity({
                action: 'ASIGNACION_MASIVA',
                details: `Se reasignaron ${selectedStudents.length} alumnos al grupo ${groupList.find(g => g.id === bulkTargetGroup)?.name || bulkTargetGroup}`,
                targetId: bulkTargetGroup,
                targetType: 'group',
                createdBy: currentUser?.id || 'system',
                creatorName: currentUser?.name || 'Orientador',
                creatorRole: 'orientador'
            });

            toast({
                title: "Asignación Masiva Exitosa",
                description: `Se han movido ${selectedStudents.length} alumnos al grupo seleccionado.`
            });
            setBulkAssignOpen(false);
            setSelectedStudents([]);
            setBulkTargetGroup("");
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

    // Bulk enrollment logic moved from main page
    const handleDownloadTemplate = () => {
        const template = 'name,email,groupId,matricula\nMaría López,mlopez@ejemplo.com,grado-1-1,2025001\nJuan Pérez,jperez@ejemplo.com,grado-1-1,2025002';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_alumnos_epo264.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setBulkResult({ successCount: 0, errors: [] });

        try {
            const content = await file.text();
            const rows = content.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
            if (rows.length <= 1) {
                toast({ title: "Archivo vacío", variant: "destructive" });
                return;
            }

            const header = rows[0].split(',').map(c => c.trim().toLowerCase());
            const idx = {
                name: header.indexOf('name'),
                email: header.indexOf('email'),
                group: header.indexOf('groupid'),
                matricula: header.indexOf('matricula')
            };

            if (idx.name < 0 || idx.email < 0 || idx.group < 0) {
                toast({ title: "Formato inválido", description: "Faltan columnas: name, email, groupId", variant: "destructive" });
                return;
            }

            let count = 0;
            const errs: string[] = [];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',').map(c => c.trim());
                try {
                    await addStudent({
                        name: cols[idx.name],
                        email: cols[idx.email],
                        groupId: cols[idx.group],
                        matricula: cols[idx.matricula] || undefined,
                        avatarUrl: `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(cols[idx.name])}`,
                    });
                    count++;
                } catch (e: any) {
                    errs.push(`Fila ${i + 1}: ${e.message || 'Error desconocido'}`);
                }
            }

            setBulkResult({ successCount: count, errors: errs });
            toast({ title: "Proceso terminado", description: `${count} alumnos procesados.` });

            if (count > 0) {
                await logActivity({
                    action: 'ALUMNO_IMPORTACION',
                    details: `Carga masiva: ${count} alumnos registrados mediante CSV.`,
                    targetId: 'bulk-import',
                    targetType: 'user',
                    createdBy: currentUser?.id || 'system',
                    creatorName: currentUser?.name || 'Orientador',
                    creatorRole: 'orientador'
                });
            }

            await loadData();
        } catch (e) {
            toast({ title: "Error al procesar", variant: "destructive" });
        } finally {
            setImporting(false);
        }
    };

    const filteredStudents = React.useMemo(() => {
        return studentList.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.matricula?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesGroup = true;
            const isUnassigned = !s.groupId || s.groupId === 'none' || s.groupId === '';
            if (filterGroup === "all") matchesGroup = true;
            else if (filterGroup === "unassigned") matchesGroup = isUnassigned;
            else matchesGroup = s.groupId === filterGroup;

            return matchesSearch && matchesGroup;
        });
    }, [studentList, searchTerm, filterGroup]);

    const unassignedCount = studentList.filter(s => !s.groupId || s.groupId === 'none' || s.groupId === '').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Alumnos</h1>
                    <p className="text-muted-foreground">Administra la inscripción y datos de tus estudiantes asignados.</p>
                </div>

                <div className="flex gap-2">
                    <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Inscripción Individual
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nueva Inscripción</DialogTitle>
                                <DialogDescription>Completa los datos para dar de alta a un alumno en el sistema.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nombre Completo</label>
                                    <Input placeholder="Ej. Juan Pérez" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Matrícula</label>
                                    <Input placeholder="Ej. 20251000" value={newStudentMatricula} onChange={e => setNewStudentMatricula(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Correo Institucional</label>
                                    <Input type="email" placeholder="alumno@escuela.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Grupo Destino</label>
                                    <Select value={newStudentGroupId} onValueChange={setNewStudentGroupId}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                                        <SelectContent>
                                            {groupList.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddStudentOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateStudent} disabled={dataLoading}>Registrar Alumno</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="list">Lista de Alumnos</TabsTrigger>
                    <TabsTrigger value="bulk">Alta Masiva (CSV)</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4 pt-4">
                    {/* Filtros de Grupo - Chips Elegantes */}
                    <div className="flex gap-2 mb-2 pb-4 border-b flex-wrap">
                        <button
                            onClick={() => setFilterGroup('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${filterGroup === 'all'
                                ? 'bg-primary text-white shadow-md scale-105'
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

                    {/* Banner informativo para alumnos sin grupo */}
                    {filterGroup === 'unassigned' && (
                        <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <p className="font-bold text-orange-900">
                                        Mostrando {filteredStudents.length} alumno(s) sin grupo asignado
                                    </p>
                                    <p className="text-sm text-orange-700">
                                        Selecciona los alumnos y usa el botón "Reasignar" para moverlos a un grupo de una sola vez.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <Card className="border-none shadow-sm bg-slate-50/50">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-96">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por nombre, email o matrícula..."
                                            className="pl-9 bg-white"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
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
                                                                {groupList.map(g => (
                                                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancelar</Button>
                                                    <Button onClick={handleBulkAssign} disabled={!bulkTargetGroup || dataLoading}>
                                                        Confirmar Reasignación
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                    <Select value={filterGroup} onValueChange={setFilterGroup}>
                                        <SelectTrigger className="w-full md:w-48 bg-white">
                                            <SelectValue placeholder="Todos los grupos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los grupos</SelectItem>
                                            {groupList.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {dataLoading ? (
                                <div className="text-center py-12 text-muted-foreground">Sincronizando expedientes...</div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">No se encontraron alumnos con los criterios seleccionados.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {filteredStudents.map(student => (
                                        <IdCard
                                            key={student.id}
                                            user={student}
                                            selectable
                                            selected={selectedStudents.includes(student.id)}
                                            onSelect={() => toggleSelectStudent(student.id)}
                                            onEdit={() => {
                                                setEditingStudent(student);
                                                setEditStudentOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bulk" className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg">Instrucciones</CardTitle>
                                <CardDescription>Pasos para registrar alumnos por lote.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                    <p className="text-sm">Descarga la plantilla CSV oficial.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                    <p className="text-sm">Completa los campos: nombre, email, groupId y matrícula.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                                    <p className="text-sm">Sube el archivo y revisa el reporte final.</p>
                                </div>
                                <Button variant="outline" className="w-full gap-2" onClick={handleDownloadTemplate}>
                                    <FileDown className="h-4 w-4" />
                                    Descargar Plantilla
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">Subir Archivo</CardTitle>
                                <CardDescription>Carga tus datos en formato CSV (delimitado por comas).</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-lg mx-6 bg-slate-50/50">
                                <Upload className="h-10 w-10 text-slate-300 mb-4" />
                                <p className="text-sm text-slate-500 mb-4">Solo archivos .csv permitidos</p>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importing}
                                    className="bg-slate-900"
                                >
                                    {importing ? "Procesando..." : "Seleccionar Archivo"}
                                </Button>
                                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                            </CardContent>
                            <CardFooter className="flex-col items-start gap-4">
                                {bulkResult.successCount > 0 && (
                                    <div className="w-full p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
                                        ✅ Importación exitosa: <strong>{bulkResult.successCount}</strong> alumnos registrados.
                                    </div>
                                )}
                                {bulkResult.errors.length > 0 && (
                                    <div className="w-full p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                                        <p className="font-bold mb-1">Errores encontrados ({bulkResult.errors.length}):</p>
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {bulkResult.errors.map((e, i) => <p key={i} className="text-xs">- {e}</p>)}
                                        </div>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Student Modal */}
            <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Estudiante</DialogTitle>
                        <DialogDescription>Actualiza el perfil o cambia de grupo al alumno.</DialogDescription>
                    </DialogHeader>
                    {editingStudent && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Matrícula</label>
                                <Input value={editingStudent.matricula || ''} onChange={e => setEditingStudent({ ...editingStudent, matricula: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Grupo</label>
                                <Select value={editingStudent.groupId} onValueChange={val => setEditingStudent({ ...editingStudent, groupId: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {groupList.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditStudentOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdateStudent}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
