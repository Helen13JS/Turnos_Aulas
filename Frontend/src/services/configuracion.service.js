import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:3000/api', headers: { 'Content-Type': 'application/json' } });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const configuracionService = {
  async getDirecciones() { return (await client.get('/academico/direcciones')).data.direcciones || []; },
  async createDireccion(payload) { return (await client.post('/academico/direcciones', payload)).data; },
  async assignCarrera(idDireccion, idCarrera) { return (await client.put(`/academico/direcciones/${idDireccion}/carreras/${idCarrera}`)).data; },
  async createUser(payload) { return (await client.post('/auth/register', payload)).data; },
  async updateUserRole(id, payload) { return (await client.put(`/auth/usuarios/${id}/rol`, payload)).data; },
  async getUsuarios() {
    const { data } = await client.get('/auth/usuarios');
    return data.usuarios || [];
  },
  async updatePassword(payload) {
    const { data } = await client.put('/auth/password', payload);
    return data;
  },
  async getFacultades() {
    const { data } = await client.get('/academico/facultades');
    return data.facultades || [];
  },
  async getCarreras() {
    const { data } = await client.get('/academico/carreras');
    return data.carreras || [];
  },
  async getPeriodos() {
    const { data } = await client.get('/academico/periodos');
    return data.periodos || [];
  },
  async getPeriodoActivo() {
    const { data } = await client.get('/academico/periodos/activo');
    return data.periodo || null;
  },
};
