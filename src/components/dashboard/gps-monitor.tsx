'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { verifyUserLocation } from '@/lib/gps-utils';
import { fetchTimetableByGroup, sendMessage, updateUserStatus } from '@/lib/firebase/data';
import { getMonitoringWindow, isCurrentlyInWindow } from '@/lib/schedule-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { MapPin } from 'lucide-react';

export function GPSMonitor() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [lastStatus, setLastStatus] = React.useState<'inside' | 'outside' | 'coming' | 'unknown'>('unknown');
    const [violationCount, setViolationCount] = React.useState(0);
    const [window, setWindow] = React.useState<any>(null);
    const [isActive, setIsActive] = React.useState(false);
    const watchId = React.useRef<number | null>(null);
    const lastNotificationRef = React.useRef<number>(0);

    // 1. Inteligencia de Horario: Determinar si hoy hay clases y el rango de monitoreo
    React.useEffect(() => {
        if (!profile) return;

        // Para Orientadores y Profesores: Horario estandar (7am - 4pm)
        if (profile.role === 'orientador' || profile.role === 'profesor' || profile.role === 'director') {
            const now = new Date();
            const start = new Date(now);
            start.setHours(7, 0, 0);
            const end = new Date(now);
            end.setHours(16, 0, 0);

            const win = { start, end, isHoliday: now.getDay() === 0 || now.getDay() === 6 };
            setWindow(win);

            const checkActive = () => {
                const active = isCurrentlyInWindow(win);
                setIsActive(active);
            };
            checkActive();
            const interval = setInterval(checkActive, 60000);
            return () => clearInterval(interval);
        }

        if (profile.role !== 'estudiante' || !profile.groupId) return;

        const initSchedule = async () => {
            try {
                const tt = await fetchTimetableByGroup(profile.groupId);
                const win = getMonitoringWindow(new Date(), tt);
                setWindow(win);

                const checkActive = () => {
                    const active = isCurrentlyInWindow(win);
                    setIsActive(active);
                    console.log(`GPS Intelligence [${profile.name}]: Monitoring is ${active ? 'ACTIVE' : 'IDLE'}`);
                };

                checkActive();
                const interval = setInterval(checkActive, 60000);
                return () => clearInterval(interval);
            } catch (err) {
                console.error("Error initializing GPS schedule:", err);
            }
        };

        initSchedule();
    }, [profile]);

    // 2. Monitoreo Activo (Solo si el horario lo permite)
    React.useEffect(() => {
        if (!isActive || !navigator.geolocation) {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            async (position) => {
                const result = await verifyUserLocation(position);

                if (result.isMocked) {
                    handleViolation("Ubicación simulada detectada (Fake GPS).", "high");
                    return;
                }

                if (!result.isInside) {
                    setViolationCount(prev => prev + 1);
                    if (violationCount >= 3 && lastStatus !== 'outside') {
                        handleViolation(`Fuera del plantel durante horario de actividades.`, "medium");
                        setLastStatus('outside');
                        if (profile?.id) updateUserStatus(profile.id, 'outside', profile.name);
                    }
                } else {
                    if (lastStatus === 'outside' || lastStatus === 'unknown' || lastStatus === 'coming') {
                        setLastStatus('inside');
                        if (profile?.id) updateUserStatus(profile.id, 'inside', profile.name);
                    }
                    setViolationCount(0);
                }
            },
            (err) => console.error("GPS Error:", err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [isActive, violationCount, lastStatus, profile?.id]);

    const handleViolation = async (details: string, severity: 'medium' | 'high') => {
        const now = Date.now();
        if (now - lastNotificationRef.current < 15 * 60 * 1000) return;

        try {
            await sendMessage({
                content: `[GPS SMART ALERT] ${profile?.name}: ${details}`,
                recipientFilter: 'specificGroupStudents',
                recipientId: profile?.groupId,
                timestamp: new Date() as any,
                createdBy: 'system',
                createdByRole: 'director'
            });
            lastNotificationRef.current = now;
        } catch (err) {
            console.error(err);
        }
    };

    const handleReportLate = async () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            await sendMessage({
                content: `[AVISO: VOY EN CAMINO] El alumno reporta tráfico o retraso, pero ya viene hacia el plantel.`,
                recipientFilter: 'specificGroupStudents',
                recipientId: profile?.groupId,
                timestamp: new Date() as any,
                createdBy: profile?.id,
                createdByRole: 'estudiante'
            });
            if (profile?.id) updateUserStatus(profile.id, 'coming');
            toast({ title: "Reporte Enviado", description: "Tu orientador ha recibido tu aviso." });
        });
    };

    if (isActive && lastStatus !== 'inside') {
        return (
            <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                    onClick={handleReportLate}
                    className="rounded-full shadow-2xl h-14 px-6 bg-orange-500 hover:bg-orange-600 gap-2 border-2 border-white text-white font-bold"
                >
                    <MapPin className="h-5 w-5 animate-pulse" />
                    <span>Voy en camino</span>
                </Button>
            </div>
        );
    }

    return null;
}
