import app from '@adonisjs/core/services/app'
import { errors as erroresVine } from '@vinejs/vine'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { REGLAS } from '#validators/comentario'
import RecursoNoEncontradoException from '#exceptions/recurso_no_encontrado_exception'
import AccionNoPermitidaException from '#exceptions/accion_no_permitida_exception'

/**
 * Respuesta que los endpoints de comentarios dan hoy a cada error de validación.
 *
 * BUG caracterizado (hallazgo 12): cada error tiene un código y una forma
 * distintos, y un cuerpo corto responde 200. Se conservan tal cual hasta que se
 * decida unificarlos en otra tarea.
 */
const RESPUESTAS_DE_VALIDACION_DE_COMENTARIOS: Record<string, { status: number; cuerpo: object }> =
  {
    [REGLAS.nombreObligatorio]: { status: 400, cuerpo: { error: 'El nombre es obligatorio' } },
    [REGLAS.emailFalta]: { status: 422, cuerpo: { message: 'Falta el email' } },
    [REGLAS.emailNoValido]: { status: 400, cuerpo: { errores: ['email no válido'] } },
    [REGLAS.cuerpoCorto]: {
      status: 200,
      cuerpo: { ok: false, motivo: 'comentario demasiado corto' },
    },
    [REGLAS.cuerpoFalta]: { status: 400, cuerpo: { error: 'Falta el cuerpo' } },
  }

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * El 404 y el 403 de los comentarios son respuestas normales del contrato, no
   * fallos: no se registran en el log, igual que cuando las rutas respondían
   * directamente.
   */
  protected shouldReport(error: Parameters<ExceptionHandler['shouldReport']>[0]) {
    if (
      error instanceof RecursoNoEncontradoException ||
      error instanceof AccionNoPermitidaException
    ) {
      return false
    }
    return super.shouldReport(error)
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof erroresVine.E_VALIDATION_ERROR) {
      // Gana el primer error: el validador los informa en el orden de sus campos.
      const primero = error.messages?.[0]
      const respuesta = primero && RESPUESTAS_DE_VALIDACION_DE_COMENTARIOS[primero.rule]
      if (respuesta) {
        return ctx.response.status(respuesta.status).send(respuesta.cuerpo)
      }
    }

    if (
      error instanceof RecursoNoEncontradoException ||
      error instanceof AccionNoPermitidaException
    ) {
      return ctx.response.status(error.status).send({ error: error.message })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
