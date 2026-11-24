import vine from '@vinejs/vine'

/**
 * Validadores de los endpoints de comentarios.
 *
 * Reproducen al pie de la letra la validación del código legacy, que comprobaba
 * si el valor era «verdadero» en JavaScript y no su tipo. Por eso los campos son
 * `vine.any()` con reglas propias: un nombre numérico se sigue aceptando, como
 * hoy. Las reglas son `implicit` para que también se ejecuten cuando el campo
 * falta.
 *
 * Cada regla reporta un nombre propio. `app/exceptions/handler.ts` traduce ese
 * nombre al código de estado y al cuerpo que la API devuelve hoy.
 */

export const REGLAS = {
  nombreObligatorio: 'comentarioNombreObligatorio',
  emailFalta: 'comentarioEmailFalta',
  emailNoValido: 'comentarioEmailNoValido',
  cuerpoCorto: 'comentarioCuerpoCorto',
  cuerpoFalta: 'comentarioCuerpoFalta',
} as const

const nombreObligatorio = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('El nombre es obligatorio', REGLAS.nombreObligatorio, campo)
    }
  },
  { implicit: true }
)

/** BUG caracterizado: del correo solo se comprueba que contenga una '@'. */
const emailConArroba = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('Falta el email', REGLAS.emailFalta, campo)
    } else if (String(valor).indexOf('@') === -1) {
      campo.report('email no válido', REGLAS.emailNoValido, campo)
    }
  },
  { implicit: true }
)

const cuerpoDeCincoCaracteres = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor || String(valor).length < 5) {
      campo.report('comentario demasiado corto', REGLAS.cuerpoCorto, campo)
    }
  },
  { implicit: true }
)

/** BUG caracterizado (hallazgo 10): al editar no se exige longitud mínima. */
const cuerpoObligatorio = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('Falta el cuerpo', REGLAS.cuerpoFalta, campo)
    }
  },
  { implicit: true }
)

/**
 * POST /posts/:slug/comentarios. El orden de los campos es el orden en que
 * se informan los errores: nombre, email y cuerpo.
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.any().optional().use(nombreObligatorio()),
  autor_email: vine.any().optional().use(emailConArroba()),
  cuerpo: vine.any().optional().use(cuerpoDeCincoCaracteres()),
  /** BUG caracterizado (hallazgo 8): no se valida. */
  padre_id: vine.any().optional(),
})

/**
 * DELETE /comentarios/:id. El correo puede llegar en el cuerpo o en la query
 * string (hallazgo 21), y la clave de moderación en la cabecera.
 */
export const borrarComentarioValidator = vine.create({
  params: vine.object({ id: vine.string() }),
  autor_email: vine.any().optional(),
  headers: vine.object({
    'x-clave-moderacion': vine.any().optional(),
  }),
})

/** PATCH /comentarios/:id, primera fase: quién lo pide. */
export const autoriaComentarioValidator = vine.create({
  params: vine.object({ id: vine.string() }),
  autor_email: vine.any().optional(),
})

/** PATCH /comentarios/:id, segunda fase: el cuerpo nuevo. */
export const editarComentarioValidator = vine.create({
  cuerpo: vine.any().optional().use(cuerpoObligatorio()),
})
