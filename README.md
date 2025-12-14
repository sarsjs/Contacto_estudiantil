# EduChain

This is the EduChain Next.js dashboard project.

## Firebase

The dashboard relies on Firebase for its backend services, including Authentication and Firestore Database. The necessary configuration is located in `src/lib/firebase/` and environment variables should be set up in `.env.local`.

## Registro de avances

Cada vez que trabajes en EduChain después de la fecha de referencia (14/12/2025 01:17), agrega un resumen corto al final de `PROYECTO.md` siguiendo el formato:

```
dd/mm/yyyy hh:mm - [área o componente]: descripción breve de lo que se implementó/cambió y pendiente relacionado (si aplica).
```

Puedes usar este mismo formato en otras notas o commits; la idea es mantener un historial visible y cronológico de las mejoras y problemas encontrados. Si el cambio se vincula a un issue, coméntalo también en el registro para facilitar el seguimiento.

También hay un helper (`npm run log-progress`) que añade automáticamente una línea al final de `PROYECTO.md`. Usa:

```
npm run log-progress -- "Área" "Resumen corto" "Pendiente opcional"
```

El script genera la marca de tiempo actual (`dd/mm/yyyy hh:mm`, horario local) y conserva el registro como parte viva del documento.
