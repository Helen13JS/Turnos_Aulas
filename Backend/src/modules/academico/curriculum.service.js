const db = require('../../config/db');
const { httpError, positiveId } = require('../../utils/domainValidation');

async function getConfig(id) {
  positiveId(id, 'Materia');
  const materia = (await db.query('SELECT * FROM materia WHERE id_materia=$1',[id])).rows[0];
  if (!materia) throw httpError(404,'Materia no encontrada');
  const planes = (await db.query('SELECT mp.*,pe.nombre_plan FROM materia_plan mp JOIN plan_estudio pe USING(id_plan) WHERE mp.id_materia=$1 ORDER BY mp.id_plan',[id])).rows;
  const cargas = (await db.query('SELECT id_tipo_clase,horas_semana FROM materia_carga_horaria WHERE id_materia=$1',[id])).rows;
  return {materia,planes,cargas};
}
async function saveConfig(id, body) {
  if (id != null) positiveId(id,'Materia');
  const {id_area,nombre_materia,sigla,id_plan,id_semestre,cargas}=body;
  for (const [key,value] of Object.entries({id_area,id_plan,id_semestre})) positiveId(value,key);
  if (![nombre_materia,sigla].every(x=>typeof x==='string'&&x.trim())) throw httpError(400,'Nombre y sigla son obligatorios');
  if (!Array.isArray(cargas)||!cargas.length||cargas.length>20) throw httpError(400,'Configura al menos un tipo de sesion');
  const types=new Set();
  for (const carga of cargas) {
    const type=positiveId(carga.id_tipo_clase,'Tipo de clase');
    if (types.has(type)||!Number.isSafeInteger(Number(carga.horas_semana))||Number(carga.horas_semana)<=0) throw httpError(400,'Cada sesion debe tener horas enteras positivas y no repetirse');
    types.add(type);
  }
  const client=await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    if (id != null) {
      // Mismo bloqueo de grupo utilizado por la planificacion, antes de cambiar sus cuotas.
      await client.query(`SELECT g.id_grupo FROM grupo_materia g JOIN materia_plan mp USING(id_mat_plan)
        WHERE mp.id_materia=$1 ORDER BY g.id_grupo FOR UPDATE OF g`,[id]);
      if (!(await client.query('SELECT id_materia FROM materia WHERE id_materia=$1 FOR UPDATE',[id])).rowCount) throw httpError(404,'Materia no encontrada');
      const planned=(await client.query(`SELECT h.id_tipo_clase,g.id_grupo,SUM(EXTRACT(EPOCH FROM(b.hora_fin-b.hora_inicio)))/3600 horas
        FROM horario_clase h JOIN grupo_materia g USING(id_grupo) JOIN materia_plan mp USING(id_mat_plan)
        JOIN bloque_horario b USING(id_bloque) WHERE mp.id_materia=$1 GROUP BY h.id_tipo_clase,g.id_grupo`,[id])).rows;
      for(const row of planned) {
        const quota=cargas.find(x=>Number(x.id_tipo_clase)===row.id_tipo_clase);
        if(!quota||Number(quota.horas_semana)<Number(row.horas)) throw httpError(409,`La cuota dejaria horarios sin carga o excedidos en el grupo ${row.id_grupo}`);
      }
      await client.query('UPDATE materia SET id_area=$1,nombre_materia=$2,sigla=$3 WHERE id_materia=$4',[id_area,nombre_materia.trim(),sigla.trim(),id]);
    } else {
      id=(await client.query('INSERT INTO materia(id_area,nombre_materia,sigla) VALUES($1,$2,$3) RETURNING id_materia',[id_area,nombre_materia.trim(),sigla.trim()])).rows[0].id_materia;
    }
    const link=(await client.query('SELECT id_mat_plan FROM materia_plan WHERE id_materia=$1 AND id_plan=$2',[id,id_plan])).rows[0];
    if(link) await client.query('UPDATE materia_plan SET id_semestre=$1 WHERE id_mat_plan=$2',[id_semestre,link.id_mat_plan]);
    else await client.query('INSERT INTO materia_plan(id_materia,id_plan,id_semestre) VALUES($1,$2,$3)',[id,id_plan,id_semestre]);
    for(const carga of cargas) await client.query(`INSERT INTO materia_carga_horaria(id_materia,id_tipo_clase,horas_semana) VALUES($1,$2,$3)
      ON CONFLICT(id_materia,id_tipo_clase) DO UPDATE SET horas_semana=EXCLUDED.horas_semana`,[id,carga.id_tipo_clase,carga.horas_semana]);
    await client.query('DELETE FROM materia_carga_horaria WHERE id_materia=$1 AND NOT(id_tipo_clase=ANY($2::int[]))',[id,[...types]]);
    const result=(await client.query('SELECT * FROM materia WHERE id_materia=$1',[id])).rows[0];
    await client.query('COMMIT');
    return result;
  } catch(err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
module.exports={getConfig,saveConfig};
