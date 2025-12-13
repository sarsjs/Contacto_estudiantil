# Manual de Usuario: Contacto Estudiantil

## 1. Objetivo de la Aplicación

**Contacto Estudiantil** es un prototipo de un sistema de gestión escolar integral, diseñado para centralizar y optimizar las operaciones diarias de una institución educativa. El objetivo principal es crear un ecosistema digital unificado que mejore la comunicación, la seguridad y la eficiencia en la gestión de datos académicos y administrativos.

La plataforma está construida con una arquitectura basada en roles, proporcionando una interfaz y herramientas específicas para cada tipo de usuario, desde el personal administrativo hasta los estudiantes.

---

## 2. Módulos y Roles

La aplicación se divide en cuatro módulos principales, cada uno correspondiente a un rol de usuario con funcionalidades específicas.

### a. Módulo de Director

El director tiene una vista global de la institución y herramientas de comunicación masiva.

*   **Panel de Control:** Visualiza estadísticas clave como el número total de personal, grupos activos, orientadores y ciclos escolares.
*   **Sistema de Comunicados:** Puede enviar mensajes o anuncios a toda la comunidad escolar o a segmentos específicos (solo maestros, solo orientadores, solo alumnos). Los mensajes enviados se muestran en un historial.
*   **Calendario Escolar:** Gestiona y visualiza eventos importantes y fechas clave para la institución.

### b. Módulo de Orientador (Consejero)

El orientador se encarga del seguimiento cercano de los grupos de estudiantes que le son asignados.

*   **Vista de Grupos:** Visualiza la lista de grupos a su cargo.
*   **Seguimiento de Alumnos:** Al seleccionar un grupo, puede ver la lista de estudiantes y acceder al perfil individual de cada uno para consultar su horario, asistencias y calificaciones.
*   **Simulación de Suplencia:** La arquitectura está preparada para que un orientador pueda ser asignado como suplente de otro, obteniendo acceso temporal a sus grupos y estudiantes.

### c. Módulo de Profesor

El profesor gestiona los aspectos académicos de las materias que imparte.

*   **Vista de Asignaturas:** Accede a las materias que tiene asignadas.
*   **Pase de Lista:** Para cada materia, puede tomar la asistencia de los alumnos del grupo correspondiente. La interfaz permite marcar a cada estudiante como "Presente" o "Ausente".
*   **Gestión de Calificaciones:** Puede asignar calificaciones a los estudiantes para cada uno de los tres parciales del ciclo escolar.

### d. Módulo de Alumno (Estudiante)

El estudiante tiene acceso a su propia información académica y participa activamente en el proceso de asistencia.

*   **Horario Personal:** Visualiza su horario de clases semanal.
*   **Pase de Lista Simulado:** Cada clase en su horario tiene un botón para registrar su asistencia. Al presionarlo, el sistema simula una verificación y actualiza su estado a "Presente".
*   **Consulta de Calificaciones:** Puede ver las calificaciones que los profesores le han asignado en las diferentes materias.
*   **Recepción de Comunicados:** Recibe y visualiza los anuncios enviados por el director.

---

## 3. Cómo Funciona

*   **Autenticación y Roles:** El sistema utiliza Firebase Authentication para el inicio de sesión. Una vez que un usuario se autentica, la aplicación consulta la base de datos de Firestore para identificar su rol y lo redirige automáticamente a su panel de control correspondiente.

*   **Base de Datos en Tiempo Real:** Toda la información (usuarios, grupos, calificaciones, asistencias, etc.) se almacena y se lee desde **Firestore**, la base de datos NoSQL de Firebase. Esto permite que los cambios se reflejen en tiempo real en toda la aplicación.

*   **Interacción Dinámica:** Los componentes, construidos con React y Next.js, consultan las funciones en `src/lib/firebase/data.ts` para obtener y modificar los datos. Por ejemplo, cuando un profesor guarda una calificación, esta se escribe en Firestore y queda inmediatamente disponible para que el alumno y el orientador la puedan ver.
