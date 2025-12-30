'use client';

import * as React from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import {
    fetchUsers,
    createSubstitutionRequest,
    fetchSubstitutionRequests,
    handleSubstitutionRequest
} from '@/lib/firebase/data';
import type { User, SubstitutionRequest, Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, UserCheck, UserX, Clock, Send } from 'lucide-react';

interface SubstitutionManagerProps {
    myGroups: Group[];
    onUpdate: () => void;
}

export function SubstitutionManager({ myGroups, onUpdate }: SubstitutionManagerProps) {
    const { profile: user } = useAuth();
    const { toast } = useToast();

    const [others, setOthers] = React.useState<User[]>([]);
    const [incoming, setIncoming] = React.useState<SubstitutionRequest[]>([]);
    const [isRequesting, setIsRequesting] = React.useState(false);
    const [selectedCounselorId, setSelectedCounselorId] = React.useState("");
    const [requestMessage, setRequestMessage] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const loadData = React.useCallback(async () => {
        if (!user?.id) return;
        try {
            const [allUsers, reqs] = await Promise.all([
                fetchUsers(),
                fetchSubstitutionRequests(user.id)
            ]);
            setOthers(allUsers.filter(u => u.role === 'orientador' && u.id !== user.id));
            setIncoming(reqs);
        } catch (error) {
            console.error(error);
        }
    }, [user?.id]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSendRequest = async () => {
        if (!selectedCounselorId || !user?.id) return;

        try {
            setIsRequesting(true);
            const myOwnedGroups = myGroups.filter(g => g.counselorId === user.id);

            await createSubstitutionRequest({
                fromCounselorId: user.id,
                toCounselorId: selectedCounselorId,
                groupIds: myOwnedGroups.map(g => g.id),
                status: 'pending',
                message: requestMessage || `Hola, por favor ¿puedes apoyarme con mis grupos el día de hoy?`
            });

            toast({ title: "Solicitud enviada", description: "Se ha notificado al orientador seleccionado." });
            setDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo enviar la solicitud.", variant: "destructive" });
        } finally {
            setIsRequesting(false);
        }
    };

    const handleAction = async (request: SubstitutionRequest, action: 'accepted' | 'declined') => {
        try {
            await handleSubstitutionRequest(request.id, action, request);
            toast({
                title: action === 'accepted' ? "Solicitud aceptada" : "Solicitud rechazada",
                description: action === 'accepted' ? "Ahora tienes acceso a los nuevos grupos." : "Se ha notificado el rechazo."
            });
            loadData();
            onUpdate();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo procesar la acción.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            {/* Incoming Requests Section */}
            {incoming.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-3 w-3 animate-pulse" /> Solicitudes de Suplencia Pendientes
                    </p>
                    {incoming.map(req => {
                        const fromUser = others.find(u => u.id === req.fromCounselorId);
                        return (
                            <Card key={req.id} className="border-blue-200 bg-blue-50/30 overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-full">
                                            <UserCircle className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <p className="text-sm font-bold">{fromUser?.name || "Un compañero"}</p>
                                                <p className="text-xs text-muted-foreground">{req.message}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleAction(req, 'accepted')}
                                                >
                                                    <UserCheck className="h-4 w-4 mr-2" /> Aceptar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-blue-200 text-blue-700 hover:bg-blue-100"
                                                    onClick={() => handleAction(req, 'declined')}
                                                >
                                                    <UserX className="h-4 w-4 mr-2" /> Rechazar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Request Trigger */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-dashed border-slate-300 hover:border-primary hover:text-primary transition-all">
                        <Send className="h-4 w-4 mr-2" /> Solicitar Suplencia a Compañero
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Solicitar Apoyo de Suplencia</DialogTitle>
                        <DialogDescription>
                            Envía una solicitud a un compañero orientador para que se haga cargo de tus grupos temporalmente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Seleccionar Compañero</label>
                            <Select value={selectedCounselorId} onValueChange={setSelectedCounselorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Orientadores disponibles" />
                                </SelectTrigger>
                                <SelectContent>
                                    {others.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo o Mensaje (Opcional)</label>
                            <Input
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                placeholder="Ej. No podré llegar a tiempo por tráfico..."
                            />
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-800">
                                <strong>Nota:</strong> Tus grupos serán transferidos solo si el compañero acepta la solicitud. El director será notificado del acuerdo.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSendRequest} disabled={isRequesting || !selectedCounselorId}>
                            {isRequesting ? "Enviando..." : "Enviar Solicitud"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
