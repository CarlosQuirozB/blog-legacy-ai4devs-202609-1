import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/**
 * Forma pública de un comentario en las respuestas de POST y PATCH.
 *
 * Mantiene el contrato de hoy: las ocho columnas de la tabla, con sus nombres
 * en snake_case.
 *
 * BUG caracterizado (hallazgo 17): incluye `autor_email`, `estado`, `post_id`
 * y `padre_id`. Quitarlos cambia el contrato y es otra tarea.
 */
export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  toObject() {
    return {
      id: this.resource.id,
      post_id: this.resource.postId,
      autor_nombre: this.resource.autorNombre,
      autor_email: this.resource.autorEmail,
      cuerpo: this.resource.cuerpo,
      estado: this.resource.estado,
      creado_en: this.resource.creadoEn,
      padre_id: this.resource.padreId,
    }
  }
}
