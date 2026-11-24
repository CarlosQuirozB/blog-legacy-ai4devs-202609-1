import Comentario from '#models/comentario'

export type DatosNuevoComentario = {
  postId: number
  autorNombre: unknown
  autorEmail: unknown
  cuerpo: unknown
  estado: string
  creadoEn: string
  padreId: unknown
}

/**
 * Todo el acceso a la tabla `comentarios`.
 */
export default class ComentarioRepository {
  /** `id` llega tal cual de la URL, como en el código legacy. */
  buscarPorId(id: string | number) {
    return Comentario.find(id)
  }

  async crear(datos: DatosNuevoComentario) {
    await Comentario.create(datos as Partial<Comentario>)
  }

  /**
   * BUG caracterizado (hallazgo 4): devuelve el último comentario de la tabla,
   * no el que se acaba de crear. Con dos peticiones a la vez, una puede recibir
   * el comentario de la otra.
   */
  ultimoDeLaTabla() {
    return Comentario.query().orderBy('id', 'desc').firstOrFail()
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: unknown) {
    comentario.cuerpo = cuerpo as string
    await comentario.save()
  }

  /**
   * Borrado físico y sin cascada: las respuestas del comentario se quedan
   * huérfanas (hallazgo 9).
   */
  async borrar(comentario: Comentario) {
    await comentario.delete()
  }
}
