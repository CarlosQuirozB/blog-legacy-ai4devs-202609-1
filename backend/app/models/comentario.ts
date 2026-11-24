import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * Comentario de un post.
 *
 * No extiende `ComentarioSchema` (generado en `database/schema.ts`) porque ahí
 * `creadoEn` es un `DateTime` de Luxon: leerlo y volver a escribirlo pasaría
 * por la zona horaria local y podría cambiar el texto que hoy guarda y devuelve
 * la API. Aquí `creadoEn` se conserva como el texto 'YYYY-MM-DD HH:MM:SS' en UTC
 * que hay en la base. Normalizar las fechas es otra tarea (hallazgo 22).
 *
 * El modelo nunca sale al cliente: la forma de la respuesta la decide
 * `ComentarioTransformer`.
 */
export default class Comentario extends BaseModel {
  static table = 'comentarios'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare postId: number

  @column()
  declare autorNombre: string

  @column()
  declare autorEmail: string

  @column()
  declare cuerpo: string

  /**
   * Texto libre en la base: conviven 'pendiente', 'aprobado', 'Aprobado' y 'ok'
   * (hallazgo 7).
   */
  @column()
  declare estado: string

  @column()
  declare creadoEn: string | null

  /**
   * Se guarda tal cual llega, sin comprobar que el padre exista ni que sea del
   * mismo post (hallazgo 8).
   */
  @column()
  declare padreId: unknown
}
