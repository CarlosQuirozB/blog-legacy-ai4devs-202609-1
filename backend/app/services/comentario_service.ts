import { inject } from '@adonisjs/core'
import type Comentario from '#models/comentario'
import ComentarioRepository from '#repositories/comentario_repository'
import PostRepository from '#repositories/post_repository'
import RecursoNoEncontradoException from '#exceptions/recurso_no_encontrado_exception'
import AccionNoPermitidaException from '#exceptions/accion_no_permitida_exception'

/**
 * BUG caracterizado (hallazgo 3): la clave de moderación está escrita en el
 * código y está en el historial de git. Se ha movido aquí desde
 * `start/routes.ts` sin cambiar su valor.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

type Autoria = Pick<Comentario, 'autorEmail' | 'estado'>

/**
 * Borra quien escribió el comentario (correo sin distinguir mayúsculas ni
 * espacios) o cualquiera que traiga la clave de moderación.
 *
 * BUG caracterizado (hallazgo 2): el correo funciona como credencial, y el de
 * cualquier comentario aprobado es público.
 */
export function puedeBorrar(comentario: Autoria, autorEmail: unknown, clave: unknown) {
  const esModerador = clave === CLAVE_MODERACION
  const esAutor =
    String(comentario.autorEmail).toLowerCase().trim() === String(autorEmail).toLowerCase().trim()
  return esModerador || esAutor
}

/**
 * Edita solo quien trae exactamente el mismo correo, y solo mientras el
 * comentario sigue pendiente.
 *
 * BUG caracterizado (hallazgo 11): esta regla no coincide con la de borrar.
 * Aquí se distinguen mayúsculas y la clave de moderación no sirve.
 */
export function puedeEditar(comentario: Autoria, autorEmail: unknown) {
  return comentario.autorEmail === autorEmail && comentario.estado === 'pendiente'
}

/** Si no llega correo se compara con '', como hacía `request.input('autor_email', '')`. */
function correoRecibido(autorEmail: unknown) {
  return autorEmail === undefined ? '' : autorEmail
}

/** 'YYYY-MM-DD HH:MM:SS' en UTC, el formato que hoy se guarda en `creado_en`. */
function ahoraEnUtc() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export type DatosComentario = {
  autor_nombre?: unknown
  autor_email?: unknown
  cuerpo?: unknown
  padre_id?: unknown
}

/**
 * Reglas de negocio de los comentarios. Es el único sitio que cambia su estado.
 */
@inject()
export class ComentarioService {
  constructor(
    protected comentarios: ComentarioRepository,
    protected posts: PostRepository
  ) {}

  /** Solo se comenta en posts publicados: un borrador responde igual que si no existiera. */
  async postPublicadoOFallar(slug: string) {
    const post = await this.posts.buscarPublicadoPorSlug(slug)
    if (!post) {
      throw new RecursoNoEncontradoException('Post no encontrado')
    }
    return post
  }

  /** Todo comentario nuevo entra como 'pendiente' de moderación. */
  async crear(postId: number, datos: DatosComentario) {
    await this.comentarios.crear({
      postId,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: ahoraEnUtc(),
      padreId: datos.padre_id ?? null,
    })

    return this.comentarios.ultimoDeLaTabla()
  }

  async borrar(id: string, credenciales: { autorEmail: unknown; claveModeracion: unknown }) {
    const comentario = await this.encontrarOFallar(id)
    const autorEmail = correoRecibido(credenciales.autorEmail)
    if (!puedeBorrar(comentario, autorEmail, credenciales.claveModeracion)) {
      throw new AccionNoPermitidaException('No puedes borrar este comentario')
    }

    await this.comentarios.borrar(comentario)
    return comentario
  }

  /**
   * Comprueba que el comentario existe y que quien lo pide puede editarlo. Va
   * separado de `editarCuerpo` porque hoy el 404 y el 403 se deciden antes de
   * validar el cuerpo.
   */
  async autorizarEdicion(id: string, autorEmail: unknown) {
    const comentario = await this.encontrarOFallar(id)
    if (!puedeEditar(comentario, correoRecibido(autorEmail))) {
      throw new AccionNoPermitidaException('No puedes editar este comentario')
    }
    return comentario
  }

  async editarCuerpo(comentario: Comentario, cuerpo: unknown) {
    await this.comentarios.actualizarCuerpo(comentario, cuerpo)
    return this.encontrarOFallar(comentario.id)
  }

  protected async encontrarOFallar(id: string | number) {
    const comentario = await this.comentarios.buscarPorId(id)
    if (!comentario) {
      throw new RecursoNoEncontradoException('Comentario no encontrado')
    }
    return comentario
  }
}
