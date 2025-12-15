# EduChain

This is the EduChain Next.js dashboard project.

## Firebase

The dashboard relies on Firebase for its backend services, including Authentication and Firestore Database. The necessary configuration is located in `src/lib/firebase/` and environment variables should be set up in `.env.local`.

Variables públicas requeridas (usa los valores reales de tu proyecto en Firebase → Configuración del proyecto → tus apps web):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

En App Hosting declara estas variables (o sus secretos correspondientes) en `apphosting.yaml` para evitar el error **API key not valid** al autenticar. En local, colócalas en `.env.local` junto con la configuración de App Check.

### App Check (reCAPTCHA v3)

1. Registra la app web en Firebase → App Check y genera una **Site Key** de reCAPTCHA v3.
2. Exporta la clave en tu entorno (`.env.local` o variables de despliegue):
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<tu_site_key>
   # Opcional para pruebas locales (true genera un token de depuración):
   NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=true
   ```
   - No subas la Site Key real al repositorio; defínela como variable de entorno o secreto en tu plataforma de despliegue.
3. Para App Hosting, añade el secreto `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` y referencia en `apphosting.yaml` para que Next.js exponga la clave al frontend.
4. Reconstruye/despliega; los formularios ya inicializan App Check automáticamente cuando la clave está presente.

> Nota sobre App Hosting: las claves de Firebase (apiKey, authDomain, etc.) son públicas y ya están embebidas en el cliente. Para evitar fallos de arranque cuando no existen versiones de secretos en el proyecto, `apphosting.yaml` ya no mapea esas claves como secretos. Solo define `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` como variable opcional (vacía por defecto); si quieres gestionarla vía secretos, vuelve a mapearla en ese archivo y crea el secreto correspondiente en Firebase.

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
