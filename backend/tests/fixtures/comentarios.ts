import db from '@adonisjs/lucid/services/db'

/**
 * Datos de prueba para los endpoints de comentarios.
 *
 * Los ids van en el rango 9000+ para no chocar con la semilla (posts 1-10,
 * comentarios 1-9), que sigue presente en la base de pruebas. Cada test corre
 * dentro de una transacción global, así que todo lo insertado se deshace.
 */

/** Las ocho columnas de `comentarios`, que es lo que hoy devuelve la API. */
export const CAMPOS_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]

/** Forma de `creado_en` tal como se guarda hoy: 'YYYY-MM-DD HH:MM:SS'. */
export const FORMATO_CREADO_EN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

export function unPost(cambios: Record<string, unknown> = {}) {
  return {
    id: 9001,
    titulo: 'Post de prueba',
    slug: 'post-de-prueba',
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...cambios,
  }
}

export function unComentario(cambios: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: 9001,
    autor_nombre: 'Ana Cortés',
    autor_email: 'ana.cortes@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
    estado: 'aprobado',
    creado_en: '2026-01-02 09:30:00',
    padre_id: null,
    ...cambios,
  }
}

export async function insertarPost(cambios: Record<string, unknown> = {}) {
  const post = unPost(cambios)
  await db.table('posts').insert(post)
  return post
}

export async function insertarComentario(cambios: Record<string, unknown> = {}) {
  const comentario = unComentario(cambios)
  await db.table('comentarios').insert(comentario)
  return comentario
}

export async function filaComentario(id: number) {
  return db.from('comentarios').where('id', id).first()
}

export async function contarComentarios() {
  const fila = await db.from('comentarios').count('* as total').first()
  return Number(fila.total)
}

/** `creado_en` se guarda en UTC: lo convierte a milisegundos para compararlo con ahora. */
export function creadoEnEnMilisegundosUtc(creadoEn: string) {
  return Date.parse(creadoEn.replace(' ', 'T') + 'Z')
}
