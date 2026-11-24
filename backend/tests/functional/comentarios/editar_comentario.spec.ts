import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CAMPOS_COMENTARIO,
  filaComentario,
  insertarComentario,
  insertarPost,
} from '#tests/fixtures/comentarios'

/**
 * Caracterización de PATCH /comentarios/:id.
 *
 * Fija lo que el endpoint hace HOY, bugs incluidos. Los tests marcados con
 * «BUG» no se corrigen en este refactor.
 */
test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const pendiente = {
    estado: 'pendiente',
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
  }

  test('quien lo escribió edita el cuerpo de un comentario pendiente', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const original = await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(200)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    assert.sameMembers(Object.keys(cuerpo.comentario), CAMPOS_COMENTARIO)

    // Solo cambia el cuerpo; el resto de la fila sale tal cual, con sus tipos.
    // BUG caracterizado (hallazgo 17): incluye el correo de quien comenta.
    assert.deepEqual(cuerpo.comentario, { ...original, cuerpo: 'Cuerpo corregido.' })
    assert.isNumber(cuerpo.comentario.id)
    assert.isString(cuerpo.comentario.estado)
    assert.deepEqual(await filaComentario(9101), cuerpo.comentario)
  })

  test('BUG: acepta un cuerpo de un carácter, aunque al crear se exigen cinco', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'a' })

    // Assert
    respuesta.assertStatus(200)
    assert.strictEqual(respuesta.body().comentario.cuerpo, 'a')
    assert.strictEqual((await filaComentario(9101)).cuerpo, 'a')
  })

  test('sin cuerpo responde 400 {error} y no cambia nada', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const original = await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    assert.deepEqual(await filaComentario(9101), original)
  })

  test('con el cuerpo vacío responde lo mismo que sin cuerpo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
  })

  test('BUG: compara el correo distinguiendo mayúsculas (al borrar no)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const original = await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'Lucia.Ferrer@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.deepEqual(await filaComentario(9101), original)
  })

  test('un comentario ya aprobado no se puede editar (solo pendientes)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const original = await insertarComentario({ ...pendiente, estado: 'aprobado' })

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.deepEqual(await filaComentario(9101), original)
  })

  test('BUG: la clave de moderación no sirve para editar (al borrar sí)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .header('x-clave-moderacion', 'dev-secret-cambiar')
      .json({ cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('sin correo responde 403', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario(pendiente)

    // Act
    const respuesta = await client.patch('/comentarios/9101').json({ cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('el 403 va antes que la validación del cuerpo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario(pendiente)

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('un comentario que no existe responde 404', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .patch('/comentarios/999999')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })
})
