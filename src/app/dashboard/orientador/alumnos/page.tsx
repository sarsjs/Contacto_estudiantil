'use client';

import * as React from 'react';
import { PlusCircle, Search, HelpCircle, FileDown, Upload, Trash2, UserPlus } from 'lucide-react';
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
import { fetchUsers, updateUser, fetchGroupsByCounselor, addStudent } from '@/lib/firebase/data';
import { IdCard } from '@/components/dashboard/id-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            const assignedStudents = allUsers.filter(user =>
                user.role === 'estudiante' && groupIds.includes(user.groupId || '')
            );

            setStudentList(assignedStudents);
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
            await loadData();
            toast({ title: "Actualizado", description: "Datos guardados correctamente." });
            setEditStudentOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
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
            const matchesGroup = filterGroup === "all" || s.groupId === filterGroup;
            return matchesSearch && matchesGroup;
        });
    }, [studentList, searchTerm, filterGroup]);

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
                    <Card className="border-none shadow-sm bg-slate-50/50">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre, email o matrícula..."
                                        className="pl-9 bg-white"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
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
                                            onEdit={() => {
                                                setEditingStudent(student);
                                                setEditStudentOpen(true);
                                            }}
                                        // Counselors can't delete from IdCard but we keep the prop for consistency, 
                                        // or we can omit it to hide the delete button.
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
