import axios from 'axios';

const API_URL = 'http://localhost:3000/api/infraestructura';
const ROOT_API_URL = 'http://localhost:3000/api';

const client = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const aulasService = {
  // Catálogos
  async getTiposRecurso() { return (await client.get('/tipos-recurso')).data.tipos || []; },
  async getTiposAula() { return (await client.get('/tipos-aula')).data.tipos || []; },
  async getEstadosAula() { return (await client.get('/estados-aula')).data.estados || []; },
  async getFacultades() { return (await client.get('/facultades')).data.facultades || []; },

  // Pabellones
  async getPabellones() {
    const { data } = await client.get('/pabellones');
    return data.pabellones || [];
  },
  async getPabellon(id) {
    const { data } = await client.get(`/pabellones/${id}`);
    return data.pabellon;
  },
  async createPabellon(payload) {
    const { data } = await client.post('/pabellones', payload);
    return data;
  },
  async updatePabellon(id, payload) {
    const { data } = await client.put(`/pabellones/${id}`, payload);
    return data;
  },
  async deletePabellon(id) {
    const { data } = await client.delete(`/pabellones/${id}`);
    return data;
  },

  // Pisos
  async getPisos(idPabellon) {
    const { data } = await client.get(`/pabellones/${idPabellon}/pisos`);
    return data.pisos || [];
  },
  async createPiso(payload) {
    const { data } = await client.post('/pisos', payload);
    return data;
  },
  async updatePiso(id, payload) {
    const { data } = await client.put(`/pisos/${id}`, payload);
    return data;
  },
  async deletePiso(id) {
    const { data } = await client.delete(`/pisos/${id}`);
    return data;
  },

  // Aulas
  async getAulas({ pabellon, piso } = {}) {
    const { data } = await client.get('/aulas', { params: { pabellon, piso } });
    return data.aulas || [];
  },
  async getAula(id) {
    const { data } = await client.get(`/aulas/${id}`);
    return data.aula;
  },
  async createAula(payload) {
    const { data } = await client.post('/aulas', payload);
    return data;
  },
  async updateAula(id, payload) {
    const { data } = await client.put(`/aulas/${id}`, payload);
    return data;
  },
  async deleteAula(id, inhabilitar = false) {
    const { data } = await client.delete(`/aulas/${id}${inhabilitar ? '?inhabilitar=true' : ''}`);
    return data;
  },

  // Recursos
  async getRecursos(idAula) {
    const { data } = await client.get(`/aulas/${idAula}/recursos`);
    return data.recursos || [];
  },
  async addRecurso(idAula, payload) {
    return (await client.post(`/aulas/${idAula}/recursos`, payload)).data.recurso;
  },
  async removeRecurso(idAula, idRecAula) {
    return (await client.delete(`/aulas/${idAula}/recursos/${idRecAula}`)).data;
  },

  // Horarios y solicitudes
  async getHorario(idAula) {
    const { data } = await axios.get(`${ROOT_API_URL}/horarios/clase/aula/${idAula}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return data.horarios || [];
  },
  async reportarFalla(payload) {
    const { data } = await axios.post(`${ROOT_API_URL}/solicitudes/cambio`, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return data.solicitud;
  },
};
