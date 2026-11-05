const cron = require('node-cron');
const db = require('../../config/db');
const config = require('../../config');
const EmailService = require('../notificaciones/email.service');

class CronService {
  constructor() {
    this.isProcessing = false;
  }

  iniciar() {
    console.log("⏳ Iniciando motor de tareas programadas (node-cron)...");

    if (!config.emailNotificationsEnabled) {
      console.log("ℹ️ Notificaciones por correo desactivadas. Define EMAIL_NOTIFICATIONS_ENABLED=true para habilitarlas.");
      return;
    }

    // Tarea: Procesar notificaciones pendientes
    // Se ejecuta cada minuto (para fines de demostración)
    cron.schedule('* * * * *', async () => {
      if (this.isProcessing) return; // Evitar solapamientos
      this.isProcessing = true;
      
      try {
        await this.procesarNotificaciones();
      } catch (error) {
        console.error("❌ Error en el cron de notificaciones:", error);
      } finally {
        this.isProcessing = false;
      }
    });
  }

  async procesarNotificaciones() {
    const client = await db.getClient();
    let totalProcesados = 0;
    
    try {
      // 1. Obtener notificaciones pendientes (id_estado_notif = 1)
      const queryPendientes = `
        SELECT dn.id_destinatario, dn.id_registro_notif, u.email, u.id_usuario,
               tn.nombre_tipo
        FROM destinatario_notificacion dn
        JOIN usuario u ON u.id_usuario = dn.id_usuario
        JOIN registro_notificacion rn ON rn.id_registro_notif = dn.id_registro_notif
        JOIN tipo_notificacion tn ON tn.id_tipo_notif = rn.id_tipo_notif
        WHERE dn.id_estado_notif = 1
      `;
      const { rows: pendientes } = await client.query(queryPendientes);

      if (pendientes.length === 0) {
        return; // No hay nada que procesar
      }

      console.log(`\n⚙️ [Cron] Procesando ${pendientes.length} notificaciones pendientes...`);

      // Buscar el ID del estado "Enviada"
      const resultEstado = await client.query("SELECT id_estado_notif FROM estado_notificacion WHERE nombre_estado = 'Enviada'");
      const idEstadoEnviada = resultEstado.rows.length > 0 ? resultEstado.rows[0].id_estado_notif : 2;

      for (const notif of pendientes) {
        // En una implementación real, buscaríamos la plantilla en 'plantilla_correo'
        // Aquí usaremos un template duro para la demo
        let asunto = "Actualización de Solicitud - Sistema de Aulas";
        let cuerpoHtml = `<p>Hola, tu solicitud ha tenido una actualización.</p>`;
        
        if (notif.nombre_tipo === 'Aprobacion Solicitud') {
           asunto = "✅ Tu solicitud de cambio de horario ha sido APROBADA";
           cuerpoHtml = `
            <h2>Solicitud Aprobada</h2>
            <p>Estimado docente, su solicitud de modificación de horario ha sido <strong>aprobada</strong> por la Dirección de Carrera.</p>
           `;
        } else if (notif.nombre_tipo === 'Rechazo Solicitud') {
           asunto = "❌ Tu solicitud de cambio de horario ha sido RECHAZADA";
           cuerpoHtml = `
            <h2>Solicitud Rechazada</h2>
            <p>Estimado docente, su solicitud de modificación de horario ha sido <strong>rechazada</strong>.</p>
           `;
        }

        // 2. Enviar el correo
        const enviado = await EmailService.enviarCorreo(notif.email, asunto, cuerpoHtml);

        if (enviado) {
          // 3. Actualizar estado a "Enviada"
          await client.query(`
            UPDATE destinatario_notificacion 
            SET id_estado_notif = $1, fecha_envio = CURRENT_TIMESTAMP
            WHERE id_destinatario = $2
          `, [idEstadoEnviada, notif.id_destinatario]);
          totalProcesados++;
        }
      }

      // 4. Registrar en historial de tareas (si procesamos al menos uno)
      if (totalProcesados > 0) {
         // Buscar ID de tarea programada (Asumimos que existe una tarea genérica o insertamos)
         // Para evitar error, haremos un INSERT directo sin FK estricta si no existe.
         // En un entorno real asumes que la BD tiene catalogos.
         const resTarea = await client.query("SELECT id_tarea FROM tarea_programada WHERE nombre_tarea = 'Envio Notificaciones'");
         let idTarea = 1;
         if (resTarea.rows.length > 0) {
            idTarea = resTarea.rows[0].id_tarea;
         } else {
            const nuevaTarea = await client.query("INSERT INTO tarea_programada (nombre_tarea, frecuencia_ejecucion) VALUES ('Envio Notificaciones', 'Cada minuto') RETURNING id_tarea");
            idTarea = nuevaTarea.rows[0].id_tarea;
         }

         await client.query(`
            INSERT INTO historial_tarea_programada (id_tarea, resultado)
            VALUES ($1, $2)
         `, [idTarea, `Se procesaron exitosamente ${totalProcesados} notificaciones.`]);
      }

    } catch (error) {
       console.error("❌ Error procesando notificaciones:", error);
    } finally {
       client.release();
    }
  }
}

module.exports = new CronService();
