// src/utils/pgErrorParser.js

/**
 * Mapea los mensajes de RAISE EXCEPTION de los 3 triggers nativos
 * a un código de conflicto legible para el frontend.
 *
 * Triggers:
 *   1. fn_validar_choque_aula     → SQLSTATE P0001
 *   2. fn_validar_choque_docente  → SQLSTATE P0001
 *   3. fn_validar_choque_reserva  → SQLSTATE P0001 (dos variantes)
 */

const CONSTRAINT_MAP = [
  {
    pattern: /choque de aula/i,
    code: 'CHOQUE_AULA',
    httpStatus: 409,
    userMessage: 'Conflicto de aula: ya existe una clase asignada a esta aula en ese día, bloque y gestión académica.'
  },
  {
    pattern: /choque de docente/i,
    code: 'CHOQUE_DOCENTE',
    httpStatus: 409,
    userMessage: 'Conflicto de docente: el docente ya tiene otra clase asignada en ese día y bloque, en otra aula.'
  },
  {
    pattern: /choque de reserva.*horario regular/i,
    code: 'CHOQUE_RESERVA_HORARIO',
    httpStatus: 409,
    userMessage: 'Conflicto de reserva: el aula ya tiene un horario regular asignado en ese día y bloque.'
  },
  {
    pattern: /choque de reserva.*ya esta reservada/i,
    code: 'CHOQUE_RESERVA_DUPLICADA',
    httpStatus: 409,
    userMessage: 'Conflicto de reserva: el aula ya está reservada para esa fecha, día y bloque.'
  },
  {
    pattern: /choque.*reserva/i,
    code: 'CHOQUE_RESERVA',
    httpStatus: 409,
    userMessage: 'Conflicto de reserva: el aula ya cuenta con una reserva activa incompatible en ese día y bloque.'
  }
];

/**
 * Analiza un error de PostgreSQL y, si es un P0001 lanzado por uno de
 * los 3 triggers de validación, devuelve un objeto con:
 *   { code, httpStatus, userMessage, triggerMessage }
 *
 * Si no es P0001 o no coincide con ningún trigger conocido, devuelve null.
 */
function parseConstraintError(pgError) {
  if (!pgError || pgError.code !== 'P0001') {
    return null;
  }

  const triggerMessage = pgError.message || '';

  for (const constraint of CONSTRAINT_MAP) {
    if (constraint.pattern.test(triggerMessage)) {
      return {
        code: constraint.code,
        httpStatus: constraint.httpStatus,
        userMessage: constraint.userMessage,
        triggerMessage // mensaje original de la BD
      };
    }
  }

  // P0001 desconocido (algún otro RAISE EXCEPTION no mapeado)
  return {
    code: 'CONSTRAINT_VIOLATION',
    httpStatus: 409,
    userMessage: triggerMessage,
    triggerMessage
  };
}

/**
 * Analiza un error de unique constraint (23505).
 */
function parseUniqueError(pgError) {
  if (!pgError || pgError.code !== '23505') {
    return null;
  }
  return {
    code: 'DUPLICATE_ENTRY',
    httpStatus: 409,
    userMessage: `Registro duplicado: ${pgError.detail || pgError.message}`,
    constraint: pgError.constraint
  };
}

/**
 * Analiza un error de FK constraint (23503).
 */
function parseForeignKeyError(pgError) {
  if (!pgError || pgError.code !== '23503') {
    return null;
  }
  return {
    code: 'FOREIGN_KEY_VIOLATION',
    httpStatus: 400,
    userMessage: `Referencia inválida: ${pgError.detail || pgError.message}`,
    constraint: pgError.constraint
  };
}

module.exports = { parseConstraintError, parseUniqueError, parseForeignKeyError };
