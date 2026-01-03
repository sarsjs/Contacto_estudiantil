
/**
 * Haversine formula to calculate the distance between two points in meters.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export const SCHOOL_LOCATION = {
    latitude: 19.4326, // Example coordinates
    longitude: -99.1332,
    radius: 150, // Perimeter in meters
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

    // --- Anti-spoofing heuristics ---
    let isMocked = false;
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // 1. Suspicious precision (accuracy <= 1 is unrealistic on real devices)
    if (accuracy <= 1) {
        isMocked = true;
        confidence = 'low';
    }

    // 2. Impossible speed (over ~120 km/h near the school)
    if (speed && speed > 33.3) { // 33.3 m/s = ~120 km/h
        isMocked = true;
        confidence = 'medium';
    }

    return {
        isInside,
        distance,
        isMocked,
        confidence,
        error: isMocked ? "Se detecto el uso de una ubicacion simulada" : undefined
    };
}
