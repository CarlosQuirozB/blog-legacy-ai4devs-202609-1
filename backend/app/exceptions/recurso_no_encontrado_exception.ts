import { Exception } from '@adonisjs/core/exceptions'

/**
 * El recurso pedido no existe. `handler.ts` la convierte en
 * 404 `{ error: <mensaje> }`.
 */
export default class RecursoNoEncontradoException extends Exception {
  static status = 404
}
