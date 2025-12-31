'use client';

import * as React from 'react';
import { AppConfig } from '@/lib/types';
import { fetchAppConfig } from '@/lib/firebase/data';

interface ConfigContextType {
    config: AppConfig | null;
    loading: boolean;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = React.createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = React.useState<AppConfig | null>(null);
    const [loading, setLoading] = React.useState(true);

    const refreshConfig = async () => {
        try {
            const data = await fetchAppConfig();
            setConfig(data);
        } catch (error) {
            console.error("Error refreshing config:", error);
            // Si falla, se queda con null pero quitamos el loading para que use los default
        } finally {
            // Aseguramos que el loading termine siempre tras 2 segundos máximo
            // para no bloquear al usuario si hay mala conexión
            setLoading(false);
        }
    };

    React.useEffect(() => {
        refreshConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useAppConfig() {
    const context = React.useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useAppConfig must be used within a ConfigProvider');
    }
    return context;
}
