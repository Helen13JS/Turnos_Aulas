import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Download, Plus, User } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { aulasService } from '../../services/aulas.service';
import ModuleSidebar from '../Layout/ModuleSidebar';
import '../Academico/Academico.css';
import './Aulas.css';
import AulaCard from './AulaCard';
import AulasStatsGrid from './AulasStatsGrid';
import AulasToolbar from './AulasToolbar';
import { useAuth } from '../../context/AuthContext';
import RecursosModal from './RecursosModal';
import AulaModal from './AulaModal';
import PabellonModal from './PabellonModal';

export default function AulasView() {
  const { canManageInfrastructure: canManage } = useAuth();
  const [resourceAula, setResourceAula] = useState(null);
  const [editingAula, setEditingAula] = useState(null);
  const [showAulaModal, setShowAulaModal] = useState(false);
  const [showPabellonModal, setShowPabellonModal] = useState(false);

  const user = authService.getCurrentUser();
  const [pabellones, setPabellones] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [resources, setResources] = useState({});
  const [tiposAula, setTiposAula] = useState([]);
  const [estadosAula, setEstadosAula] = useState([]);
  const [facultades, setFacultades] = useState([]);

  const [selectedPabellon, setSelectedPabellon] = useState('');
  const [selectedPiso, setSelectedPiso] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState('');

  // Carga de catálogos iniciales
  const reloadPabellones = async (selectNewId = null) => {
    try {
      const data = await aulasService.getPabellones();
      setPabellones(data);
      if (selectNewId) {
        setSelectedPabellon(String(selectNewId));
      } else if (!selectedPabellon && data[0]) {
        setSelectedPabellon(String(data[0].id_pabellon));
      }
      return data;
    } catch {
      setError('No se pudieron cargar los pabellones.');
      return [];
    }
  };

  useEffect(() => {
    Promise.all([
      reloadPabellones(),
      aulasService.getTiposAula().catch(() => []),
      aulasService.getEstadosAula().catch(() => []),
      aulasService.getFacultades().catch(() => [])
    ]).then(([, tipos, estados, facs]) => {
      setTiposAula(tipos);
      setEstadosAula(estados);
      setFacultades(facs);
    }).finally(() => setLoading(false));
  }, []);

  const reloadPisos = async (pabellonId) => {
    if (!pabellonId) {
      setPisos([]);
      return;
    }
    try {
      const data = await aulasService.getPisos(pabellonId);
      setPisos(data);
    } catch {
      setPisos([]);
    }
  };

  useEffect(() => {
    if (!selectedPabellon) return;
    setSelectedPiso('');
    reloadPisos(selectedPabellon);
  }, [selectedPabellon]);

  const reloadAulas = async () => {
    if (!selectedPabellon) return;
    setLoading(true);
    setError('');
    try {
      const data = await aulasService.getAulas({
        pabellon: selectedPabellon,
        piso: selectedPiso || undefined
      });
      setAulas(data);
      const resourcePairs = await Promise.all(
        data.map(async (aula) => {
          try {
            return [aula.id_aula, await aulasService.getRecursos(aula.id_aula)];
          } catch {
            return [aula.id_aula, []];
          }
        })
      );
      setResources(Object.fromEntries(resourcePairs));
    } catch {
      setAulas([]);
      setError('No se pudieron cargar las aulas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAulas();
  }, [selectedPabellon, selectedPiso]);

  const filteredAulas = useMemo(() => aulas.filter((aula) => {
    const equipmentText = (resources[aula.id_aula] || [])
      .map((resource) => `${resource.descripcion} ${resource.tipo_recurso}`)
      .join(' ');
    return `${aula.nombre_codigo} ${aula.capacidad_maxima} ${aula.tipo_aula} ${equipmentText}`
      .toLowerCase()
      .includes(search.toLowerCase());
  }), [aulas, resources, search]);

  const stats = useMemo(() => ({
    total: aulas.length,
    operativas: aulas.filter((aula) => !`${aula.estado_aula}`.toLowerCase().includes('mantenimiento') && !`${aula.estado_aula}`.toLowerCase().includes('inactiv')).length,
    mantenimiento: aulas.filter((aula) => `${aula.estado_aula}`.toLowerCase().includes('mantenimiento') || `${aula.estado_aula}`.toLowerCase().includes('inactiv')).length,
    capacidad: aulas.reduce((sum, aula) => sum + Number(aula.capacidad_maxima || 0), 0)
  }), [aulas]);

  const viewSchedule = async (aula) => {
    setOperation(`schedule-${aula.id_aula}`);
    setError('');
    try {
      const schedule = await aulasService.getHorario(aula.id_aula);
      setNotice(`${aula.nombre_codigo}: ${schedule.length} horario(s) registrado(s).`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo consultar el horario del aula.');
    } finally {
      setOperation('');
    }
  };

  const reportFailure = async (aula) => {
    setOperation(`report-${aula.id_aula}`);
    setError('');
    setNotice('');
    try {
      let currentEstados = estadosAula;
      if (!currentEstados || currentEstados.length === 0) {
        currentEstados = await aulasService.getEstadosAula();
        setEstadosAula(currentEstados);
      }

      const estadoMantenimiento = currentEstados.find((e) =>
        e.nombre_estado?.toLowerCase().includes('mantenimiento') ||
        e.nombre_estado?.toLowerCase().includes('inactiv')
      ) || currentEstados[1] || { id_estado_espacio: 2, nombre_estado: 'En mantenimiento' };

      const estadoDisponible = currentEstados.find((e) =>
        e.nombre_estado?.toLowerCase().includes('disponible') ||
        e.nombre_estado?.toLowerCase().includes('activ') ||
        e.nombre_estado?.toLowerCase().includes('operativ')
      ) || currentEstados[0] || { id_estado_espacio: 1, nombre_estado: 'Disponible' };

      const isMantenimiento = (aula.estado_aula || '').toLowerCase().includes('mantenimiento') ||
        (aula.estado_aula || '').toLowerCase().includes('inactiv');

      if (isMantenimiento) {
        const confirmed = window.confirm(
          `Reactivación de Aula:\n\n` +
          `El aula "${aula.nombre_codigo}" se encuentra actualmente "En mantenimiento".\n\n` +
          `¿Deseas finalizar el mantenimiento y marcarla nuevamente como "Disponible"?\n\n` +
          `El aula volverá a estar habilitada para la planificación de horarios y reservas.`
        );
        if (!confirmed) return;

        await aulasService.updateAula(aula.id_aula, {
          id_estado_espacio: estadoDisponible.id_estado_espacio
        });
        setNotice(`El aula "${aula.nombre_codigo}" ha sido reactivada exitosamente y ahora está Disponible para asignación.`);
        await reloadAulas();
      } else {
        const motivo = window.prompt(
          `Reportar Falla o Poner en Mantenimiento:\n\n` +
          `Aula: "${aula.nombre_codigo}"\n\n` +
          `Ingresa la descripción de la falla o motivo de mantenimiento:\n` +
          `(Ejemplo: "Proyector averiado", "Falla en sistema eléctrico", "Reparación de mobiliario")\n\n` +
          `Al confirmar, el aula pasará al estado "En mantenimiento" y quedará inhabilitada para nuevas clases o reservas.`,
          'Falla técnica / Mantenimiento correctivo'
        );
        if (motivo === null) return;

        await aulasService.updateAula(aula.id_aula, {
          id_estado_espacio: estadoMantenimiento.id_estado_espacio
        });
        setNotice(`Falla reportada: El aula "${aula.nombre_codigo}" ha sido puesta En mantenimiento (${motivo.trim() || 'Falla técnica reportada'}).`);
        await reloadAulas();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'No se pudo actualizar el estado del aula.');
    } finally {
      setOperation('');
    }
  };

  const handleDeleteAula = async (aula) => {
    const confirmed = window.confirm(
      `¿Deseas eliminar o inhabilitar el aula "${aula.nombre_codigo}"?\n\n` +
      `Si el aula tiene clases o reservas registradas, el sistema la inhabilitará (marcará En mantenimiento) automáticamente para proteger el historial académico.`
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    try {
      const result = await aulasService.deleteAula(aula.id_aula);
      setNotice(result.message || 'Operación completada exitosamente.');
      await reloadAulas();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudo eliminar el aula.');
    }
  };

  return (
    <div className="academic-page aulas-page">
      <div className="academic-shell">
        <ModuleSidebar activeModule="aulas" />
        <main className="academic-main">
          <header className="academic-header">
            <div>
              <div className="academic-kicker"><span />Módulo de Aulas · Infraestructura</div>
              <h1>Gestión de Aulas e Infraestructura</h1>
              <p>Inventario físico de edificios, pabellones, aulas, capacidad y recursos tecnológicos instalados.</p>
            </div>
            <div className="academic-user">
              <b><User size={17} /></b>
              <div><small>Bienvenido</small><strong>{user?.email || user?.nombre_completo || 'Usuario'}</strong></div>
              <i />
            </div>
          </header>

          <div className="aulas-action-row">
            <div>
              <button className="aulas-secondary-action" onClick={() => window.print()}>
                <Download size={14} />Exportar Reporte
              </button>
              {canManage && (
                <button
                  className="aulas-secondary-action"
                  onClick={() => setShowPabellonModal(true)}
                  title="Registrar un nuevo pabellón o edificio"
                >
                  <Building2 size={14} />+ Nuevo Pabellón
                </button>
              )}
            </div>
            {canManage && (
              <button
                className="aulas-primary-action"
                onClick={() => {
                  setEditingAula(null);
                  setShowAulaModal(true);
                }}
              >
                <Plus size={16} />Nueva Aula / Espacio
              </button>
            )}
          </div>

          <AulasStatsGrid stats={stats} />

          <AulasToolbar
            pabellones={pabellones}
            pisos={pisos}
            selectedPabellon={selectedPabellon}
            selectedPiso={selectedPiso}
            search={search}
            onPabellonChange={setSelectedPabellon}
            onPisoChange={setSelectedPiso}
            onSearch={setSearch}
          />

          {notice && <div className="academic-notice">{notice}</div>}
          {error && <div className="academic-error"><AlertCircle size={17} />{error}</div>}

          {loading ? (
            <div className="aulas-empty">Cargando aulas...</div>
          ) : filteredAulas.length === 0 ? (
            <div className="aulas-empty">
              No hay aulas que coincidan con los filtros seleccionados.
              {canManage && (
                <button
                  type="button"
                  className="button button-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => { setEditingAula(null); setShowAulaModal(true); }}
                >
                  <Plus size={15} /> Registrar nueva aula en este pabellón
                </button>
              )}
            </div>
          ) : (
            <div className="aulas-grid">
              {filteredAulas.map((aula) => (
                <AulaCard
                  key={aula.id_aula}
                  aula={aula}
                  canManage={canManage}
                  recursos={resources[aula.id_aula]}
                  loading={operation}
                  onSchedule={viewSchedule}
                  onResources={setResourceAula}
                  onEdit={(targetAula) => {
                    setEditingAula(targetAula);
                    setShowAulaModal(true);
                  }}
                  onDelete={handleDeleteAula}
                  onReport={reportFailure}
                />
              ))}
            </div>
          )}

          {/* Modal para Crear / Editar Aula */}
          {showAulaModal && (
            <AulaModal
              aula={editingAula}
              pabellones={pabellones}
              tiposAula={tiposAula}
              estadosAula={estadosAula}
              defaultPabellon={selectedPabellon}
              defaultPiso={selectedPiso}
              onClose={() => {
                setShowAulaModal(false);
                setEditingAula(null);
              }}
              onSaved={async () => {
                setNotice(editingAula ? 'Aula actualizada exitosamente.' : 'Nueva aula registrada exitosamente.');
                await reloadAulas();
              }}
            />
          )}

          {/* Modal para Crear Pabellón */}
          {showPabellonModal && (
            <PabellonModal
              facultades={facultades}
              onClose={() => setShowPabellonModal(false)}
              onSaved={async (nuevoPabellon) => {
                setNotice(`Pabellón "${nuevoPabellon.nombre_pabellon}" registrado exitosamente.`);
                await reloadPabellones(nuevoPabellon.id_pabellon);
              }}
            />
          )}

          {/* Modal de Recursos y Equipamiento */}
          {canManage && resourceAula && (
            <RecursosModal
              aula={resourceAula}
              onClose={() => setResourceAula(null)}
              onUpdated={(id, list) => setResources((current) => ({ ...current, [id]: list }))}
            />
          )}
        </main>
      </div>
    </div>
  );
}
