import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

// Esta API Route de Next.js actúa como un "Espejo" local de la Cloud Function real.
// En Producción, Firebase Hosting interceptará /api/validacion y lo enviará a la Cloud Function directamente.
// En Local (npm run dev), Next.js manejará esta ruta, permitiendo probar la lógica sin emuladores.

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
        return NextResponse.json({ status: "INVALID", message: "Falta el parámetro public_id." }, { status: 400 });
    }

    try {
        // Replicamos la lógica EXACTA de la Cloud Function
        const userDocRef = doc(db, 'users', publicId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ status: "INVALID", message: "La credencial no existe en el sistema." }, { status: 404 });
        }

        const userData = userDoc.data();

        // Validación de Rol
        if (userData?.role !== 'estudiante') {
            return NextResponse.json({ status: "INVALID", message: "El identificador no corresponde a un estudiante." }, { status: 400 });
        }

        // Validación de Estatus
        const status = userData?.status || 'activo';
        if (status !== 'activo') {
            return NextResponse.json({ status: "INVALID", message: "El estudiante no se encuentra ACTIVO en el ciclo escolar actual." });
        }

        // Validación de Fechas
        const now = new Date();
        const validFrom = userData?.valid_from ? new Date(userData.valid_from) : new Date('2024-08-01');
        const validTo = userData?.valid_to ? new Date(userData.valid_to) : new Date('2025-07-31');

        if (now < validFrom || now > validTo) {
            return NextResponse.json({ status: "INVALID", message: "La credencial ha expirado o aún no es vigente." });
        }

        // Obtener datos de la escuela (Mock o Real)
        let schoolData = {
            name: "Escuela Preparatoria Oficial Núm. 264",
            cct: "15EBH0264W",
            address: "Metepec, Estado de México",
            logoUrl: "https://contacto-estudiantil.web.app/escudomex.png"
        };

        if (userData?.schoolId) {
            try {
                const schoolDoc = await getDoc(doc(db, 'schools', userData.schoolId));
                if (schoolDoc.exists()) {
                    schoolData = { ...schoolData, ...schoolDoc.data() as any };
                }
            } catch (ignored) { }
        }

        // Respuesta VÁLIDA
        return NextResponse.json({
            status: "VALID",
            student: {
                name: userData?.name,
                matricula: userData?.matricula || "S/M",
                group: userData?.groupId || "Sin Asignar",
                photoUrl: userData?.avatarUrl || null,
                grade: userData?.grade || "N/A"
            },
            school: schoolData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error validando credencial (Local API):", error);
        return NextResponse.json({ status: "INVALID", message: "Error interno del servidor de validación." }, { status: 500 });
    }
}
