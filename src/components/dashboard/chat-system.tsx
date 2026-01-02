'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, MoreVertical, Phone, Video, Check, CheckCheck, MessageSquare, Paperclip, Image as ImageIcon, FileText, FileArchive, ChevronLeft, ChevronRight, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { fetchUsers, fetchGroups, fetchSubjects, fetchAllTimetables } from '@/lib/firebase/data';
import type { User, Group, Subject, TimetableEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function ChatSystem() {
    const { profile } = useAuth();
    const [users, setUsers] = React.useState<User[]>([]);
    const [groups, setGroups] = React.useState<Group[]>([]);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState('');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('personal');
    const [subjects, setSubjects] = React.useState<Subject[]>([]);
    const [timetables, setTimetables] = React.useState<TimetableEntry[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const isStudent = profile?.role === 'estudiante' || profile?.role === 'alumno';

    React.useEffect(() => {
        Promise.all([
            fetchUsers(),
            fetchGroups(),
            fetchSubjects(),
            fetchAllTimetables()
        ]).then(([allUsers, allGroups, allSubjects, allTimetables]) => {
            setUsers(allUsers.filter(u => u.id !== profile?.id));
            setGroups(allGroups);
            setSubjects(allSubjects);
            setTimetables(allTimetables);
        });
    }, [profile]);

    const getUserGroupName = (groupId?: string) => {
        if (!groupId) return null;
        return groups.find(g => g.id === groupId)?.name;
    };

    const categorizedUsers = React.useMemo(() => {
        const filtered = users.filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        let finalPersonal = filtered.filter(u => ['director', 'orientador', 'profesor'].includes(u.role));
        let finalStudents = filtered.filter(u => u.role === 'estudiante' || u.role === 'alumno');

        // Restricciones para Alumnos
        if (isStudent) {
            const myGroupId = profile.groupId;
            const myGroup = groups.find(g => g.id === myGroupId);

            // Orientadores permitidos (titular + suplente)
            const allowedCounselorIds = [myGroup?.counselorId, myGroup?.tempCounselorId].filter(Boolean);

            // Maestros que le dan clase
            const myTimetables = timetables.filter(t => t.groupId === myGroupId);
            const mySubjectIds = myTimetables.map(t => t.subjectId);
            const allowedTeacherIds = subjects
                .filter(s => mySubjectIds.includes(s.id))
                .map(s => s.teacherId);

            finalPersonal = finalPersonal.filter(u =>
                u.role === 'director' ||
                allowedCounselorIds.includes(u.id) ||
                allowedTeacherIds.includes(u.id)
            );

            // Solo compañeros de su mismo grupo
            finalStudents = finalStudents.filter(s => s.groupId === myGroupId);
        }

        // Filtrar estudiantes por grupo si hay uno seleccionado (solo para personal)
        if (!isStudent && selectedGroupId) {
            finalStudents = finalStudents.filter(s => s.groupId === selectedGroupId);
        }

        return { personal: finalPersonal, alumnos: finalStudents };
    }, [users, searchTerm, selectedGroupId, profile, groups, subjects, timetables]);

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Aquí iría la lógica de subida a Firebase Storage
            console.log("Archivo seleccionado:", file.name);
            setMessage(`[Archivo: ${file.name}]`);
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl shadow-lg border overflow-hidden">
            {/* Sidebar de Chats */}
            <div className="w-80 border-r flex flex-col bg-slate-50/50">
                <div className="p-4 bg-white border-b space-y-4">
                    <h2 className="text-xl font-bold">Mensajes</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar contacto..."
                            className="pl-9 bg-slate-100 border-none h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'alumnos') setSelectedGroupId(null); }} className="flex-1 flex flex-col">
                    <div className="px-2 pt-2 bg-white">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                            <TabsTrigger value="personal" className="text-xs uppercase font-bold py-1.5 ring-offset-white transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Personal</TabsTrigger>
                            <TabsTrigger value="alumnos" className="text-xs uppercase font-bold py-1.5 ring-offset-white transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Alumnos</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="personal" className="flex-1 mt-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="divide-y divide-slate-100">
                                {categorizedUsers.personal.length > 0 ? (
                                    categorizedUsers.personal.map((user) => (
                                        <ContactItem
                                            key={user.id}
                                            user={user}
                                            selected={selectedUser?.id === user.id}
                                            onClick={() => setSelectedUser(user)}
                                        />
                                    ))
                                ) : (
                                    <p className="p-8 text-center text-xs text-muted-foreground">No hay personal encontrado.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="alumnos" className="flex-1 mt-0 overflow-hidden flex flex-col">
                        {/* Selector de Grupo o Lista de Alumnos */}
                        {(selectedGroupId || isStudent) ? (
                            <div className="flex flex-col h-full">
                                {!isStudent && (
                                    <div className="p-3 bg-blue-50/50 border-b flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedGroupId(null)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-bold uppercase tracking-tight text-blue-800 truncate flex-1">
                                            Grupo {groups.find(g => g.id === selectedGroupId)?.name}
                                        </span>
                                    </div>
                                )}
                                <ScrollArea className="flex-1">
                                    <div className="divide-y divide-slate-100">
                                        {categorizedUsers.alumnos.length > 0 ? (
                                            categorizedUsers.alumnos.map((user) => (
                                                <ContactItem
                                                    key={user.id}
                                                    user={user}
                                                    groupName={getUserGroupName(user.groupId)}
                                                    selected={selectedUser?.id === user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                />
                                            ))
                                        ) : (
                                            <p className="p-8 text-center text-xs text-muted-foreground">No hay compañeros en tu grupo.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecciona un Grupo</p>
                                    {groups.map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => setSelectedGroupId(group.id)}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white cursor-pointer transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <UsersIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold uppercase">{group.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{group.semester}º Semestre</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Ventana de Chat */}
            <div className="flex-1 flex flex-col bg-[#F0F2F5]">
                {selectedUser ? (
                    <>
                        {/* Header del Chat */}
                        <div className="p-3 bg-white border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={selectedUser.avatarUrl} />
                                    <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedUser.name}</h3>
                                    <p className="text-[10px] text-green-600 font-bold uppercase">En línea</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500">
                                <Video className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                                <Phone className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                            </div>
                        </div>

                        {/* Mensajes */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4">
                                <div className="flex justify-start">
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[70%]">
                                        <p className="text-sm">Hola, ¿ya viste el calendario oficial 2025-2026? Quedó excelente.</p>
                                        <span className="text-[10px] text-muted-foreground mt-1 block text-right">10:30 AM</span>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <div className="bg-[#D9FDD3] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[70%] text-slate-800">
                                        <p className="text-sm">Sí, ya está todo configurado.</p>
                                        <div className="flex items-center justify-end gap-1 mt-1">
                                            <span className="text-[10px] opacity-70">10:32 AM</span>
                                            <CheckCheck className="h-3 w-3 text-blue-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Ejemplo de Archivo enviado */}
                                <div className="flex justify-start">
                                    <div className="bg-white p-2 rounded-2xl rounded-tl-none shadow-sm max-w-[70%] min-w-[200px]">
                                        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border">
                                            <div className="h-10 w-10 bg-blue-100 flex items-center justify-center rounded-lg text-blue-600">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">Horario_Grupal.pdf</p>
                                                <p className="text-[10px] text-muted-foreground uppercase">PDF • 1.2 MB</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1 block text-right px-1">11:05 AM</span>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Input de Mensaje */}
                        <div className="p-4 bg-white border-t flex items-center gap-3">
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500 hover:text-primary"
                                onClick={handleFileClick}
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>

                            <Input
                                placeholder="Escribe un mensaje aquí..."
                                className="flex-1 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary h-11 px-4 text-sm"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setMessage('')}
                            />

                            <Button size="icon" className="h-11 w-11 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95">
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-white">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare className="h-12 w-12 opacity-20" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">EduChain Chat</h3>
                        <p className="text-sm mt-2">Selecciona un contacto para comenzar a chatear.</p>
                        <p className="text-xs mt-8 text-slate-400">Tus mensajes están protegidos de extremo a extremo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ContactItem({ user, selected, groupName, onClick }: { user: User, selected: boolean, groupName?: string | null, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-white border-l-4 border-l-transparent",
                selected ? "bg-white border-l-primary shadow-sm z-10" : ""
            )}
        >
            <Avatar className="h-12 w-12 border">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase">
                    {user.name.charAt(0)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-medium">12:45</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-muted-foreground truncate uppercase font-bold tracking-wider">
                        {user.role}
                    </span>
                    {groupName && (
                        <>
                            <span className="text-[9px] text-slate-300">•</span>
                            <span className="text-[9px] text-blue-600 font-bold uppercase truncate">
                                {groupName}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
