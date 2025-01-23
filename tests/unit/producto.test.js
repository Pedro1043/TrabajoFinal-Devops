const express = require('express');
const request = require('supertest');
const { validationResult, body } = require('express-validator');

// Simulación de aplicación y modelo
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simulación del modelo Producto
class Producto {
  constructor({ nombre, descripcion, precio, stock }) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock;
  }
  static async findOne({ nombre }) {
    return null; // Simula que no se encontró ningún producto con ese nombre
  }
  async save() {
    return this; // Simula que el producto fue guardado
  }
}

// Ruta de creación de producto
app.post(
  '/producto/crear',
  [
    body('nombre').notEmpty().withMessage('Por favor ingrese un nombre de producto.'),
    body('descripcion').notEmpty().withMessage('Por favor ingrese una descripción del producto.'),
    body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.'),
    body('stock').isInt({ min: 0 }).withMessage('El stock debe ser un número entero no negativo.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(422).send(errores.array().map(err => err.msg).join('\n'));
    }

    const { nombre, descripcion, precio, stock } = req.body;

    try {
      const productoExistente = await Producto.findOne({ nombre });
      if (productoExistente) {
        return res.status(422).send('El producto ya está registrado.');
      }

      const nuevoProducto = new Producto({ nombre, descripcion, precio, stock });
      try {
        await nuevoProducto.save();
      } catch (error) {
        return res.status(500).send('Error al guardar el producto.');
      }

      res.status(201).send('Producto creado exitosamente');
    } catch (error) {
      res.status(500).send('Ocurrió un error en el servidor.');
    }
  }
);

// Pruebas
describe('Producto Controller - postCrear', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3002);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Producto.findOne = jest.fn().mockResolvedValue(null); // Resetea el mock
  });

  it('debería crear un nuevo producto exitosamente', async () => {
    const response = await request(server)
      .post('/producto/crear')
      .send({
        nombre: 'Producto 1',
        descripcion: 'Descripción del producto 1',
        precio: 100,
        stock: 10
      });

    expect(response.status).toBe(201);
    expect(response.text).toBe('Producto creado exitosamente');
    expect(Producto.findOne).toHaveBeenCalledWith({ nombre: 'Producto 1' });
  });

  it('debería devolver errores de validación', async () => {
    const response = await request(server)
      .post('/producto/crear')
      .send({
        nombre: '',
        descripcion: '',
        precio: -5,
        stock: -3
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Por favor ingrese un nombre de producto.');
    expect(response.text).toContain('Por favor ingrese una descripción del producto.');
    expect(response.text).toContain('El precio debe ser un número positivo.');
    expect(response.text).toContain('El stock debe ser un número entero no negativo.');
  });

  it('debería devolver un error si el producto ya está registrado', async () => {
    Producto.findOne = jest.fn().mockResolvedValue({ nombre: 'Producto 1' }); // Simula que el producto ya existe

    const response = await request(server)
      .post('/producto/crear')
      .send({
        nombre: 'Producto 1',
        descripcion: 'Descripción del producto 1',
        precio: 100,
        stock: 10
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('El producto ya está registrado.');
  });

  it('debería manejar errores al guardar el producto', async () => {
    Producto.prototype.save = jest.fn().mockRejectedValue(new Error('Error al guardar el producto'));

    const response = await request(server)
      .post('/producto/crear')
      .send({
        nombre: 'Producto 2',
        descripcion: 'Descripción del producto 2',
        precio: 200,
        stock: 5
      });

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error al guardar el producto.');
  });

  it('debería manejar errores generales en el servidor', async () => {
    Producto.findOne = jest.fn().mockRejectedValue(new Error('Error en el servidor'));

    const response = await request(server)
      .post('/producto/crear')
      .send({
        nombre: 'Producto 3',
        descripcion: 'Descripción del producto 3',
        precio: 150,
        stock: 8
      });

    expect(response.status).toBe(500);
    expect(response.text).toContain('Ocurrió un error en el servidor.');
  });
});
