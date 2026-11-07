const API_URL = 'http://localhost:3000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Error en la petición');
    error.status = response.status;
    error.conflictCode = data.conflictCode;
    error.triggerMessage = data.triggerMessage;
    error.response = { data, status: response.status };
    throw error;
  }
  return data;
};

export const apiService = {
  async actualizarDocente(id, docente) {
    const res = await fetch(`${API_URL}/personas/docentes/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(docente) });
    return handleResponse(res);
  },
  // ═══════════════ PERSONAS ═══════════════
  async getDocentes() {
    const res = await fetch(`${API_URL}/personas/docentes`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getHorariosDocente(idDocente) {
    const res = await fetch(`${API_URL}/personas/docentes/${idDocente}/horarios`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async crearDocente(docente) {
    const res = await fetch(`${API_URL}/personas/docentes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(docente) });
    return handleResponse(res);
  },

  async getTiposDocumento() {
    const res = await fetch(`${API_URL}/personas/tipos-documento`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getNacionalidades() {
    const res = await fetch(`${API_URL}/personas/nacionalidades`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getTiposContrato() {
    const res = await fetch(`${API_URL}/personas/tipos-contrato`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // ═══════════════ INFRAESTRUCTURA ═══════════════
  async getAulas(filters = {}) {
    const params = new URLSearchParams();
    if (filters.pabellon) params.set('pabellon', filters.pabellon);
    if (filters.piso) params.set('piso', filters.piso);
    const query = params.toString();
    const res = await fetch(`${API_URL}/infraestructura/aulas${query ? `?${query}` : ''}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getRecursosAula(idAula) {
    const res = await fetch(`${API_URL}/infraestructura/aulas/${idAula}/recursos`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getPabellones() {
    const res = await fetch(`${API_URL}/infraestructura/pabellones`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getAulasPabellon(idPabellon) {
    const res = await fetch(`${API_URL}/infraestructura/pabellones/${idPabellon}/aulas`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // ═══════════════ HORARIOS ═══════════════
  async getBloques() {
    const res = await fetch(`${API_URL}/horarios/bloques`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getDias() {
    const res = await fetch(`${API_URL}/horarios/dias`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getDisponibilidad(idAula, idPeriodo) {
    const res = await fetch(`${API_URL}/horarios/disponibilidad/${idAula}/${idPeriodo}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getAulasDisponibles({ dia, bloque, periodo }) {
    const params = new URLSearchParams({ dia: String(dia), bloque: String(bloque) });
    if (periodo) params.set('periodo', String(periodo));
    const res = await fetch(`${API_URL}/aulas/disponibles?${params}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async crearHorariosLote(horarios) {
    return handleResponse(await fetch(`${API_URL}/horarios/clase/lote`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ horarios }) }));
  },
  async eliminarHorariosLote(ids) {
    return handleResponse(await fetch(`${API_URL}/horarios/clase/lote`, { method: 'DELETE', headers: getHeaders(), body: JSON.stringify({ ids }) }));
  },
  async crearHorarioClase(horario) {
    const res = await fetch(`${API_URL}/horarios/clase`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(horario),
    });
    return handleResponse(res);
  },

  async eliminarHorarioClase(id) {
    const res = await fetch(`${API_URL}/horarios/clase/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // ═══════════════ ACADÉMICO ═══════════════
  async getPeriodoActivo() {
    const res = await fetch(`${API_URL}/academico/periodos/activo`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getTiposClase() {
    const res = await fetch(`${API_URL}/academico/tipos-clase`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getPeriodos() {
    const res = await fetch(`${API_URL}/academico/periodos`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getCarreras() {
    const res = await fetch(`${API_URL}/academico/carreras`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async crearCarrera(carrera) {
    const res = await fetch(`${API_URL}/academico/carreras`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(carrera) });
    return handleResponse(res);
  },
  async getSemestres() {
    return handleResponse(await fetch(`${API_URL}/academico/semestres`, { headers: getHeaders() }));
  },
  async getConfiguracionMateria(id) {
    return handleResponse(await fetch(`${API_URL}/academico/materias/${id}/configuracion`, { headers: getHeaders() }));
  },
  async guardarConfiguracionMateria(id, body) {
    return handleResponse(await fetch(`${API_URL}/academico/materias/${id ? id + '/' : ''}configuracion`, { method: id ? 'PUT' : 'POST', headers: getHeaders(), body: JSON.stringify(body) }));
  },
  async crearPlan(plan) {
    const res = await fetch(`${API_URL}/academico/planes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(plan) });
    return handleResponse(res);
  },
  async getAreas() {
    const res = await fetch(`${API_URL}/academico/areas`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async getModalidades() {
    const res = await fetch(`${API_URL}/academico/modalidades`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMaterias() {
    const res = await fetch(`${API_URL}/academico/materias`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMateria(id) {
    const res = await fetch(`${API_URL}/academico/materias/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMateriaCarga(id) {
    const res = await fetch(`${API_URL}/academico/materias/${id}/carga`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async guardarCargaHoraria(idMateria, cargas) {
    const res = await fetch(`${API_URL}/academico/materias/${idMateria}/carga`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ cargas }),
    });
    return handleResponse(res);
  },

  async crearMateria(materia) {
    const res = await fetch(`${API_URL}/academico/materias`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(materia) });
    return handleResponse(res);
  },

  async actualizarMateria(id, materia) {
    const res = await fetch(`${API_URL}/academico/materias/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(materia) });
    return handleResponse(res);
  },

  async getPlanesCarrera(idCarrera) {
    const res = await fetch(`${API_URL}/academico/carreras/${idCarrera}/planes`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getPlanes() {
    const res = await fetch(`${API_URL}/academico/planes`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMateriasPlan(idPlan) {
    const res = await fetch(`${API_URL}/academico/planes/${idPlan}/materias`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async vincularMateriaPlan({ id_materia, id_plan, id_semestre }) {
    const res = await fetch(`${API_URL}/academico/materia-planes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id_materia, id_plan, id_semestre }),
    });
    return handleResponse(res);
  },

  async actualizarMateriaPlan(idMatPlan, { id_semestre }) {
    const res = await fetch(`${API_URL}/academico/materia-planes/${idMatPlan}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ id_semestre }),
    });
    return handleResponse(res);
  },

  async desvincularMateriaPlan(idMatPlan) {
    const res = await fetch(`${API_URL}/academico/materia-planes/${idMatPlan}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async vincularMateriaPlanConCarga(payload) {
    const res = await fetch(`${API_URL}/academico/planes/materias-configuracion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // ═══════════════ GRUPOS ═══════════════
  async getGruposPeriodo(idPeriodo) {
    const res = await fetch(`${API_URL}/academico/grupos/periodo/${idPeriodo}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getEstadosGrupo() {
    const res = await fetch(`${API_URL}/academico/estados-grupo`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async crearGrupo(grupo) {
    const res = await fetch(`${API_URL}/academico/grupos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(grupo),
    });
    return handleResponse(res);
  },

  async getDocentesGrupo(idGrupo) {
    const res = await fetch(`${API_URL}/academico/grupos/${idGrupo}/docentes`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getHorarioGrupo(idGrupo) {
    const res = await fetch(`${API_URL}/horarios/clase/grupo/${idGrupo}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async asignarDocenteGrupo(asignacion) {
    const res = await fetch(`${API_URL}/academico/grupos/asignar-docente`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(asignacion),
    });
    return handleResponse(res);
  },

  async desasignarDocenteGrupo({ id_grupo, id_docente, id_asig_doc }) {
    let url = `${API_URL}/academico/grupos/desasignar-docente`;
    if (id_asig_doc) {
      url = `${API_URL}/academico/asignaciones-docente/${id_asig_doc}`;
    } else if (id_grupo && id_docente) {
      url = `${API_URL}/academico/grupos/${id_grupo}/docentes/${id_docente}`;
    }
    const res = await fetch(url, {
      method: id_asig_doc || (id_grupo && id_docente) ? 'DELETE' : 'POST',
      headers: getHeaders(),
      body: !id_asig_doc && (!id_grupo || !id_docente) ? JSON.stringify({ id_grupo, id_docente }) : undefined,
    });
    return handleResponse(res);
  },

  // ═══════════════ SOLICITUDES ═══════════════
  async getTiposSolicitud() {
    const res = await fetch(`${API_URL}/solicitudes/tipos-solicitud`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getEstadosSolicitud() {
    const res = await fetch(`${API_URL}/solicitudes/estados-solicitud`, { headers: getHeaders() });
    return handleResponse(res);
  },
};
