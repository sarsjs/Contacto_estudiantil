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