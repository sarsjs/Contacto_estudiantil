
/**
 * Haversine formula to calculate the distance between two points in meters.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export const SCHOOL_LOCATION = {
    latitude: 19.4326, // Coordenadas de ejemplo
    longitude: -99.1332,
    radius: 150, // Perímetro de 150 metros
    name: "Plantel Educativo"
};

export interface LocationScanResult {
    isInside: boolean;
    distance: number;
    isMocked: boolean;
    confidence: 'high' | 'medium' | 'low';
    error?: string;
}

/**
 * Verifies if the user is within the school perimeter and checks for GPS spoofing.
 */
export async function verifyUserLocation(
    position: GeolocationPosition,
    customLocation?: { latitude: number; longitude: number; radius: number }
): Promise<LocationScanResult> {
    const { latitude, longitude, accuracy, speed } = position.coords;

    const targetLat = customLocation?.latitude ?? SCHOOL_LOCATION.latitude;
    const targetLon = customLocation?.longitude ?? SCHOOL_LOCATION.longitude;
    const targetRadius = customLocation?.radius ?? SCHOOL_LOCATION.radius;

    const distance = calculateDistance(
        latitude,
        longitude,
        targetLat,
        targetLon
    );

    const isInside = distance <= targetRadius;

    // --- Heurísticas Anti-Spoofing ---
    let isMocked = false;
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // 1. Precisión sospechosa (Accuracy <= 0 es imposible en dispositivos reales por hardware)
    // También, si la precisión es EXACTAMENTE un número entero pequeño como 1 o 5 consistentemente, suele ser señal de Mock.
    if (accuracy <= 1) {
        isMocked = true;
        confidence = 'low';
    }

    // 2. Velocidad imposible (Si se mueve a más de 120km/h dentro o cerca de la escuela)
    if (speed && speed > 33.3) { // 33.3 m/s = ~120 km/h
        isMocked = true;
        confidence = 'medium';
    }

    // 3. Verificación de entorno de ejecución (Solo si logramos detectar indicios de emulación)
    // En una PWA/Navegador es limitado, pero podemos checar si el sensor de movimiento está muerto mientras hay "movimiento" GPS.

    return {
        isInside,
        distance,
        isMocked,
        confidence,
        error: isMocked ? "Se detectó el uso de una ubicación simulada" : undefined
    };
}
