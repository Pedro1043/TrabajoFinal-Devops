const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { validationResult, body } = require('express-validator');

// Simulación de aplicación y modelo
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simulación del modelo Usuario
class Usuario {
  constructor({ nombres, apellidos, email, password }) {
    this.nombres = nombres;
    this.apellidos = apellidos;
    this.email = email;
    this.password = password;
  }
  static async findOne({ email }) {
    return null; // Simula que no se encontró ningún usuario
  }
  async save() {
    return this; // Simula que el usuario fue guardado
  }
}

// Ruta de signup
app.post(
  '/usuario/signup',
  [
    body('email')
      .notEmpty().withMessage('Por favor ingrese un correo electrónico.')
      .isEmail().withMessage('Por favor ingrese un correo electrónico válido.'),
    body('password')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('password2')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Las contraseñas no coinciden.')
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(422).send(errores.array().map(err => err.msg).join('\n'));
    }

    const { nombres, apellidos, email, password } = req.body;

    try {
      const usuarioExistente = await Usuario.findOne({ email });
      if (usuarioExistente) {
        return res.status(422).send('El correo ya está registrado.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const nuevoUsuario = new Usuario({ nombres, apellidos, email, password: hashedPassword });
      await nuevoUsuario.save();

      res.status(302).header('Location', '/usuario/login').send();
    } catch (error) {
      res.status(500).send('Ocurrió un error en el servidor.');
    }
  }
);

// Pruebas
describe('Usuario Controller - postSignup', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
  });

  it('debería crear un nuevo usuario exitosamente', async () => {
    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: 'John',
        apellidos: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        password2: 'password123'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/usuario/login');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
  });

  it('debería devolver errores de validación', async () => {
    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: 'John',
        apellidos: 'Doe',
        email: '',
        password: 'pass',
        password2: 'different'
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Por favor ingrese un correo electrónico.');
    expect(response.text).toContain('La contraseña debe tener al menos 6 caracteres.');
    expect(response.text).toContain('Las contraseñas no coinciden.');
  });

  it('debería manejar errores en el hash de la contraseña', async () => {
    bcrypt.hash.mockRejectedValue(new Error('Error al generar el hash'));

    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: 'John',
        apellidos: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        password2: 'password123'
      });

    expect(response.status).toBe(500);
    expect(response.text).toContain('Ocurrió un error en el servidor.');
  });

  it('debería manejar errores al guardar el usuario', async () => {
    Usuario.prototype.save = jest.fn().mockRejectedValue(new Error('Error al guardar'));

    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: 'John',
        apellidos: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        password2: 'password123'
      });

    expect(response.status).toBe(500);
    expect(response.text).toContain('Ocurrió un error en el servidor.');
  });
});