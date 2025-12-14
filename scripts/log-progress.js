#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const [,, area, summary, pending] = process.argv;

if (!area || !summary) {
  console.error('Uso: node scripts/log-progress.js "Área" "Resumen de cambios" ["Pendiente relacionado"]');
  process.exit(1);
}

const now = new Date();
const formattedDate = now.toLocaleString('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const line = `${formattedDate} - ${area}: ${summary}${pending ? ' Pendiente: ' + pending : ''}`;

const filePath = path.join(__dirname, '..', 'PROYECTO.md');
fs.appendFileSync(filePath, `${line}\n`, 'utf-8');
console.log('Registro agregado:', line);
