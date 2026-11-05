import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api.service';

export const fullName = (d) => `${d.nombres || ''} ${d.apellidos || ''}`.trim();

// Fuente única de datos del distributivo (docente ↔ grupo/materia) compartida por ambas pestañas.
export function useDistributivo() {
  const [periodo, setPeriodo] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargaPorMateria, setCargaPorMateria] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAsignaciones = useCallback(async (groupList) => {
    const [porGrupo, cargas] = await Promise.all([
      Promise.all(groupList.map(async (grupo) => {
        try {
          const res = await apiService.getDocentesGrupo(grupo.id_grupo);
          return (res.docentes || []).map((d) => ({
            id_asig_doc: d.id_asig_doc,
            id_docente: d.id_docente,
            docente: fullName(d),
            grupo,
          }));
        } catch { return []; }
      })),
      Promise.all([...new Set(groupList.map((g) => g.id_materia))].map(async (id) => {
        try { return [id, (await apiService.getMateriaCarga(id)).carga || []]; } catch { return [id, []]; }
      })),
    ]);
    const unicas = new Map(porGrupo.flat().map((a) => [`${a.id_docente}-${a.grupo.id_grupo}`, a]));
    setAsignaciones([...unicas.values()]);
    setCargaPorMateria(Object.fromEntries(cargas));
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, d] = await Promise.all([apiService.getPeriodoActivo(), apiService.getDocentes()]);
      const active = p.periodo || null;
      setPeriodo(active);
      setDocentes(d.docentes || []);
      if (active) {
        const g = (await apiService.getGruposPeriodo(active.id_periodo)).grupos || [];
        setGrupos(g);
        await loadAsignaciones(g);
      }
    } catch (e) {
      setError(e.message || 'No se pudo cargar el distributivo.');
    } finally {
      setLoading(false);
    }
  }, [loadAsignaciones]);

  useEffect(() => { load(); }, [load]);

  const asignarDocente = useCallback(async ({ id_docente, id_grupo }) => {
    await apiService.asignarDocenteGrupo({ id_docente, id_grupo });
    await loadAsignaciones(grupos);
  }, [grupos, loadAsignaciones]);

  const desasignarDocente = useCallback(async ({ id_docente, id_grupo, id_asig_doc }) => {
    await apiService.desasignarDocenteGrupo({ id_docente, id_grupo, id_asig_doc });
    await loadAsignaciones(grupos);
  }, [grupos, loadAsignaciones]);

  return { periodo, docentes, grupos, asignaciones, cargaPorMateria, loading, error, asignarDocente, desasignarDocente, reload: load };
}
