const DIAS_ISO = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const normalizarTexto = (value) => (value ? String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '');

// Acepta nro ISO (1-7), nombre con/sin tilde o abreviatura (Lun, Mie...).
export const resolverDia = (clase) => {
  const iso = Number(clase.nro_dia_iso);
  if (Number.isInteger(iso) && iso >= 1 && iso <= 7) return DIAS_ISO[iso - 1];
  const n = normalizarTexto(clase.dia ?? clase.nombre_dia);
  return DIAS_ISO.find((d) => d === n) || (n.length >= 3 ? DIAS_ISO.find((d) => d.startsWith(n.slice(0, 3))) : '') || '';
};

export const minutosDe = (hora) => {
  if (!hora) return 0;
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Une franjas consecutivas (30 min) de la misma clase en un solo bloque.
 * Devuelve [{ ...primeraFranja, dia, inicio, fin, hora_inicio, hora_fin, horas, ids }].
 */
export function agruparSlots(filas) {
  const unicas = Array.from(new Map((filas || []).map((f, i) => [f.id_horario ?? `${i}`, f])).values());
  const claveClase = (f) => `${resolverDia(f)}|${f.id_grupo ?? f.nombre_grupo}|${f.aula}|${f.id_tipo_clase ?? f.tipo_clase}`;
  const ordenadas = unicas
    .map((f) => ({ f, ini: minutosDe(f.hora_inicio), fin: minutosDe(f.hora_fin) }))
    .sort((a, b) => (claveClase(a.f) < claveClase(b.f) ? -1 : claveClase(a.f) > claveClase(b.f) ? 1 : a.ini - b.ini));
  const bloques = [];
  ordenadas.forEach(({ f, ini, fin }) => {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.clave === claveClase(f) && ultimo.fin === ini) {
      ultimo.fin = fin;
      ultimo.ids.push(f.id_horario);
    } else {
      bloques.push({ clave: claveClase(f), fila: f, dia: resolverDia(f), ini, fin, ids: [f.id_horario] });
    }
  });
  return bloques.map((b) => ({
    ...b.fila, dia: b.dia, inicio: b.ini, fin: b.fin,
    hora_inicio: hhmm(b.ini), hora_fin: hhmm(b.fin), horas: (b.fin - b.ini) / 60, ids: b.ids,
  }));
}
