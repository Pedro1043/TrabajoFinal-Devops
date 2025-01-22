const request = require('supertest');
const app = require('../../app');
const Usuario = require('../../models/usuario');
const bcrypt = require('bcryptjs');
const { validationResult, body } = require('express-validator');

// Mock de los módulos utilizados
jest.mock('../../models/usuario');
jest.mock('bcryptjs');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
  body: jest.fn().mockReturnValue({
    notEmpty: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    bail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),  
    isLength: jest.fn().mockReturnThis(),  
    matches: jest.fn().mockReturnThis(),  
  }),
  check: jest.fn().mockReturnThis(),
}));

describe('Usuario Controller - postSignup', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3000);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Limpia todos los mocks antes de cada prueba

    // Mocks para el modelo Usuario
    Usuario.findOne.mockResolvedValue(null); // Simula que no se encontró un usuario
    Usuario.prototype.save = jest.fn(); // Mocks para guardar un nuevo usuario

    // Mock para bcrypt.hash (simula el hash de contraseñas)
    bcrypt.hash.mockResolvedValue('hashedPassword');

    // Mock para validationResult (simula resultados de validaciones)
    validationResult.mockReturnValue({ isEmpty: () => true });
  });

  it('should create a new user successfully', async () => {
    // Prueba cuando todo es válido
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
    expect(Usuario.prototype.save).toHaveBeenCalled();
  });

  it('should return validation errors', async () => {
    // Simulando error de validación
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Validation error' }]
    });

    const response = await request(server)
      .post('/usuario/signup')
      .send({
        nombres: 'John',
        apellidos: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        password2: 'password123'
      });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Validation error');
  });

  it('should handle bcrypt hash errors', async () => {
    // Simulando error al realizar el hash de la contraseña
    validationResult.mockReturnValue({ isEmpty: () => true });
    bcrypt.hash.mockRejectedValue(new Error('Hashing error'));

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
    expect(response.text).toContain('Error');
  });

  it('should handle user save errors', async () => {
    // Simulando error al guardar el usuario
    validationResult.mockReturnValue({ isEmpty: () => true });
    bcrypt.hash.mockResolvedValue('hashedPassword');
    Usuario.prototype.save.mockRejectedValue(new Error('Save error'));

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
    expect(response.text).toContain('Error');
  });
});
