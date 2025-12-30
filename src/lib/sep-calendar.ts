
export interface SepDate {
    date: string; // YYYY-MM-DD
    type: 'vacation' | 'cte' | 'suspension' | 'taller' | 'inscrip' | 'fin' | 'start';
    label: string;
}

export const SEP_CALENDAR_2025_2026: SepDate[] = [
    // Suspension de Labores (Feriados)
    { date: '2025-09-16', type: 'suspension', label: 'Independencia de México' },
    { date: '2025-11-17', type: 'suspension', label: 'Revolución Mexicana (recorrido)' },
    { date: '2025-12-25', type: 'suspension', label: 'Navidad' },
    { date: '2026-01-01', type: 'suspension', label: 'Año Nuevo' },
    { date: '2026-02-02', type: 'suspension', label: 'Día de la Constitución' },
    { date: '2026-03-16', type: 'suspension', label: 'Natalicio de Benito Juárez' },
    { date: '2026-05-01', type: 'suspension', label: 'Día del Trabajo' },
    { date: '2026-05-05', type: 'suspension', label: 'Batalla de Puebla' },
    { date: '2026-05-15', type: 'suspension', label: 'Día del Maestro' },

    // Consejo Técnico Escolar (CTE)
    { date: '2025-09-26', type: 'cte', label: 'CTE Ordinario' },
    { date: '2025-10-31', type: 'cte', label: 'CTE Ordinario' },
    { date: '2025-11-28', type: 'cte', label: 'CTE Ordinario' },
    { date: '2026-01-30', type: 'cte', label: 'CTE Ordinario' },
    { date: '2026-02-27', type: 'cte', label: 'CTE Ordinario' },
    { date: '2026-03-27', type: 'cte', label: 'CTE Ordinario' },
    { date: '2026-05-29', type: 'cte', label: 'CTE Ordinario' },
    { date: '2026-06-26', type: 'cte', label: 'CTE Ordinario' },

    // Vacaciones (Principales rangos)
    // Invierno: 19 Dic - 5 Enero aprox
    { date: '2025-12-19', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-22', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-23', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-24', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-26', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-29', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-30', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2025-12-31', type: 'vacation', label: 'Vacaciones de Invierno' },
    { date: '2026-01-02', type: 'vacation', label: 'Vacaciones de Invierno' },

    // Semana Santa: 6-17 Abril
    { date: '2026-04-06', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-07', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-08', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-09', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-10', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-13', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-14', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-15', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-16', type: 'vacation', label: 'Semana Santa' },
    { date: '2026-04-17', type: 'vacation', label: 'Semana Santa' },

    // Talleres Intensivos / Inicio-Fin
    { date: '2025-08-25', type: 'start', label: 'Inicio del Ciclo Escolar' },
    { date: '2026-01-05', type: 'taller', label: 'Taller Intensivo Docentes' },
    { date: '2026-01-06', type: 'taller', label: 'Taller Intensivo Docentes' },
    { date: '2026-07-16', type: 'taller', label: 'Taller Intensivo Docentes' },
    { date: '2026-07-17', type: 'fin', label: 'Fin del Ciclo Escolar' },
];

export const getSepEvent = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    return SEP_CALENDAR_2025_2026.find(e => e.date === key);
};
