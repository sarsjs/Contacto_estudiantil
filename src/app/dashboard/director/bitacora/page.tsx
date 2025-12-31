'use client';

import * as React from 'react';
import {
    Clock,
    User,
    Activity,
    Search,
    Filter,
    ShieldCheck,
    AlertTriangle,
    FileText,
    Users,
    Calendar,
    BookOpen
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { fetchActivityLogs } from '@/lib/firebase/data';
import type { ActivityLog } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BitacoraPage() {
    const [logs, setLogs] = React.useState<ActivityLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterAction, setFilterAction] = React.useState("all");

    React.useEffect(() => {
        async function loadLogs() {
            setLoading(true);
            try {
                const data = await fetchActivityLogs(200);
                setLogs(data);
            } catch (error) {
                console.error("Error loading logs:", error);
            } finally {
                setLoading(false);
            }
        }
        loadLogs();
    }, []);

    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = filterAction === "all" || log.action.includes(filterAction);

            return matchesSearch && matchesAction;
        });
    }, [logs, searchTerm, filterAction]);

    const getActionBadge = (action: string) => {
        if (action.includes('ELI')) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Borrado</Badge>;
        if (action.includes('CRE')) return <Badge className="bg-green-600 gap-1"><ShieldCheck className="h-3 w-3" /> Creación</Badge>;
        if (action.includes('ASIG')) return <Badge className="bg-blue-600 gap-1"><Users className="h-3 w-3" /> Asignación</Badge>;
        return <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> Modificación</Badge>;
    };

    const getTargetIcon = (type?: string) => {
        switch (type) {
            case 'user': return <User className="h-4 w-4 text-slate-400" />;
            case 'group': return <Users className="h-4 w-4 text-slate-400" />;
            case 'subject': return <BookOpen className="h-4 w-4 text-slate-400" />;
            case 'event': return <Calendar className="h-4 w-4 text-slate-400" />;
            default: return <FileText className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Bitácora del Sistema</h1>
                    <p className="text-muted-foreground">Registro histórico de todas las acciones y modificaciones realizadas.</p>
                </div>
            </div>

            <Card className="border-none shadow-premium bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en el historial..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={filterAction} onValueChange={setFilterAction}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Tipo de acción" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las acciones</SelectItem>
                                    <SelectItem value="CRE">Creaciones</SelectItem>
                                    <SelectItem value="ACT">Actualizaciones</SelectItem>
                                    <SelectItem value="ASIG">Asignaciones</SelectItem>
                                    <SelectItem value="ELI">Eliminaciones</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-muted-foreground animate-pulse">Cargando registros de auditoría...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No se encontraron registros que coincidan con la búsqueda.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                    <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                        {getTargetIcon(log.targetType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-700">{log.creatorName}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase font-bold tracking-tighter">{log.creatorRole}</span>
                                                {getActionBadge(log.action)}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <Clock className="h-3 w-3" />
                                                {log.timestamp ?
                                                    format((log.timestamp as any).toDate(), "d 'de' MMMM, HH:mm:ss", { locale: es })
                                                    : 'Registrando...'}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {log.details}
                                        </p>
                                        {log.targetId && (
                                            <div className="mt-2 flex items-center gap-1.5">
                                                <Badge variant="secondary" className="text-[10px] h-4 font-mono font-normal opacity-60">
                                                    ID: {log.targetId}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
