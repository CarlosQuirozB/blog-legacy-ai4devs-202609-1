import { test } from '@japa/runner'
import { puedeBorrar, puedeEditar } from '#services/comentario_service'

/**
 * Reglas de permiso de los comentarios, tal como funcionan hoy.
 *
 * Borrar y editar usan reglas distintas (hallazgo 11): esta prueba fija las
 * dos tal cual, sin unificarlas.
 */
test.group('puedeBorrar', () => {
  const comentario = { autorEmail: 'ana.cortes@ejemplo.es', estado: 'aprobado' }

  test('permite a quien trae el mismo correo', ({ assert }) => {
    // Act + Assert
    assert.isTrue(puedeBorrar(comentario, 'ana.cortes@ejemplo.es', undefined))
  })

  test('compara el correo sin distinguir mayúsculas ni espacios', ({ assert }) => {
    // Act + Assert
    assert.isTrue(puedeBorrar(comentario, '  ANA.Cortes@Ejemplo.ES ', undefined))
  })

  test('permite a quien trae la clave de moderación, sin correo', ({ assert }) => {
    // Act + Assert
    assert.isTrue(puedeBorrar(comentario, '', 'dev-secret-cambiar'))
  })

  test('rechaza un correo ajeno', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeBorrar(comentario, 'otra.persona@ejemplo.es', undefined))
  })

  test('rechaza una clave equivocada', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeBorrar(comentario, '', 'otra-clave'))
  })

  test('rechaza a quien no trae ni correo ni clave', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeBorrar(comentario, '', undefined))
  })
})

test.group('puedeEditar', () => {
  const pendiente = { autorEmail: 'lucia.ferrer@ejemplo.es', estado: 'pendiente' }

  test('permite a quien trae exactamente el mismo correo si sigue pendiente', ({ assert }) => {
    // Act + Assert
    assert.isTrue(puedeEditar(pendiente, 'lucia.ferrer@ejemplo.es'))
  })

  test('distingue mayúsculas en el correo', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeEditar(pendiente, 'Lucia.Ferrer@ejemplo.es'))
  })

  test('no permite editar un comentario que ya no está pendiente', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeEditar({ ...pendiente, estado: 'aprobado' }, 'lucia.ferrer@ejemplo.es'))
  })

  test('rechaza a quien no trae correo', ({ assert }) => {
    // Act + Assert
    assert.isFalse(puedeEditar(pendiente, ''))
  })
})
