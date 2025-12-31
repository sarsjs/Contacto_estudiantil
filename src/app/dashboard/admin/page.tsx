'use client';

import * as React from 'react';
import { useAppConfig } from '@/context/config-context';
import { updateAppConfig } from '@/lib/firebase/data';
import { AppConfig } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Settings,
    Palette,
    Globe,
    Zap,
    Map as MapIcon,
    Save,
    Image as ImageIcon,
    Type,
    MousePointer2,
    Shield,
    Trophy,
    MapPin,
    QrCode,
    GraduationCap,
    Circle,
    Square,
    Edit2,
    School
} from 'lucide-react';

export default function AdminSettingsPage() {
    const { config, refreshConfig } = useAppConfig();
    const [localConfig, setLocalConfig] = React.useState<AppConfig | null>(config);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (config) setLocalConfig(config);
    }, [config]);

    if (!localConfig) return <div className="p-8 text-center uppercase font-black animate-pulse">Cargando Panel de Control...</div>;

    const handleSave = async () => {
        if (!config?.id) return;
        setIsSaving(true);
        try {
            await updateAppConfig(config.id, localConfig);
            await refreshConfig();
            toast({ title: "Configuración Actualizada", description: "Los cambios se han aplicado globalmente." });
        } catch (error) {
            toast({ title: "Error al guardar", description: "No se pudieron aplicar los cambios.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const updateTerminology = (key: keyof AppConfig['terminology'], value: string) => {
        setLocalConfig({
            ...localConfig,
            terminology: { ...localConfig.terminology, [key]: value }
        });
    };

    const toggleFeature = (key: keyof AppConfig['features']) => {
        setLocalConfig({
            ...localConfig,
            features: { ...localConfig.features, [key]: !localConfig.features[key] }
        });
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic flex items-center gap-3">
                        <Settings className="h-10 w-10 text-primary" />
                        Control Central Whitelabel
                    </h1>
                    <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em] mt-2">Personalización total de la plataforma sin código</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="shadow-xl shadow-primary/20 h-12 px-8 font-black uppercase tracking-widest text-xs"
                >
                    {isSaving ? "Sincronizando..." : <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>}
                </Button>
            </div>

            <Tabs defaultValue="identity" className="w-full">
                <TabsList className="bg-muted/50 p-1 mb-6 grid grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="identity" className="py-3 uppercase font-black text-[10px] tracking-widest"><Palette className="h-3 w-3 mr-2" /> Identidad</TabsTrigger>
                    <TabsTrigger value="terminology" className="py-3 uppercase font-black text-[10px] tracking-widest"><Type className="h-3 w-3 mr-2" /> Términos</TabsTrigger>
                    <TabsTrigger value="geofence" className="py-3 uppercase font-black text-[10px] tracking-widest"><MapIcon className="h-3 w-3 mr-2" /> Geocerca</TabsTrigger>
                    <TabsTrigger value="features" className="py-3 uppercase font-black text-[10px] tracking-widest"><Zap className="h-3 w-3 mr-2" /> Funciones</TabsTrigger>
                    <TabsTrigger value="security" className="py-3 uppercase font-black text-[10px] tracking-widest"><Shield className="h-3 w-3 mr-2" /> Seguridad</TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                            <CardHeader>
                                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-primary" />
                                    Marca de la App
                                </CardTitle>
                                <CardDescription>Nombres y logotipos visibles en el dashboard</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black">Nombre de la Aplicación</Label>
                                    <Input
                                        value={localConfig.appName}
                                        onChange={(e) => setLocalConfig({ ...localConfig, appName: e.target.value })}
                                        className="font-bold border-primary/20 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black">URL del Icono Sidebar</Label>
                                    <Input
                                        value={localConfig.appLogoUrl}
                                        onChange={(e) => setLocalConfig({ ...localConfig, appLogoUrl: e.target.value })}
                                        placeholder="https://ejemplo.com/logo.png"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                            <CardHeader>
                                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    Identidad Institucional
                                </CardTitle>
                                <CardDescription>Personalización de la escuela (Login y Credenciales)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black">Nombre de la Institución (Título Login)</Label>
                                    <Input
                                        value={localConfig.institutionName}
                                        onChange={(e) => setLocalConfig({ ...localConfig, institutionName: e.target.value })}
                                        className="font-bold border-primary/20 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black">URL del Logo de la Escuela</Label>
                                    <Input
                                        value={localConfig.schoolLogoUrl}
                                        onChange={(e) => setLocalConfig({ ...localConfig, schoolLogoUrl: e.target.value })}
                                        placeholder="https://ejemplo.com/escuela.png"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="terminology" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Diccionario del Sistema</CardTitle>
                            <CardDescription>Cambia los términos según el modelo educativo de la institución</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black italic">Término para 'Orientador'</Label>
                                    <Input
                                        value={localConfig.terminology.orientador}
                                        onChange={(e) => updateTerminology('orientador', e.target.value)}
                                        placeholder="Ej: Prefecto, Asistente"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black italic">Término para 'Alumno'</Label>
                                    <Input
                                        value={localConfig.terminology.alumno}
                                        onChange={(e) => updateTerminology('alumno', e.target.value)}
                                        placeholder="Ej: Estudiante, Discente"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black italic">Periodo Académico</Label>
                                    <Input
                                        value={localConfig.terminology.semestre}
                                        onChange={(e) => updateTerminology('semestre', e.target.value)}
                                        placeholder="Ej: Semestre, Cuatrimestre, Bloque"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black italic">Término para 'Grado'</Label>
                                    <Input
                                        value={localConfig.terminology.grado}
                                        onChange={(e) => updateTerminology('grado', e.target.value)}
                                        placeholder="Ej: Año, Nivel"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="features" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { id: 'badges', label: 'Insignias (Gamificación)', icon: Trophy },
                            { id: 'attendanceGps', label: 'Asistencia vía GPS', icon: MapPin },
                            { id: 'attendanceQr', label: 'Asistencia vía QR', icon: QrCode },
                            { id: 'grades', label: 'Gestión de Calificaciones', icon: GraduationCap }
                        ].map((feat) => (
                            <Card key={feat.id} className="border-none shadow-md hover:shadow-lg transition-shadow bg-card/40 backdrop-blur-sm">
                                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                    <div className={`p-4 rounded-3xl ${localConfig.features[feat.id as keyof AppConfig['features']] ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                        <feat.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black uppercase text-[10px] tracking-tight">{feat.label}</p>
                                        <Switch
                                            checked={localConfig.features[feat.id as keyof AppConfig['features']]}
                                            onCheckedChange={() => toggleFeature(feat.id as keyof AppConfig['features'])}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="geofence" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-xl overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Configurador de Geocerca Maestro</CardTitle>
                                    <CardDescription className="text-slate-400">Define el perímetro seguro del plantel para el pase de lista automático</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs font-bold">ACTIVO</Label>
                                    <Switch checked={localConfig.geofence.enabled} onCheckedChange={(val) => setLocalConfig({ ...localConfig, geofence: { ...localConfig.geofence, enabled: val } })} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative aspect-video bg-slate-200 flex items-center justify-center overflow-hidden">
                                {/* Mock Map Background */}
                                <div className="absolute inset-0 opacity-40 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=19.4326,-99.1332&zoom=16&size=800x400&sensor=false')] bg-cover" />

                                {/* Geofence Overlay Simulation */}
                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                    <div className="absolute top-10 left-10 p-4 bg-white/90 backdrop-blur shadow-2xl rounded-2xl border border-primary/20 space-y-4 w-64 animate-in slide-in-from-left-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <MousePointer2 className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Herramientas de Dibujo</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button variant="outline" size="icon" className="h-10 w-10 border-primary/20"><Circle className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="icon" className="h-10 w-10 bg-primary text-white"><Square className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="icon" className="h-10 w-10 border-primary/20"><Edit2 className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black">Radio de Acción (metros)</Label>
                                            <Input
                                                type="number"
                                                value={localConfig.geofence.radius}
                                                onChange={(e) => setLocalConfig({ ...localConfig, geofence: { ...localConfig.geofence, radius: parseInt(e.target.value) } })}
                                                className="h-8 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Visual Representation of Geofence */}
                                    <div className="relative group cursor-pointer">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" style={{ width: localConfig.geofence.radius, height: localConfig.geofence.radius, transform: 'translate(-50%, -50%)' }} />
                                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(var(--primary),0.5)] border-4 border-white relative z-20">
                                            <School className="h-6 w-6" />
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded uppercase whitespace-nowrap">Zona de Asistencia</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

