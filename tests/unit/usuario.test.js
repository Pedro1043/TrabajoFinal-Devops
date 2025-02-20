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
    body('nombres').notEmpty().withMessage('Por favor ingrese un nombre.'),
    body('apellidos').notEmpty().withMessage('Por favor ingrese un apellido.'),
    body('email')
      .notEmpty().withMessage('Por favor ingrese un correo electrónico.')
      .isEmail().withMessage('Por favor ingrese un correo electrónico válido.'),
    body('password')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('password2')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Las contraseñas no coinciden.'),
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

      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(password, 12);
      } catch (error) {
        return res.status(500).send('Error al generar el hash de la contraseña.');
      }

      const nuevoUsuario = new Usuario({ nombres, apellidos, email, password: hashedPassword });
      try {
        await nuevoUsuario.save();
      } catch (error) {
        return res.status(500).send('Error al guardar el usuario.');
      }

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
    Usuario.findOne = jest.fn().mockResolvedValue(null); // Resetea el mock
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
    expect(Usuario.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
  });

  it('debería devolver errores de validación', async () => {
    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: '',
        apellidos: '',
        email: 'invalid-email',
        password: 'pass',
        password2: 'different'
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Por favor ingrese un nombre.');
    expect(response.text).toContain('Por favor ingrese un apellido.');
    expect(response.text).toContain('Por favor ingrese un correo electrónico válido.');
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
    expect(response.text).toContain('Error al generar el hash de la contraseña.');
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
    expect(response.text).toContain('Error al guardar el usuario.');
  });
});

//usuario/Login


app.post('/usuario/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send('Por favor ingrese un correo electrónico y una contraseña.');
  }

  try {
    const usuario = await Usuario.findOne({ email });

    if (!usuario || !await bcrypt.compare(password, usuario.password)) {
      return res.status(401).send('Correo electrónico o contraseña incorrectos.');
    }

    res.status(200).send('Login exitoso!');
  } catch (error) {
    res.status(500).send('Ocurrió un error en el servidor.');
  }
});

module.exports = app;

// Pruebas
describe('Usuario Controller - postLogin', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería loguearse exitosamente con credenciales correctas', async () => {
    
    Usuario.findOne = jest.fn().mockResolvedValue({
      email: 'john.doe@example.com',
      password: 'hashedPassword123'
    });

    bcrypt.compare = jest.fn().mockResolvedValue(true);

    const response = await request(server)
      .post('/usuario/login')
      .send({
        email: 'john.doe@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('Login exitoso!');
  });

  it('debería devolver errores de validación si los datos no son válidos', async () => {
    const response = await request(server)
      .post('/usuario/login')
      .send({
        email: '',
        password: ''
      });

    expect(response.status).toBe(422);
    expect(response.text).toBe('Por favor ingrese un correo electrónico y una contraseña.');
  });

  it('debería manejar errores de servidor', async () => {
    Usuario.findOne = jest.fn().mockRejectedValue(new Error('Error de base de datos'));

    const response = await request(server)
      .post('/usuario/login')
      .send({
        email: 'john.doe@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(500);
    
    expect(response.text).toContain('Ocurrió un error en el servidor.');
  });
});


