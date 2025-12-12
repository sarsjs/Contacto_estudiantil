"use client"

import * as React from "react";
import { School, Users, User as UserIcon, FolderKanban, Trash2 } from "lucide-react";
import { StatCard } from "./stat-card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { SecurityAlerts } from "./security-alerts";
import type { Group, SecurityAlert, User, UserRole, Student } from "@/lib/types";
import { addUser, fetchUsers, deleteUser, addGroup, fetchGroups, fetchSecurityAlerts, fetchStudents, deleteGroup } from "@/lib/firebase/data";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

export function DirectorView() {
  const [staffList, setStaffList] = React.useState<User[]>([]);
  const [studentList, setStudentList] = React.useState<Student[]>([]);
  const [securityAlerts, setSecurityAlerts] = React.useState<SecurityAlert[]>([]);
  const [groupList, setGroupList] = React.useState<Group[]>([]);
  const [cycleList, setCycleList] = React.useState<string[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);

  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [addGroupOpen, setAddGroupOpen] = React.useState(false);
  const [addCycleOpen, setAddCycleOpen] = React.useState(false);

  const [newStaffName, setNewStaffName] = React.useState("");
  const [newStaffRole, setNewStaffRole] = React.useState<UserRole>("orientador");
  const [newStaffEmail, setNewStaffEmail] = React.useState("");

  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupCycleId, setNewGroupCycleId] = React.useState("");
  const [newGroupCounselorId, setNewGroupCounselorId] = React.useState("");
  const [newGroupSemester, setNewGroupSemester] = React.useState(1);

  const [newCycleName, setNewCycleName] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");

  const counselorsList = staffList.filter((u) => u.role === "orientador");
  const groupMap = React.useMemo(() => {
    const map = new Map<string, Group>();
    groupList.forEach((g) => map.set(g.id, g));
    return map;
  }, [groupList]);
  const searchResults = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    const people = [
      ...staffList.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        groupName: "",
        semester: "",
      })),
      ...studentList.map((s) => {
        const group = s.groupId ? groupMap.get(s.groupId) : undefined;
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          role: "estudiante" as const,
          groupName: group?.name || "Sin grupo",
          semester: group?.semester ? group.semester.toString() : "N/A",
        };
      }),
    ];
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.role.toLowerCase().includes(term)
    );
  }, [searchTerm, staffList, studentList, groupMap]);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const [users, groupsData, alertsData, studentsData] = await Promise.all([fetchUsers(), fetchGroups(), fetchSecurityAlerts(), fetchStudents()]);
      setStaffList(users);
      setGroupList(groupsData);
      setSecurityAlerts(alertsData);
      setStudentList(studentsData);
    } catch (error) {
      console.error("Error loading Firebase data", error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los datos del servidor.",
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

  React.useEffect(() => {
    if (!newGroupCounselorId && counselorsList.length > 0) {
      setNewGroupCounselorId(counselorsList[0].id);
    }
  }, [counselorsList, newGroupCounselorId]);

  const handleCreateStaff = async () => {
    if (!newStaffName || !newStaffRole || !newStaffEmail) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los campos.",
      });
      return;
    }

    setDataLoading(true);

    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;
    const auth = getAuth();
    const tempPassword = Math.random().toString(36).slice(-8);
    const emailLower = newStaffEmail.toLowerCase();

    try {
      await createUserWithEmailAndPassword(auth, emailLower, tempPassword);
      await addUser({
        name: newStaffName,
        role: newStaffRole,
        email: emailLower,
        avatarUrl,
      });
      await sendPasswordResetEmail(auth, emailLower);
      toast({
        title: "Personal anadido",
        description: `Se creo la cuenta y se envio correo de restablecimiento a ${emailLower}.`,
      });
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffRole("orientador");
      setAddStaffOpen(false);
      await loadData();
    } catch (error) {
      console.error("create staff error", error);
      toast({
        title: "No se pudo guardar",
        description: "Hubo un error al registrar o enviar el correo de acceso.",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      await deleteUser(staffId);
      toast({
        title: "Personal eliminado",
        description: "El staff ya no aparece en el panel.",
      });
      await loadData();
    } catch (error) {
      console.error("remove staff error", error);
      toast({
        title: "No se pudo eliminar",
        description: "Intenta nuevamente.",
      });
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      toast({
        title: "Grupo eliminado",
        description: "El grupo ya no aparece en el panel.",
      });
      await loadData();
    } catch (error) {
      console.error("remove group error", error);
      toast({
        title: "No se pudo eliminar",
        description: "Intenta nuevamente.",
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || !newGroupCycleId || !newGroupCounselorId) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los campos del grupo.",
      });
      return;
    }

    try {
      await addGroup({
        name: newGroupName,
        cycleId: newGroupCycleId,
        counselorId: newGroupCounselorId,
        semester: Number(newGroupSemester),
      });
      toast({
        title: "Grupo creado",
        description: `El grupo ${newGroupName} fue creado.`,
      });
      setNewGroupName("");
      setNewGroupSemester(1);
      setAddGroupOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast({
        title: "No se pudo crear",
        description: "Intenta nuevamente.",
      });
    }
  };

  const handleCreateCycle = () => {
    if (!newCycleName) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa un nombre para el ciclo escolar.",
      });
      return;
    }

    setCycleList((prev) => Array.from(new Set([...prev, newCycleName])));
    setNewCycleName("");
    setAddCycleOpen(false);
    toast({
      title: "Ciclo escolar creado",
      description: `El ciclo ${newCycleName} fue creado.`,
    });
  };

  const totalCycles = cycleList.length;
  const totalGroups = groupList.length;

  return (
    <div className="space-y-6">
      <section id="panel">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total del Personal"
            value={staffList.length.toString()}
            icon={Users}
            description="Profesores y Orientadores"
          />
          <StatCard
            title="Grupos Activos"
            value={totalGroups.toString()}
            icon={School}
            description="En todos los ciclos"
          />
          <StatCard
            title="Orientadores"
            value={counselorsList.length.toString()}
            icon={UserIcon}
            description="Gestionando grupos de estudiantes"
          />
          <StatCard
            title="Ciclos Escolares"
            value={totalCycles.toString()}
            icon={FolderKanban}
            description="Actuales y próximos"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <SecurityAlerts alerts={securityAlerts} students={studentList} />
        </div>
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Buscar personas</CardTitle>
            <CardDescription>Encuentra maestros, orientadores o alumnos por nombre, correo o rol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Ej. maria@colegio.com o 'orientador'"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.trim() ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol / Tipo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Semestre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Sin resultados
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell className="capitalize">{person.role}</TableCell>
                        <TableCell>{person.email}</TableCell>
                        <TableCell>{person.groupName || "N/A"}</TableCell>
                        <TableCell>{person.semester || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Escribe un nombre, correo o rol para buscar.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section id="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestionar Personal</CardTitle>
                  <CardDescription>
                    Crea y gestiona cuentas para profesores y orientadores.
                  </CardDescription>
                </div>
                <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                  <DialogTrigger asChild>
                    <Button>Agregar Personal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Personal</DialogTitle>
                      <DialogDescription>
                        Ingresa la información del nuevo personal.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Nombre</label>
                        <Input
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Correo electrónico</label>
                        <Input
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                          placeholder="Correo"
                          type="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Rol</label>
                        <Select
                          value={newStaffRole}
                          onValueChange={(value) => setNewStaffRole(value as UserRole)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar Rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="orientador">Orientador</SelectItem>
                            <SelectItem value="profesor">Profesor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                      <DialogFooter className="mt-4">
                        <Button onClick={handleCreateStaff} disabled={dataLoading}>
                          Guardar
                        </Button>
                      </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "orientador" ? "default" : "secondary"}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/20"
                          onClick={() => handleRemoveStaff(user.id)}
                          disabled={dataLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar personal</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="estructura" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estructura Escolar</CardTitle>
                  <CardDescription>
                    Define ciclos académicos, semestres y grupos de estudiantes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={addCycleOpen} onOpenChange={setAddCycleOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary">Agregar Ciclo</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuevo Ciclo Escolar</DialogTitle>
                        <DialogDescription>
                          Escribe el nombre del ciclo escolar.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Nombre del Ciclo
                          </label>
                          <Input
                            value={newCycleName}
                            onChange={(e) => setNewCycleName(e.target.value)}
                            placeholder="Ej. Ciclo 2025-2026"
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button onClick={handleCreateCycle}>Guardar Ciclo</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                    <DialogTrigger asChild>
                      <Button>Agregar Grupo</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuevo Grupo</DialogTitle>
                        <DialogDescription>
                          Ingresa la información del grupo.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Nombre</label>
                          <Input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Nombre del grupo"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Ciclo Escolar
                          </label>
                          <Select
                            value={newGroupCycleId}
                            onValueChange={(value) => setNewGroupCycleId(value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar ciclo" />
                            </SelectTrigger>
                            <SelectContent>
                              {cycleList.map((cycle) => (
                                <SelectItem key={cycle} value={cycle}>
                                  {cycle}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Orientador</label>
                          <Select
                            value={newGroupCounselorId}
                            onValueChange={(value) => setNewGroupCounselorId(value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar orientador" />
                            </SelectTrigger>
                            <SelectContent>
                              {counselorsList.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Semestre</label>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={newGroupSemester}
                            onChange={(e) =>
                              setNewGroupSemester(parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button onClick={handleCreateGroup} disabled={dataLoading}>
                          Crear Grupo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Orientador</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupList.map((group) => {
                    const counselor = staffList.find((u) => u.id === group.counselorId);
                    return (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.semester}</TableCell>
                        <TableCell>{counselor?.name || "N/A"}</TableCell>
                        <TableCell>{group.cycleId || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/20"
                            onClick={() => handleRemoveGroup(group.id)}
                            disabled={dataLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar grupo</span>
                          </Button>
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
              <CardTitle>Alumnos</CardTitle>
              <CardDescription>Consulta a qué grupo y semestre pertenece cada alumno.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentList.map((student) => {
                    const group = student.groupId ? groupMap.get(student.groupId) : undefined;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{group?.name || "Sin grupo"}</TableCell>
                        <TableCell>{group?.semester ?? "N/A"}</TableCell>
                        <TableCell>{student.email}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
