'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RescueAdminPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const router = useRouter();

    const handleCreateAdmin = async () => {
        if (!user || !user.email) return;
        setLoading(true);
        try {
            await setDoc(doc(db, 'users', user.uid), {
                id: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email.toLowerCase(),
                role: 'admin',
                createdAt: serverTimestamp()
            });
            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/dashboard/admin';
            }, 2000);
        } catch (error) {
            console.error("Rescue Error:", error);
            alert("Error al crear perfil admin. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                        <CardTitle>No autenticado</CardTitle>
                        <CardDescription>Debes iniciar sesión primero para usar esta herramienta de rescate.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/login')} className="w-full">Ir al Login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full border-2 border-red-100 shadow-2xl">
                <CardHeader className="text-center">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">
                        Rescate de Cuenta Admin
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium pt-2">
                        Si ves el error "perfil no registrado", usa este botón para crear tu perfil de
                        <span className="text-red-600 font-bold px-1">Super Administrador</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-100 p-4 rounded-xl border space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Usuario Detectado</p>
                        <p className="font-bold text-slate-700 truncate">{user.email}</p>
                        <p className="text-[10px] text-slate-500">UID: {user.uid}</p>
                    </div>

                    {success ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-bounce">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="font-bold text-sm">¡Éxito! Redirigiendo al panel...</p>
                        </div>
                    ) : (
                        <Button
                            onClick={handleCreateAdmin}
                            disabled={loading}
                            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-red-200 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                            {loading ? 'Procesando...' : 'Convertirme en Admin'}
                        </Button>
                    )}

                    <p className="text-[10px] text-center text-slate-400 italic">
                        Esta es una herramienta de emergencia para desarrolladores.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
