import db from '@adonisjs/lucid/services/db'

/**
 * Acceso a `posts` que necesitan los comentarios.
 *
 * Solo contiene la búsqueda que usa crear un comentario; los endpoints de
 * posts siguen en `start/routes.ts` y quedan fuera de este refactor.
 */
export default class PostRepository {
  buscarPublicadoPorSlug(slug: string): Promise<{ id: number } | null> {
    return db.from('posts').select('id').where('slug', slug).where('estado', 'publicado').first()
  }
}
