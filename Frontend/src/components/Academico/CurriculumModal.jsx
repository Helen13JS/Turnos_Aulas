import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api.service';

export default function CurriculumModal({ record, areas, onClose, onSaved }) {
  const [form,setForm]=useState({id_area:'',nombre_materia:'',sigla:'',id_plan:'',id_semestre:''});
  const [catalogs,setCatalogs]=useState({planes:[],semestres:[],tipos:[]});
  const [cargas,setCargas]=useState({});
  const [links,setLinks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    Promise.all([apiService.getPlanes(),apiService.getSemestres(),apiService.getTiposClase(),
      record ? apiService.getConfiguracionMateria(record.id_materia) : Promise.resolve(null)])
      .then(([plans,semesters,types,config])=>{
        if(!active)return;
        setCatalogs({planes:plans.planes||[],semestres:semesters.semestres||[],tipos:types.tipos_clase||[]});
        if(config){
          const link=config.planes.find(x=>x.id_mat_plan===record.id_mat_plan)||config.planes[0];
          setForm({...config.materia,id_plan:link?.id_plan||'',id_semestre:link?.id_semestre||''});
          setLinks(config.planes);
          setCargas(Object.fromEntries(config.cargas.map(x=>[x.id_tipo_clase,String(x.horas_semana)])));
        }
      }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[record]);
  const update=(key,value)=>setForm(f=>({...f,[key]:value}));
  const submit=async e=>{
    e.preventDefault();setSaving(true);setError('');
    try{
      const payload={...form,cargas:Object.entries(cargas).filter(([,h])=>h!=='').map(([id,h])=>({id_tipo_clase:Number(id),horas_semana:Number(h)}))};
      await apiService.guardarConfiguracionMateria(record?.id_materia,payload);
      await onSaved();onClose();
    }catch(err){setError(err.message);}finally{setSaving(false);}
  };
  return <div className="academic-modal-backdrop"><form className="academic-modal" onSubmit={submit}>
    <div className="academic-modal-header"><h2>{record?'Editar materia, plan y carga':'Registrar materia con plan y carga'}</h2><button type="button" disabled={saving} onClick={onClose}>Cerrar</button></div>
    {error&&<div role="alert" className="academic-error">{error}</div>}
    {loading?<p>Cargando catálogos...</p>:<>
      <div className="academic-form-grid">
        <label>Nombre<input required value={form.nombre_materia} onChange={e=>update('nombre_materia',e.target.value)}/></label>
        <label>Sigla<input required value={form.sigla} onChange={e=>update('sigla',e.target.value)}/></label>
        <label>Área<select required value={form.id_area} onChange={e=>update('id_area',e.target.value)}><option value="">Seleccionar...</option>{areas.map(x=><option key={x.id_area} value={x.id_area}>{x.nombre_area}</option>)}</select></label>
        <label>Plan de estudio<select required value={form.id_plan} onChange={e=>{const link=links.find(x=>String(x.id_plan)===e.target.value);setForm(f=>({...f,id_plan:e.target.value,id_semestre:link?.id_semestre||''}));}}><option value="">Seleccionar...</option>{catalogs.planes.map(x=><option key={x.id_plan} value={x.id_plan}>{x.nombre_carrera} — {x.nombre_plan}</option>)}</select></label>
        <label>Semestre<select required value={form.id_semestre} onChange={e=>update('id_semestre',e.target.value)}><option value="">Seleccionar...</option>{catalogs.semestres.map(x=><option key={x.id_semestre} value={x.id_semestre}>{x.descripcion}</option>)}</select></label>
        {catalogs.tipos.map(x=><label key={x.id_tipo_clase}>{x.nombre_tipo}: horas semanales<input type="number" min="1" step="1" placeholder="Sin sesión" value={cargas[x.id_tipo_clase]??''} onChange={e=>setCargas(v=>({...v,[x.id_tipo_clase]:e.target.value}))}/></label>)}
      </div>
      <p>Configura al menos una sesión. Las cuotas se comparten entre todos los planes de la materia. Deja vacío un tipo que no corresponda. Las otras vinculaciones a planes se conservan.</p>
    </>}
    <div className="academic-modal-actions"><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={loading||saving}>{saving?'Guardando...':'Guardar materia, plan y carga'}</button></div>
  </form></div>;
}
