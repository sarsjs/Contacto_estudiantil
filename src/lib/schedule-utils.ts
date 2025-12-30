import { SEP_CALENDAR_2025_2026 } from './sep-calendar';
import type { TimetableEntry } from './types';

export interface DayScheduleWindow {
    start: number; // minutes from midnight
    end: number;   // minutes from midnight
    hasClasses: boolean;
    holiday?: string;
}

/**
 * Parses a time string like "09:00 - 10:00" into start and end minutes from midnight.
 */
export function parseTimeRange(range: string) {
    const [startPart, endPart] = range.split(' - ');

    const parse = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    return {
        start: parse(startPart),
        end: parse(endPart)
    };
}

/**
 * Determines the active monitoring window for a group on a specific date.
 */
export function getMonitoringWindow(
    date: Date,
    timetable: TimetableEntry[]
): DayScheduleWindow {
    const dayNames: TimetableEntry['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const currentDayName = dayNames[date.getDay() - 1]; // 0 is Sunday, 6 is Saturday

    // 1. Check Weekend
    if (date.getDay() === 0 || date.getDay() === 6) {
        return { start: 0, end: 0, hasClasses: false };
    }

    // 2. Check SEP Calendar
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const sepEvent = SEP_CALENDAR_2025_2026.find(e => e.date === dateKey);
    if (sepEvent && (sepEvent.type === 'vacation' || sepEvent.type === 'suspension' || sepEvent.type === 'cte')) {
        return { start: 0, end: 0, hasClasses: false, holiday: sepEvent.label };
    }

    // 3. Filter classes for TODAY
    const todayClasses = timetable.filter(t => t.day === currentDayName);
    if (todayClasses.length === 0) {
        return { start: 0, end: 0, hasClasses: false };
    }

    // 4. Find boundaries
    let minMinutes = 1440; // 24h
    let maxMinutes = 0;

    todayClasses.forEach(item => {
        const { start, end } = parseTimeRange(item.time);
        if (start < minMinutes) minMinutes = start;
        if (end > maxMinutes) maxMinutes = end;
    });

    // Subsidio de 15 minutos antes de la entrada
    return {
        start: minMinutes - 15,
        end: maxMinutes,
        hasClasses: true
    };
}

/**
 * Checks if current time is within the window.
 */
export function isCurrentlyInWindow(window: DayScheduleWindow): boolean {
    if (!window.hasClasses) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return currentMinutes >= window.start && currentMinutes <= window.end;
}

/**
 * Finds the current subject being taught based on the timetable.
 */
export function getCurrentSubject(timetable: TimetableEntry[]): TimetableEntry | null {
    const now = new Date();
    const dayNames: TimetableEntry['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const currentDayName = dayNames[now.getDay() - 1];

    if (now.getDay() === 0 || now.getDay() === 6) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return timetable.find(entry => {
        if (entry.day !== currentDayName) return false;
        const { start, end } = parseTimeRange(entry.time);
        return currentMinutes >= start && currentMinutes <= end;
    }) || null;
}
