import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/**
 * Respuesta de DELETE /comentarios/:id. Hoy solo confirma el borrado y no
 * devuelve nada del comentario.
 */
export default class ComentarioBorradoTransformer extends BaseTransformer<Comentario> {
  toObject() {
    return { borrado: true }
  }
}
