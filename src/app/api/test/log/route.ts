import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { log } = await req.json();

        // Ruta del archivo de logs en la raíz del proyecto
        const logFilePath = path.join(process.cwd(), 'simulation-logs.txt');

        // Formato de línea: TIMESTAMP | ACTOR | ACTION | STATUS | MS | DETAILS
        const logLine = `${log.timestamp} | ${log.actor.padEnd(10)} | ${log.action.padEnd(15)} | ${log.status.toUpperCase().padEnd(7)} | ${log.latency}ms | ${log.details}\n`;

        // Append al archivo
        fs.appendFileSync(logFilePath, logLine);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error writing log:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

export async function DELETE() {
    // Clear logs
    const logFilePath = path.join(process.cwd(), 'simulation-logs.txt');
    if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
    }
    return NextResponse.json({ success: true });
}
