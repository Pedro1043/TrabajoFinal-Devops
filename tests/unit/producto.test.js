const express = require('express');
const request = require('supertest');
const { validationResult, body } = require('express-validator');

// Simulación de aplicación y modelo
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simulación del modelo Producto
class Producto {
  constructor({ nombre, urlImagen, precio, descripcion, caracteristicas, categoria_id, idUsuario }) {
    this.nombre = nombre;
    this.urlImagen = urlImagen;
    this.precio = precio;
    this.descripcion = descripcion;
    this.caracteristicas = caracteristicas;
    this.categoria_id = categoria_id;
    this.idUsuario = idUsuario;
  }

  static async findOne({ nombre, categoria_id }) {
    // Simula la búsqueda de un producto con el mismo nombre en la misma categoría
    return null; // Cambiar para simular productos duplicados si es necesario
  }

  async save() {
    // Simula guardar el producto
    return this;
  }
}

// Ruta de creación de productos
app.post(
  '/producto/create',
  [
    body('nombre').notEmpty().withMessage('El nombre del producto es obligatorio.'),
    body('urlImagen').isURL().withMessage('La URL de la imagen no es válida.'),
    body('precio')
      .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.'),
    body('descripcion')
      .notEmpty().withMessage('La descripción no puede estar vacía.')
      .isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres.'),
    body('caracteristicas').notEmpty().withMessage('Las características son obligatorias.'),
    body('categoria_id').isInt().withMessage('El ID de la categoría debe ser un número válido.'),
    body('idUsuario').isInt().withMessage('El ID del usuario debe ser un número válido.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(422).send(errores.array().map(err => err.msg).join('\n'));
    }

    const { nombre, urlImagen, precio, descripcion, caracteristicas, categoria_id, idUsuario } = req.body;

    // Simulación de duplicado en la misma categoría
    const productoExistente = await Producto.findOne({ nombre, categoria_id });
    if (productoExistente) {
      return res.status(422).send('El producto con este nombre ya existe en la misma categoría.');
    }

    const nuevoProducto = new Producto({ nombre, urlImagen, precio, descripcion, caracteristicas, categoria_id, idUsuario });
    try {
      await nuevoProducto.save();
    } catch (error) {
      return res.status(500).send('Error al guardar el producto.');
    }

    res.status(201).send('Producto creado exitosamente');
  }
);

// Pruebas
describe('Producto Controller - postCreate', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería crear un nuevo producto exitosamente', async () => {
    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: 'Producto A',
        urlImagen: 'http://example.com/image.jpg',
        precio: 100,
        descripcion: 'Descripción del producto.',
        caracteristicas: 'Característica 1, Característica 2',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(201);
    expect(response.text).toBe('Producto creado exitosamente');
  });

  it('debería devolver error por nombre vacío', async () => {
    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: '',
        urlImagen: 'http://example.com/image.jpg',
        precio: 100,
        descripcion: 'Descripción',
        caracteristicas: 'Característica',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('El nombre del producto es obligatorio.');
  });

  it('debería devolver error por URL de imagen inválida', async () => {
    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: 'Producto B',
        urlImagen: 'invalid-url',
        precio: 100,
        descripcion: 'Descripción',
        caracteristicas: 'Característica',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('La URL de la imagen no es válida.');
  });

  it('debería devolver error por precio negativo', async () => {
    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: 'Producto C',
        urlImagen: 'http://example.com/image.jpg',
        precio: -50,
        descripcion: 'Descripción',
        caracteristicas: 'Característica',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('El precio debe ser un número positivo.');
  });

  it('debería devolver error por descripción vacía', async () => {
    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: 'Producto D',
        urlImagen: 'http://example.com/image.jpg',
        precio: 100,
        descripcion: '',
        caracteristicas: 'Característica',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('La descripción no puede estar vacía.');
  });

  it('debería devolver error por producto duplicado en la misma categoría', async () => {
    Producto.findOne = jest.fn().mockResolvedValue({ nombre: 'Producto D', categoria_id: 1 }); // Simulando un producto duplicado

    const response = await request(server)
      .post('/producto/create')
      .send({
        nombre: 'Producto D',
        urlImagen: 'http://example.com/image.jpg',
        precio: 100,
        descripcion: 'Descripción',
        caracteristicas: 'Característica',
        categoria_id: 1,
        idUsuario: 1
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('El producto con este nombre ya existe en la misma categoría.');
  });
});
