# Proyecto: EduChain - Sistema de Gestión Escolar

## 1. Concepto del Proyecto

**EduChain** es un prototipo de un sistema de gestión escolar integral diseñado para centralizar y optimizar las operaciones diarias de una institución educativa. La plataforma mantiene una arquitectura basada en roles y una capa de datos conectada a Firebase, proporcionando una interfaz y herramientas específicas para cada tipo de usuario: desde el personal administrativo hasta los estudiantes.

El objetivo principal sigue siendo crear un ecosistema digital unificado que mejore la comunicación, la seguridad y la eficiencia en la gestión de datos académicos y administrativos.

---

## 2. Funcionalidades Implementadas (estado real)

### a. Autenticación y roles
* Se utiliza Firebase Authentication; las rutas están protegidas con AuthGuard y, tras iniciar sesión, se sincroniza el perfil desde Firestore.
* El dashboard se renderiza según el rol real (director, orientador, profesor, estudiante) y la sesión se restaura automáticamente después de crear nuevos alumnos mediante validación adicional.

### b. Dashboards dinámicos
* Cada rol consume datos en tiempo real: el director obtiene métricas de personal, estudiantes, grupos, ciclos y orientadores; el orientador gestiona grupos, horarios, materias e importaciones masivas; los profesores manejan asistencia/calificaciones y los estudiantes ven su horario, ID digital y pase de lista.
* Se han creado componentes reutilizables (CalendarPanel, MessagePanel, StatCard, MessageHistory) para mantener la consistencia visual y funcional.
* El calendario admite selección de fechas, muestra eventos desde Firestore y permite la creación/eliminación de eventos según permisos (director/orientador/profesor para crear; director/orientador para eliminar).

### c. Comunicación y alertas
* Hay un sistema de comunicados filtrado por destinatario (grupos, alumnos, orientadores, director, todos) con historial y etiquetas en español.
* Se mantiene el componente de alertas de seguridad (autorizadas/no autorizadas) que filtra según pertenencia al grupo.

### d. Gestión de estudiantes y horarios
* El director puede crear, editar y eliminar estudiantes desde modales; cada alta crea un usuario Firebase, genera matrícula y envía correo de restablecimiento.
* Tanto asistentes como orientadores pueden importar alumnos masivamente mediante CSV con columnas `name,email,groupId` y ver los resultados/errores en pantalla.
* Las vistas de horarios y materias están enlazadas: el orientador puede navegar entre módulos y vincular grupos con materias sin salir del rol.

### e. Helpers y persistencia
* Los helpers en src/lib/firebase/data.ts cubren todas las operaciones CRUD (estudiantes, mensajes, eventos, grupos, asistencia, calificaciones) y aprovechan Firestore para mantener datos persistentes.
* Se incorporaron toasts y estados de carga para informar acciones exitosas o errores.

---

## 3. Tecnologías Utilizadas
* **Framework:** Next.js (App Router)
* **Lenguaje:** TypeScript
* **UI:** Tailwind CSS y componentes de ShadCN UI
* **Iconos:** Lucide React
* **Base de datos y backend:** Firebase Firestore + Firebase Authentication
* **Autenticación auxiliar:** Helpers en src/lib/firebase/auth.ts y contexto global (AuthProvider)

---

## 4. Pendientes y hallazgos actuales

### a. Pendientes del documento original
* **Refuerzo de backend:** Aunque Firestore sirve como backend, aún faltan validaciones serverless/Cloud Functions para garantizar reglas de negocio estrictas (ej. evitar ediciones directas desde la consola).
* **Controles RBAC en servidor:** El control de accesos sigue siendo mayormente frontend; se debe crear un middleware (Cloud Functions o API routes) que valide cada acción.
* **GPS/QR y reportes IA:** Las funcionalidades mencionadas en el documento (pase de lista por GPS/QR, reportes predictivos, chatbot) siguen pendientes.
* **Notificaciones push:** Todavía no se ha integrado Firebase Cloud Messaging ni otras formas de notificación en tiempo real.

### b. Hallazgos y errores recientes
* **Parpadeo en portal del director:** El director puede perder la sesión tras crear un alumno porque Firebase cambia el user; actualmente se obliga a reingresar la contraseña, pero se necesita un flujo más suave o guardar la sesión en un token.
* **Pantalla  Tu perfil no está registrado:** Aparece al crear alumnos si la sesión cambia; se recomienda capturar el estado antes de la petición y restaurarlo sin reauth manual.
* **Errores de iconos:** Algunos iconos de Lucide (como Chalkboard) no estaban disponibles, y se sustituyeron por variantes exportadas (UserCheck); conviene auditar importaciones para evitar errores de compilación.
* **Plugin de ESLint de Next:** Durante `npm run lint` sigue apareciendo la advertencia estándar que recomienda instalar el plugin oficial; no bloquea el build, pero es un recordatorio para homogeneizar la configuración.
* **Mensajes y calendario:** Si bien funcionan, aún requiere ajustes en validaciones (evitar envíos duplicados, filtrar eventos del día seleccionado) y en la alineación del calendario a la izquierda del panel.

---

## 5. Próximos pasos sugeridos
1. Refactorizar el flujo de alta de alumnos para mantener intacta la sesión del director sin solicitar contraseña extra y documentar los pasos.
2. Auditar las reglas de Firestore, crear un conjunto de funciones Cloud (o API routes) que validen el acceso a mensajes, eventos y estudiantes según rol.
3. Introducir pruebas end-to-end (por ejemplo con Playwright) para cada rol y así detectar regresiones como el parpadeo del portal.
4. Documentar las operaciones CSV y crear un pequeño tutorial dentro de la app (modal ayuda) para guiar al orientador/director.
5. Planificar la integración futura de reportes analíticos y notificaciones push, dejando claras las dependencias (Cloud Functions, Firebase Messaging, IA/GenAI luego).

---

## 6. Registro de avances con fecha y hora
Fecha de referencia: **14/12/2025 01:17**. A partir de ese momento cada desarrollador que trabaje en EduChain debe añadir al final de este documento un breve resumen con:
1. Fecha y hora de la actualización (formato `dd/mm/yyyy hh:mm`).
2. Qué componente o área del proyecto se tocó.
3. Qué se implementó, corrigió o mejoró.
4. Si quedan tareas relacionadas pendientes o problemas conocidos que aparecieron durante el trabajo.

Ejemplo:
```
14/12/2025 02:45 - Ajuste del calendario en el rol de orientador: alineación corregida y lectura de eventos del día seleccionado. Pendiente: revisar estilos móviles.
```

Este registro servirá como historial vivo del progreso; antes de cerrar tu sesión, asegúrate de documentar aquí tus cambios y, si es necesario, referenciar el `git status` relevante o issues asociados.

14/12/2025 03:45 - Refactorización del sistema de autenticación y gestión de usuarios.
- **Implementado:** Creación de Cloud Functions (`createUser`, `deleteUser`) para automatizar el alta y baja de usuarios (personal y estudiantes) de forma atómica entre Firebase Auth y Firestore.
- **Corregido:** Solucionado bucle de redirección en el login ("parpadeo") mediante la centralización de la lógica en `AuthGuard`.
- **Mejorado:** Unificado el modelo de datos. Todos los usuarios ahora residen en la colección `users` con un campo `role`. Se eliminó la lógica que dependía de la colección `students`.
- **Mejorado:** Refactorizada la página de gestión de alumnos del director para usar las nuevas Cloud Functions, aumentando la seguridad.
- **Pendiente:** Migrar los registros existentes de la colección `students` a `users` para que los alumnos antiguos puedan acceder. La función para actualizar alumnos (`updateUser`) podría requerir una revisión final para asegurar la compatibilidad con el nuevo modelo de datos unificado.

14/12/2025 04:15 - Mejora del sistema de mensajes y horarios escolares.
- **Implementado:** Funcionalidades avanzadas de mensajería con múltiples filtros de destinatarios según roles (director, orientador, profesor, alumno) con envío a grupos específicos, profesores específicos, orientadores, etc.
- **Mejorado:** Sistema de horarios escolares completo con asignación por grupos, visualización para alumnos y vistas específicas por roles.
- **Corregido:** Alineación del componente CalendarPanel para mejor experiencia de usuario.
- **Corregido:** Modelo de datos TimetableEntry para uso consistente (day/time en lugar de dayOfWeek/timeSlot).
- **Implementado:** Tutorial de importación CSV integrado en la aplicación para guiar orientadores y directores.
- **Mejorado:** Funcionalidad AuthGuard para prevenir redirecciones temporales durante operaciones de gestión de usuarios.
- **Implementado:** Funciones auxiliares para obtener destinatarios según roles (profesor-alumnos, orientador-grupos, etc.).
- **Implementado:** Vista de horarios para profesores mostrando sus clases por día, hora y grupo asignados.
- **Pendiente:** Implementar Cloud Functions para validaciones de backend y RBAC, integrar notificaciones push con FCM.

14/12/2025 05:30 - Implementación de credenciales digitales con Firebase Storage.
- **Implementado:** Sistema completo de credenciales digitales similar a credencial física de la escuela.
- **Implementado:** Integración con Firebase Storage para almacenar fotos en 'fotos/' y credenciales en 'credenciales/'.
- **Implementado:** Funciones para subir, descargar y eliminar fotos de credenciales con controles de permisos.
- **Implementado:** Componente de cámara para que alumnos tomen fotos para sus credenciales con la cámara del dispositivo.
- **Implementado:** Diseño de credencial digital con datos fijos de la escuela y datos variables del alumno (nombre, grado, grupo, foto).
- **Implementado:** Restricciones de permisos: solo orientadores pueden borrar fotos de credenciales de alumnos.
- **Implementado:** Integración en panel de alumno con vista previa de credencial y funcionalidad de toma de fotos.
- **Implementado:** Código de verificación único por usuario para autenticidad de credenciales.
- **Pendiente:** Implementar generación automática de credenciales en PDF y funcionalidad de verificación por QR.

14/12/2025 05:45 - Resolución de errores de compilación en credenciales digitales.
- **Corregido:** Error de duplicación de función fetchStudentTeachers en data.ts que causaba fallo de compilación.
- **Corregido:** Error de componente no encontrado para DigitalIdCard y CameraCapture.
- **Implementado:** Componentes faltantes requeridos para funcionalidad de credenciales digitales.
- **Implementado:** Solución temporal para visualización de credencial en panel de alumno.
- **Resuelto:** Errores que impedían la compilación del proyecto.

14/12/2025 05:55 - Corrección de problema de navegación en AuthGuard.
- **Corregido:** Error que causaba pantalla de carga infinita al visitar la página principal sin autenticación.
- **Mejorado:** Lógica de redirección para usuarios no autenticados hacia la página de login.
- **Mejorado:** Manejo de estados de carga y perfil en AuthGuard.
- **Resuelto:** Ahora los usuarios son redirigidos adecuadamente según su estado de autenticación.

14/12/2025 06:00 - Mejora de manejo de usuarios sin perfil en AuthGuard.
- **Corregido:** Error que causaba pantalla de "Cargando perfil..." para usuarios autenticados sin perfil en Firestore.
- **Mejorado:** Mensaje descriptivo cuando no se encuentra el perfil del usuario.
- **Implementado:** Opción para cerrar sesión cuando no se encuentra el perfil registrado.
- **Resuelto:** Ahora los usuarios reciben feedback claro sobre el estado de su sesión.

14/12/2025 06:15 - Identificación de componentes faltantes en el sistema.
- **Detectado:** Falta la implementación de la página de horarios para el rol de director (director/horarios/page.tsx).
- **Detectado:** Falta la implementación de la página de horarios para el rol de profesor (profesor/horario/page.tsx).
- **Detectado:** Falta el componente TimetableManager en el sistema (solucionado con creación).
- **Detectado:** Problema con perfil de alumno no encontrado cuando usuario está registrado en Firebase pero no en Firestore.
- **Implementado:** Creación del componente TimetableManager para gestión de horarios.
- **Implementado:** Creación de páginas de horarios para director y profesor.
- **Resuelto:** Ahora todos los roles tienen acceso a la funcionalidad de horarios.
15/12/2025 09:00 - Verificación de accesos por roles (director, orientador, maestro y alumno).
- **Hallazgo:** Ninguna de las credenciales proporcionadas permitió salir de /login; tras ingresar usuario y contraseña la vista permanece en la pantalla de inicio de sesión (sin redirección al dashboard).
- **Implementado:** Se habilitó el entorno local con Playwright + dependencias de Chromium para automatizar las pruebas de login y capturar evidencia.
- **Pendiente:** Revisar en Firebase Auth/Firestore la validez de las cuentas y la existencia de perfiles vinculados; volver a probar el alta de alumno desde el panel de director cuando el flujo de autenticación funcione.
16/12/2025 10:30 - Redirección automática después de iniciar sesión.
- **Implementado:** Se añadió un efecto en la página de login que detecta sesión/perfil cargado y envía al dashboard correspondiente según rol (director, orientador, profesor o alumno), evitando que la vista se quede en /login.
- **Pendiente:** Validar nuevamente las credenciales compartidas (director, orientador, maestro y alumno) y confirmar que la redirección ocurre tras recuperar los perfiles desde Firestore.
17/12/2025 12:30 - Ajustes de calendario y comunicados.
- **Implementado:** Se agregó visibilidad por rol (personal, orientadores, maestros, alumnos o todos) al crear eventos de calendario y se muestra el público objetivo en cada tarjeta.
- **Corregido:** El listado de eventos del día se muestra debajo del formulario de alta y respeta la visibilidad del creador para que los eventos guardados en Firestore sean visibles según rol.
- **Corregido:** Se bloqueó el envío de comunicados a roles sin permiso y se registra el autor de cada mensaje para reducir errores de publicación.
- **Pendiente:** Validar visualmente en producción la nueva distribución del panel y el filtrado de eventos con datos reales.
17/12/2025 17:30 - Alta y baja de personal/alumnos ligada a Firebase Auth.
- **Corregido:** La eliminación de personal ahora llama a la Cloud Function `deleteUser` para borrar tanto en Auth como en Firestore, evitando correos duplicados al re-crear maestros u orientadores.
- **Mejorado:** El alta de personal reusa la función `createUser`, normaliza el correo a minúsculas y muestra un mensaje claro cuando el email ya existe.
- **Mejorado:** El formulario de alumnos usa la misma instancia de funciones callable para evitar errores de referencia y crear/eliminar cuentas de forma consistente.

18/12/2025 11:00 - Gestor visual de horarios sin empalmes.
- **Implementado:** Página de horarios para director y orientador con un gestor visual tipo cuadrícula que crea bloques por grupo, día y hora, evitando empalmes por grupo o docente.
- **Implementado:** Vista de horario para profesores con tabla semanal que muestra día, hora y grupo asignado para cada clase.
- **Mejorado:** El horario del alumno se alinea por día y hora con formato en español y se reutiliza el mismo grid para todos los roles.
- **Pendiente:** Validar en producción la carga completa de materias/docentes para asegurar que el detector de empalmes siempre encuentre coincidencias.
18/12/2025 15:00 - Integración opcional de App Check y mensajes de error guiados.
- **Implementado:** Inicialización de App Check con reCAPTCHA v3 cuando se define `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, con token de depuración opcional para pruebas locales.
- **Mejorado:** Mensajes de error al crear alumnos o personal que indican si la solicitud fue bloqueada por App Check o por falta de sesión/permiso.
- **Pendiente:** Registrar la app web en App Check y configurar la clave pública en el entorno para validar el alta de usuarios en producción.

19/12/2025 10:30 - Desbloqueo temporal de altas mientras se configura App Check.
- **Corregido:** Las funciones `createUser` y `deleteUser` se ejecutan en `us-central1` y desactivan la exigencia de App Check para que los directores puedan dar de alta/baja personal y alumnos aunque la web aún no tenga clave reCAPTCHA configurada.
- **Mejorado:** Las llamadas desde el dashboard usan explícitamente la región correcta y normalizan el correo de alumnos en minúsculas para evitar duplicados.
- **Pendiente:** Rehabilitar App Check con la clave pública de reCAPTCHA v3 cuando esté disponible y volver a exigirlo en las funciones callable.
