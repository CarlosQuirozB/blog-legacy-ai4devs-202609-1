import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import ComentarioBorradoTransformer from '#transformers/comentario_borrado_transformer'
import {
  autoriaComentarioValidator,
  borrarComentarioValidator,
  crearComentarioValidator,
  editarComentarioValidator,
} from '#validators/comentario'

@inject()
export default class ComentariosController {
  constructor(protected comentarios: ComentarioService) {}

  /**
   * POST /posts/:slug/comentarios
   *
   * El 404 del post se decide antes de validar la entrada, como hoy.
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const post = await this.comentarios.postPublicadoOFallar(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)
    const comentario = await this.comentarios.crear(post.id, datos)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  /** DELETE /comentarios/:id */
  async destroy({ request, serialize }: HttpContext) {
    const {
      params,
      autor_email: autorEmail,
      headers,
    } = await request.validateUsing(borrarComentarioValidator)
    const comentario = await this.comentarios.borrar(params.id, {
      autorEmail,
      claveModeracion: headers['x-clave-moderacion'],
    })

    return serialize.withoutWrapping(ComentarioBorradoTransformer.transform(comentario))
  }

  /**
   * PATCH /comentarios/:id
   *
   * Dos fases, porque hoy el 404 y el 403 se deciden antes de validar el cuerpo.
   */
  async update({ request, serialize }: HttpContext) {
    const { params, autor_email: autorEmail } = await request.validateUsing(
      autoriaComentarioValidator
    )
    const comentario = await this.comentarios.autorizarEdicion(params.id, autorEmail)

    const { cuerpo } = await request.validateUsing(editarComentarioValidator)
    const editado = await this.comentarios.editarCuerpo(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(editado) })
  }
}
