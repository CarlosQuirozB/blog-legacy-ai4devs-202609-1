import { Exception } from '@adonisjs/core/exceptions'

/**
 * Quien hace la petición no tiene permiso para esa acción. `handler.ts` la
 * convierte en 403 `{ error: <mensaje> }`.
 */
export default class AccionNoPermitidaException extends Exception {
  static status = 403
}
