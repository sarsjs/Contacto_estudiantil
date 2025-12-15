# EduChain

This is the EduChain Next.js dashboard project.

## Firebase

The dashboard relies on Firebase for its backend services, including Authentication and Firestore Database. The necessary configuration is located in `src/lib/firebase/` and environment variables should be set up in `.env.local`.

Variables públicas requeridas (usa los valores reales de tu proyecto en Firebase → Configuración del proyecto → tus apps web).
El repositorio incluye, como respaldo, las llaves públicas del proyecto `contacto-estudiantil` para que el login funcione aun si
olvidas definir variables en App Hosting o en `.env.local`; puedes sobreescribirlas con tu propio proyecto cuando sea necesario:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Estas variables ya no tienen valores predeterminados en el código: si falta alguna, la inicialización de Firebase falla con un error explícito para evitar conectarse a un proyecto incorrecto y recibir mensajes de **Credenciales incorrectas**. En local colócalas en `.env.local` y en App Hosting decláralas (o sus secretos correspondientes) en `apphosting.yaml`.

### App Check (reCAPTCHA v3)

1. Registra la app web en Firebase → App Check y genera una **Site Key** de reCAPTCHA v3.
2. Exporta la clave en tu entorno (`.env.local` o variables de despliegue); con solo colocar la Site Key App Check se encenderá:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<tu_site_key>
   # Opcional: fuerza el encendido/apagado
   NEXT_PUBLIC_ENABLE_APPCHECK=true|false
   # Opcional para pruebas locales (true genera un token de depuración automático):
   NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=true
   ```
   - No subas la Site Key real al repositorio; defínela como variable de entorno o secreto en tu plataforma de despliegue.
   - Si dejas `NEXT_PUBLIC_ENABLE_APPCHECK` vacío, la app activará App Check automáticamente al detectar la Site Key. Ponlo en
     `false` solo si necesitas deshabilitarlo de forma explícita.
3. Para App Hosting, añade el secreto `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`; el flag `NEXT_PUBLIC_ENABLE_APPCHECK` puede quedar vací
   o o en `true` si deseas forzar el encendido.
4. Reconstruye/despliega; los formularios inicializan App Check cuando la clave está presente (o el flag fuerza el encendido) y
   emiten una advertencia clara si no hay clave.

> Nota sobre App Hosting: define los valores reales de Firebase en `apphosting.yaml` (o como secretos referenciados allí). Si quedan vacíos, la app no se inicia y mostrará qué variables faltan, evitando que se use la configuración antigua del repositorio.

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
