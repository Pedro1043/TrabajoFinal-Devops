const request = require('supertest');
const app = require('../../app.js');
const controllerUsuario = require('../../controllers/usuario.js');
const routerUsuario = require('../../routes/usuario.js');

describe('Actividad 6', () => {

    it('Debería registrar a un usuario nuevo', async () => {
        const req = {
            body: {
                nombres: 'Maria', 
                apellidos: 'Pérez', 
                email: 'mp@gmail.com', 
                password: '1234567890',
                password2: '1234567890'
            }
        };
        const res = await request(app).post('/signup').send(req);
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(nuevoUsuario);
    });
    
    it('Debería logearse', async () => {

    });
    
    it('Debería traer los productos', async () => {
        
    });

});