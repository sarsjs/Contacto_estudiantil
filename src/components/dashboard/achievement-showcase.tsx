'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Crown, Award, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface Badge {
    id: string;
    name: string;
    description: string;
    image: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const BADGES: Record<string, Badge> = {
    'cerebro_grafeno': {
        id: 'cerebro_grafeno',
        name: 'Cerebro de Grafeno',
        description: 'Manten un promedio perfecto de 10.',
        image: '/badges/badge_cerebro_grafeno.png',
        rarity: 'legendary'
    },
    'reloj_precision': {
        id: 'reloj_precision',
        name: 'Reloj de Precisión',
        description: 'Asistencia perfecta durante un mes.',
        image: '/badges/badge_reloj_precision.png',
        rarity: 'epic'
    },
    'buscador_oro': {
        id: 'buscador_oro',
        name: 'Buscador de Oro',
        description: 'Explora todos los recursos del portal.',
        image: '/badges/badge_buscador_oro.png',
        rarity: 'rare'
    },
    'leyenda_escolar': {
        id: 'leyenda_escolar',
        name: 'Leyenda Escolar',
        description: 'Alcanza el nivel 20.',
        image: '/badges/badge_leyenda_escolar.png',
        rarity: 'legendary'
    }
};

interface AchievementShowcaseProps {
    xp?: number;
    level?: number;
    unlockedBadges?: string[];
    userName?: string;
}

export function AchievementShowcase({ xp = 0, level = 1, unlockedBadges = [], userName = 'Estudiante' }: AchievementShowcaseProps) {
    const nextLevelXp = level * 500;
    const progress = (xp / nextLevelXp) * 100;
    const [showLoginAnim, setShowLoginAnim] = React.useState(true);
    const [selectedBadge, setSelectedBadge] = React.useState<Badge | null>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setShowLoginAnim(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Play level up sound if level changed (simplified for mockup)
    const playSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
            audio.volume = 0.2;
            audio.play();
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {showLoginAnim && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl"
                    >
                        <div className="text-center space-y-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="inline-block p-4 rounded-full bg-primary/20 shadow-[0_0_50px_rgba(var(--primary),0.5)]"
                            >
                                <Trophy className="h-16 w-16 text-primary" />
                            </motion.div>
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Bienvenido, {userName}</h2>
                            <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Sincronizando tus logros...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Insignia en Grande */}
            <AnimatePresence>
                {selectedBadge && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedBadge(null)}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50, rotate: -10 }}
                            animate={{ scale: 1, y: 0, rotate: 0 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[40px] shadow-[0_0_100px_rgba(var(--primary),0.3)] max-w-lg w-full text-center space-y-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative group">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
                                />
                                <img
                                    src={selectedBadge.image}
                                    alt={selectedBadge.name}
                                    className="w-64 h-64 object-contain mx-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                                />
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase">{selectedBadge.name}</h3>
                                <p className="text-primary-foreground/80 font-bold uppercase tracking-[0.2em] text-xs">LOGRO DESBLOQUEADO</p>
                                <div className="h-px w-24 bg-primary mx-auto my-4" />
                                <p className="text-xl text-white/90 font-medium">{selectedBadge.description}</p>
                            </div>

                            <Button
                                onClick={() => setSelectedBadge(null)}
                                className="bg-white text-slate-900 hover:bg-slate-200 font-black px-10 rounded-full uppercase tracking-widest text-xs"
                            >
                                Asombroso
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Level & XP Card */}
            <Card className="relative overflow-hidden border-none shadow-2xl bg-slate-950 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Level Shield */}
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="relative flex items-center justify-center"
                        >
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-blue-600 rotate-45 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.4)]">
                                <span className="rotate-[-45deg] text-4xl font-black">{level}</span>
                            </div>
                            <div className="absolute -bottom-2 bg-white text-slate-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Rango
                            </div>
                        </motion.div>

                        {/* XP Progress */}
                        <div className="flex-1 space-y-4 w-full">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight uppercase">Nivel de Prestigio</h3>
                                    <p className="text-sm text-slate-400 font-medium italic">Estudiante Erudito ✨</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary uppercase tracking-widest">{xp} / {nextLevelXp} XP</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{nextLevelXp - xp} XP para subir</p>
                                </div>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-primary via-blue-500 to-indigo-400 shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(BADGES).map((badge) => {
                    const isUnlocked = unlockedBadges.includes(badge.id);
                    return (
                        <motion.div
                            key={badge.id}
                            whileHover={isUnlocked ? { y: -10, scale: 1.02 } : {}}
                            whileTap={isUnlocked ? { scale: 0.95 } : {}}
                            onClick={() => isUnlocked && setSelectedBadge(badge)}
                            className={`group relative p-6 rounded-3xl border transition-all duration-300 ${isUnlocked
                                ? 'bg-white border-slate-200 shadow-xl cursor-zoom-in'
                                : 'bg-slate-50 border-slate-100 opacity-50 grayscale cursor-not-allowed'
                                }`}
                        >
                            {isUnlocked && (
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                </div>
                            )}

                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative h-24 w-24">
                                    <img
                                        src={badge.image}
                                        alt={badge.name}
                                        className={`w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 ${isUnlocked ? 'group-hover:scale-110 group-hover:rotate-12' : ''}`}
                                    />
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-slate-900/40 backdrop-blur-[2px] rounded-full p-2">
                                                <Star className="h-6 w-6 text-white/50" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">{badge.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{badge.description}</p>
                                </div>

                                {isUnlocked ? (
                                    <div className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${badge.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
                                        badge.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {badge.rarity}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-black uppercase text-slate-400">Bloqueado</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Next Milestone */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <Zap className="h-6 w-6 text-yellow-300" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase tracking-tight italic">Próximo Desafío</h4>
                                <p className="text-sm opacity-90">Completa 5 tareas con 10 para ganar <span className="font-bold underline">"Cerebro de Grafeno"</span></p>
                            </div>
                        </div>
                        <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white border-none">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
