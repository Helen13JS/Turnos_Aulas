// Prueba con API real y PostgreSQL; todos los datos de prueba se revierten.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const assert = require('node:assert/strict');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const db = require('../src/config/db');
const client = new Client({ connectionString: process.env.DATABASE_URL });
// La prueba comparte una sola transacción entre peticiones HTTP concurrentes.
const query = client.query.bind(client);
let queue = Promise.resolve();
client.query = (...args) => {
  const result = queue.then(() => query(...args));
  queue = result.catch(() => {});
  return result;
};
let server, browser;
(async () => {
  await client.connect();
  await client.query('BEGIN');
  db.query = (...args) => client.query(...args);
  db.getClient = async () => ({ release() {}, query(sql, args) {
    const commands = { BEGIN: 'SAVEPOINT test_write', COMMIT: 'RELEASE SAVEPOINT test_write', ROLLBACK: 'ROLLBACK TO SAVEPOINT test_write' };
    return client.query(commands[sql] || sql, args);
  } });
  server = require('../src/app').listen(0);
  await new Promise(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function session(role) {
    const { rows } = await client.query('SELECT id_usuario FROM usuario WHERE rol=$1 AND id_estado_usr=1 LIMIT 1', [role]);
    assert.ok(rows.length, `Falta usuario ${role}`);
    const jti = randomUUID();
    await client.query("INSERT INTO sesion_jwt(id_usuario,token_jti,fecha_expiracion,es_revocado) VALUES($1,$2,NOW()+interval '1 hour',false)", [rows[0].id_usuario,jti]);
    return jwt.sign({userId:rows[0].id_usuario,jti},process.env.JWT_SECRET,{expiresIn:'1h'});
  }
  const admin = await session('ROLE_SUPER_ADMIN');
  const viewer = await session('ROLE_VISUALIZADOR');
  const director = await session('ROLE_DIRECTOR_CARRERA');
  const call = (url, token=admin, body) => fetch(base+url,{method:body?'PUT':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const list = await (await call('/api/personas/docentes')).json();
  const original = list.docentes[0];
  const endpoint = `/api/personas/docentes/${original.id_docente}`;
  const contracts = (await client.query('SELECT id_tipo_contrato FROM tipo_contrato WHERE id_tipo_contrato<>$1 LIMIT 1',[original.id_tipo_contrato])).rows;
  assert.ok(contracts.length);
  const payload = {...original,nombres:'Prueba temporal',id_tipo_contrato:contracts[0].id_tipo_contrato,activo:!original.activo};
  assert.equal((await call(endpoint,viewer,payload)).status,403);
  assert.equal((await call(endpoint,director,payload)).status,403);
  assert.equal((await call(endpoint,admin,payload)).status,200);
  let saved = (await (await call(endpoint)).json()).docente;
  assert.equal(saved.nombres,payload.nombres);
  assert.equal(saved.activo,payload.activo);
  assert.equal(saved.id_tipo_contrato,payload.id_tipo_contrato);
  assert.equal((await call(endpoint,admin,{...payload,nombres:'No guardar',id_tipo_contrato:2147483647})).status,400);
  assert.equal((await (await call(endpoint)).json()).docente.nombres,payload.nombres);
  assert.equal((await call(endpoint,admin,{...payload,nombres:' '})).status,400);
  assert.equal((await call('/api/personas/docentes/2147483647',admin,payload)).status,404);
  assert.equal((await call(endpoint,admin,original)).status,200);
  console.log('API: guardado, lectura, validacion y permisos correctos.');
  if (process.env.E2E === '1') {
    const {chromium} = require('C:/Users/HP/.codex/tmp/asignacion-e2e-tools/node_modules/playwright');
    browser = await chromium.launch({headless:true,executablePath:'C:/Users/HP/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
    const page = await browser.newPage({viewport:{width:1440,height:950}});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',msg=>{if(msg.type()==='error') errors.push(msg.text());});
    await page.route('http://localhost:3000/api/**',async route=>{
      const response = await route.fetch({url:route.request().url().replace('http://localhost:3000',base)});
      if(response.status()>=400) errors.push(`HTTP ${response.status()} ${route.request().url()}`);
      await route.fulfill({response});
    });
    await page.addInitScript(token=>localStorage.setItem('token',token),admin);
    await page.goto('http://127.0.0.1:5173/academico');
    await page.getByRole('button',{name:/Directorio de Personal/}).click();
    await page.getByRole('button',{name:`Editar a ${original.nombres} ${original.apellidos}`}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nombres',{exact:true}).fill('Edicion E2E temporal');
    await dialog.getByLabel('Estado del docente').selectOption(String(!original.activo));
    await dialog.getByRole('button',{name:'Guardar docente'}).click();
    await page.getByText('Docente actualizado correctamente.').waitFor();
    saved = (await (await call(endpoint)).json()).docente;
    assert.equal(saved.nombres,'Edicion E2E temporal');
    assert.equal(saved.activo,!original.activo);
    await page.reload();
    await page.getByRole('button',{name:/Directorio de Personal/}).click();
    await page.getByRole('button',{name:`Editar a Edicion E2E temporal ${original.apellidos}`}).click();
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Desborde a ${width}px`);
      const box=await page.getByRole('dialog').boundingBox();
      assert.ok(box.x>=0 && box.x+box.width<=width+1);
    }
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.setViewportSize({width:1440,height:950});
    await page.goto('http://127.0.0.1:5173/configuracion');
    await page.getByRole('button',{name:/Mi Cuenta y Seguridad/}).click();
    assert.equal(await page.getByText(/Pr.ximamente|2FA/).count(),0);
    assert.deepEqual(errors,[]);
    console.log('Navegador: editar, guardar, recargar y modal movil correctos; sin errores JS/red.');
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(browser) await browser.close();
  if(server) await new Promise(resolve=>server.close(resolve));
  await client.query('ROLLBACK').catch(()=>{});
  await client.end();
  console.log('Datos de prueba revertidos.');
});
