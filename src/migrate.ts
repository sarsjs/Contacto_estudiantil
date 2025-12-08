// src/migrate.ts
// Este script es una herramienta de un solo uso para poblar la base de datos de Firestore
// con los datos iniciales del archivo `src/lib/data.ts`.
// Después de ejecutar este script con éxito, el archivo `src/lib/data.ts` puede
// ser eliminado del proyecto.

import { db } from '@/lib/firebase/client';
import {
  users,
  groups,
  subjects,
  students,
  timetable,
  securityAlerts,
} from '@/lib/data';
import { doc, writeBatch } from 'firebase/firestore';

const migrate = async () => {
  console.log('Iniciando migración...');
  const batch = writeBatch(db);

  try {
    // Migrar usuarios
    for (const user of users) {
      const docRef = doc(db, 'users', user.id);
      batch.set(docRef, user);
    }
    console.log('Usuarios preparados para la migración.');

    // Migrar grupos
    for (const group of groups) {
      const docRef = doc(db, 'groups', group.id);
      batch.set(docRef, group);
    }
    console.log('Grupos preparados para la migración.');

    // Migrar materias
    for (const subject of subjects) {
      const docRef = doc(db, 'subjects', subject.id);
      batch.set(docRef, subject);
    }
    console.log('Materias preparadas para la migración.');

    // Migrar estudiantes
    for (const student of students) {
      const docRef = doc(db, 'students', student.id);
      batch.set(docRef, student);
    }
    console.log('Estudiantes preparados para la migración.');

    // Migrar horarios
    for (const entry of timetable) {
      const docRef = doc(db, 'timetables', entry.id);
      batch.set(docRef, entry);
    }
    console.log('Horarios preparados para la migración.');

    // Migrar alertas de seguridad
    for (const alert of securityAlerts) {
      const docRef = doc(db, 'securityAlerts', alert.id);
      batch.set(docRef, alert);
    }
    console.log('Alertas de seguridad preparadas para la migración.');

    // Ejecutar todas las escrituras en un solo lote
    await batch.commit();

    console.log('¡Migración completada con éxito!');
  } catch (error) {
    console.error('Error durante la migración:', error);
  }
};

migrate();
