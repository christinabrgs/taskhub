
import request from 'supertest';
import app from '../server';

describe('App Endpoints', () => {
  it('should respond to the /test endpoint', async () => {
    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Test endpoint is working!');
  });
});
