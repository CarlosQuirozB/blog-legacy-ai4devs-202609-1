import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CAMPOS_COMENTARIO,
  FORMATO_CREADO_EN,
  contarComentarios,
  creadoEnEnMilisegundosUtc,
  filaComentario,
  insertarPost,
} from '#tests/fixtures/comentarios'

/**
 * Caracterización de POST /posts/:slug/comentarios.
 *
 * Fija lo que el endpoint hace HOY, bugs incluidos. Los tests marcados con
 * «BUG» describen un comportamiento que está mal según CLAUDE.md, pero que este
 * refactor no corrige: arreglarlo es otra tarea, con su propio test.
 */
test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const valido = {
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
  }

  test('crea el comentario como pendiente y devuelve la fila completa', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const ahora = Date.now()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(valido)

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])

    const comentario = cuerpo.comentario
    assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
    assert.isNumber(comentario.id)
    assert.strictEqual(comentario.post_id, 9001)
    assert.strictEqual(comentario.autor_nombre, 'Lucía Ferrer')
    assert.strictEqual(comentario.cuerpo, 'Un comentario suficientemente largo.')
    assert.strictEqual(comentario.estado, 'pendiente')
    assert.isNull(comentario.padre_id)

    // creado_en: volátil, así que se afirma su forma y que está en UTC (a ±2 min de ahora).
    assert.match(comentario.creado_en, FORMATO_CREADO_EN)
    assert.approximately(creadoEnEnMilisegundosUtc(comentario.creado_en), ahora, 2 * 60 * 1000)

    // BUG caracterizado (hallazgo 17): la respuesta devuelve el correo de quien comenta.
    assert.strictEqual(comentario.autor_email, 'lucia.ferrer@ejemplo.es')
    assert.notProperty(comentario, 'ok')
    assert.notProperty(comentario, 'motivo')

    // Lo devuelto es lo que quedó guardado.
    assert.deepEqual(await filaComentario(comentario.id), comentario)
  })

  test('acepta un cuerpo de exactamente cinco caracteres (frontera del mínimo)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, cuerpo: 'Hola!' })

    // Assert
    respuesta.assertStatus(201)
    assert.strictEqual(respuesta.body().comentario.cuerpo, 'Hola!')
    assert.strictEqual(respuesta.body().comentario.estado, 'pendiente')
  })

  test('un cuerpo de solo espacios cuenta como vacío: 200 {ok: false}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, cuerpo: '     ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('BUG: guarda padre_id tal cual, aunque no exista ese comentario', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, padre_id: 424242 })

    // Assert
    respuesta.assertStatus(201)
    assert.strictEqual(respuesta.body().comentario.padre_id, 424242)
    assert.strictEqual((await filaComentario(respuesta.body().comentario.id)).padre_id, 424242)
  })

  test('BUG: no valida el tipo: un nombre numérico se guarda como el texto "123.0"', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, autor_nombre: 123 })

    // Assert
    respuesta.assertStatus(201)
    assert.strictEqual(respuesta.body().comentario.autor_nombre, '123.0')
  })

  test('sin nombre responde 400 {error} y no guarda nada', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_email: valido.autor_email, cuerpo: valido.cuerpo })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('con el nombre vacío responde lo mismo que sin nombre', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, autor_nombre: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('sin email responde 422 {message}', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_nombre: valido.autor_nombre, cuerpo: valido.cuerpo })

    // Assert
    respuesta.assertStatus(422)
    assert.deepEqual(respuesta.body(), { message: 'Falta el email' })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('con un email sin arroba responde 400 {errores: [...]}', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, autor_email: 'lucia.ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('BUG: con un cuerpo de cuatro caracteres responde 200 {ok: false} y no guarda nada', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...valido, cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('BUG: sin cuerpo responde 200 {ok: false}', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_nombre: valido.autor_nombre, autor_email: valido.autor_email })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
  })

  test('el nombre se comprueba antes que el email', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('el email se comprueba antes que el cuerpo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_nombre: valido.autor_nombre, autor_email: 'sin-arroba', cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
  })

  test('en un post que no existe responde 404', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json(valido)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('en un post en borrador responde 404 (regla 1)', async ({ client, assert }) => {
    // Arrange
    await insertarPost({ estado: 'borrador' })
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(valido)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    assert.strictEqual(await contarComentarios(), antes)
  })

  test('el 404 del post va antes que la validación de la entrada', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })
})
