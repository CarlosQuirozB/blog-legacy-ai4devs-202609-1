import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { filaComentario, insertarComentario, insertarPost } from '#tests/fixtures/comentarios'

/**
 * Caracterización de DELETE /comentarios/:id.
 *
 * Fija lo que el endpoint hace HOY, bugs incluidos. Los tests marcados con
 * «BUG» no se corrigen en este refactor.
 */
test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const CLAVE_MODERACION = 'dev-secret-cambiar'

  test('quien lo escribió lo borra con su correo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await filaComentario(9101))
  })

  test('compara el correo sin distinguir mayúsculas ni espacios', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: '  ANA.Cortes@Ejemplo.ES  ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await filaComentario(9101))
  })

  test('BUG: la clave de moderación escrita en el código permite borrar sin correo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    await insertarComentario({ estado: 'pendiente' })

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await filaComentario(9101))
  })

  test('BUG: acepta el correo en la query string', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .qs({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await filaComentario(9101))
  })

  test('con un correo ajeno responde 403 y no borra', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const comentario = await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.deepEqual(await filaComentario(9101), comentario)
  })

  test('sin correo ni clave responde 403', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()

    // Act
    const respuesta = await client.delete('/comentarios/9101')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isNotNull(await filaComentario(9101))
  })

  test('con una clave de moderación equivocada responde 403', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isNotNull(await filaComentario(9101))
  })

  test('un comentario que no existe responde 404', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .delete('/comentarios/999999')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('el 404 va antes que la comprobación de permisos', async ({ client, assert }) => {
    // Act
    const respuesta = await client.delete('/comentarios/999999')

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('BUG: borrar un comentario deja huérfanas sus respuestas', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    await insertarComentario()
    const respuestaHija = await insertarComentario({
      id: 9102,
      autor_nombre: 'Rubén Lima',
      autor_email: 'ruben.lima@ejemplo.es',
      padre_id: 9101,
    })

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isNull(await filaComentario(9101))
    assert.deepEqual(await filaComentario(9102), respuestaHija)
  })

  test('BUG: deja borrar comentarios de un post en borrador', async ({ client, assert }) => {
    // Arrange
    await insertarPost({ estado: 'borrador' })
    await insertarComentario()

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await filaComentario(9101))
  })
})
