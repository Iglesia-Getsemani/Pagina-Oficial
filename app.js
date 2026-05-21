// ===== APP.JS — ADVENTIST MINISTRY APP =====
'use strict';

// ===== CATÁLOGO DE IGLESIAS =====
// Para agregar más iglesias, añadir un objeto { id, name, server } a este array.
// La primera iglesia de la lista es la predeterminada si no hay ninguna guardada.
const IGLESIAS_CATALOG = [
  {
    id: 'getsemani',
    name: 'Iglesia Getsemaní',
    server: 'https://eatable-preseason-encode.ngrok-free.dev/api/miembros'
  }
  // Ejemplo para agregar otra iglesia en el futuro:
  // { id: 'central', name: 'Iglesia Central', server: 'https://otro-servidor.com/api/miembros' }
];

/**
 * Devuelve la iglesia actualmente seleccionada.
 * Si no hay ninguna guardada, usa la primera del catálogo (predeterminada).
 */
function getIglesiaActual() {
  const savedId = DB.get('iglesia_id', null);
  if (savedId) {
    const found = IGLESIAS_CATALOG.find(i => i.id === savedId);
    if (found) return found;
  }
  // Predeterminada: la primera del catálogo
  return IGLESIAS_CATALOG[0] || null;
}

/**
 * Guarda la iglesia seleccionada por su id.
 */
function setIglesiaActual(iglesiaId) {
  DB.set('iglesia_id', iglesiaId);
  // Sincronizar también el nombre de iglesia para compatibilidad
  const ig = IGLESIAS_CATALOG.find(i => i.id === iglesiaId);
  if (ig) DB.set('church_name', ig.name);
}

// ===== CONTRASEÑA FIJA para gestión de miembros (admin) =====
const PASS_MEMBERS = 'Getsemani2026.123';

// ===== AUTH HELPERS — MIEMBROS (admin password) =====
function isMembersAuth() {
  return sessionStorage.getItem('auth_members') === '1';
}

// ===== SESSION DE USUARIO LOGUEADO =====
// El usuario (director o asistente) se identifica con su correo.
// Al encontrarlo en el servidor queda guardado en localStorage para no volver a pedírselo.

const SESSION_KEY = 'adv_session_user'; // { id, name, email, roles[], dirMinistries[], ministries[] }
// roles puede incluir 'director', 'asistente', 'visita' — no son excluyentes

function getSessionUser() {
  try {
    const v = localStorage.getItem(SESSION_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function setSessionUser(userData) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(userData)); } catch {}
}

function clearSessionUser() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// Compatibilidad: si el campo role es string, lo normaliza a array roles[]
function getUserRoles(u) {
  if (!u) return [];
  if (u.roles && Array.isArray(u.roles)) return u.roles;
  // legado: role es string
  if (u.role) return [u.role];
  return [];
}

function isDirectorOf(ministryId) {
  const u = getSessionUser();
  if (!u) return false;
  const roles = getUserRoles(u);
  if (!roles.includes('director')) return false;
  return (u.dirMinistries || []).includes(ministryId);
}

function isAnyDirector() {
  const u = getSessionUser();
  if (!u) return false;
  return getUserRoles(u).includes('director');
}

function isAsistente() {
  const u = getSessionUser();
  if (!u) return false;
  return getUserRoles(u).includes('asistente');
}

function isVisita() {
  const u = getSessionUser();
  if (!u) return false;
  return getUserRoles(u).includes('visita');
}

/**
 * Muestra el modal de login por correo.
 * Busca el correo en el servidor. Si coincide, guarda la sesión y llama onSuccess.
 * Si ya hay sesión guardada llama onSuccess directamente.
 * type: 'ministry' | 'members'
 * onSuccess: callback
 */
function requireAuth(type, onSuccess) {
  if (type === 'members') {
    // Admin password path (unchanged)
    if (isMembersAuth()) { onSuccess(); return; }
    _showPasswordModal(onSuccess);
    return;
  }

  // type === 'ministry': login por correo de usuario
  const session = getSessionUser();
  if (session) { onSuccess(); return; }

  _showLoginModal(onSuccess);
}

// ─── Password modal (admin members) ───────────────────────────
function _showPasswordModal(onSuccess) {
  let overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet" style="padding-bottom:28px;">
        <div class="modal-handle"></div>
        <div class="modal-title">🔒 Acceso Administrador</div>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Se requiere contraseña para gestionar miembros.</p>
        <div class="input-group">
          <label>Contraseña</label>
          <div style="position:relative;">
            <input type="password" id="authPassInput" placeholder="Contraseña de administrador"
                   autocomplete="off" style="padding-right:44px;"
                   onkeydown="if(event.key==='Enter') _authPassSubmit()">
            <button onclick="_authToggleEye()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;" id="authEye">👁</button>
          </div>
        </div>
        <div id="authError" style="font-size:12px; color:var(--red); margin-bottom:10px; display:none;">Contraseña incorrecta.</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="_authPassCancel()">Cancelar</button>
          <button class="btn btn-primary" style="flex:1;" onclick="_authPassSubmit()">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay._onSuccess = onSuccess;
  document.getElementById('authPassInput').value = '';
  document.getElementById('authError').style.display = 'none';
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('authPassInput').focus(), 300);
}

function _authPassSubmit() {
  const overlay = document.getElementById('authOverlay');
  const input = document.getElementById('authPassInput').value;
  if (input === PASS_MEMBERS) {
    sessionStorage.setItem('auth_members', '1');
    overlay.classList.remove('open');
    overlay._onSuccess();
  } else {
    document.getElementById('authError').style.display = 'block';
    document.getElementById('authPassInput').value = '';
    document.getElementById('authPassInput').focus();
  }
}

function _authPassCancel() {
  document.getElementById('authOverlay').classList.remove('open');
}

function _authToggleEye() {
  const inp = document.getElementById('authPassInput');
  const btn = document.getElementById('authEye');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ─── Email login modal (directors / asistentes) ───────────────
function _showLoginModal(onSuccess) {
  let overlay = document.getElementById('loginOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet" style="padding-bottom:28px;">
        <div class="modal-handle"></div>
        <div style="text-align:center; margin-bottom:6px; font-size:32px;">✝</div>
        <div class="modal-title" style="text-align:center;">Identificación</div>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; text-align:center;">
          Ingresa el correo con que fuiste registrado para acceder a tus ministerios.
        </p>
        <div class="input-group">
          <label>Correo electrónico</label>
          <input type="email" id="loginEmailInput" placeholder="correo@ejemplo.com"
                 autocomplete="email" autocapitalize="none"
                 onkeydown="if(event.key==='Enter') _loginSubmit()">
        </div>
        <div id="loginError" style="font-size:12px; color:var(--red); margin-bottom:10px; display:none; text-align:center;"></div>
        <div id="loginLoading" style="font-size:12px; color:var(--text-muted); margin-bottom:10px; display:none; text-align:center;">🔄 Verificando...</div>
        <button class="btn btn-primary btn-block" id="loginBtn" onclick="_loginSubmit()">Ingresar</button>
        <p style="font-size:11px; color:var(--text-dim); text-align:center; margin-top:12px;">
          Si no estás registrado, pide al administrador que te agregue primero.
        </p>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay._onSuccess = onSuccess;
  document.getElementById('loginEmailInput').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('loginBtn').disabled = false;
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('loginEmailInput').focus(), 300);
}

async function _loginSubmit() {
  const email = (document.getElementById('loginEmailInput').value || '').trim().toLowerCase();
  const errEl = document.getElementById('loginError');
  const loadEl = document.getElementById('loginLoading');
  const btn = document.getElementById('loginBtn');

  if (!email || !email.includes('@')) {
    errEl.textContent = 'Ingresa un correo válido.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  loadEl.style.display = 'block';
  btn.disabled = true;

  // Try to find the user on the server
  const members = await fetchMembersFromServer();
  loadEl.style.display = 'none';
  btn.disabled = false;

  if (!members) {
    errEl.textContent = 'No se pudo conectar al servidor. Verifica tu conexión.';
    errEl.style.display = 'block';
    return;
  }

  const found = members.find(m => (m.email || '').trim().toLowerCase() === email);

  if (!found) {
    errEl.textContent = 'Este correo no está registrado. Contacta al administrador.';
    errEl.style.display = 'block';
    return;
  }

  // Save session permanently (localStorage)
  // Normalizar roles a array
  let roles = [];
  if (Array.isArray(found.roles)) roles = found.roles;
  else if (found.role) roles = [found.role];
  else roles = ['asistente'];

  setSessionUser({
    id: found.id,
    code: found.code || '',
    name: found.name,
    email: found.email,
    roles: roles,
    role: roles[0] || 'asistente', // legado
    dirMinistries: found.dirMinistries || [],
    ministries: found.ministries || [],
  });

  // Also update local cache
  DB.set('members_cache', members);
  DB.set('members', members);

  document.getElementById('loginOverlay').classList.remove('open');

  const overlay = document.getElementById('loginOverlay');
  if (overlay._onSuccess) overlay._onSuccess();
}

// ===== MINISTERIOS DATA =====
const ALL_MINISTRIES = [
  // Formación espiritual
  { id: 'escuela_sabatica', name: 'Escuela Sabática', icon: '📖', cat: 'Formación' },
  { id: 'ministerios_personales', name: 'Ministerios Personales', icon: '🤝', cat: 'Formación' },
  { id: 'evangelismo', name: 'Evangelismo', icon: '📢', cat: 'Formación' },
  { id: 'asociacion_ministerial', name: 'Asociación Ministerial', icon: '⛪', cat: 'Formación' },
  { id: 'mayordomia', name: 'Mayordomía Cristiana', icon: '💝', cat: 'Formación' },
  { id: 'mision_global', name: 'Misión Global', icon: '🌍', cat: 'Formación' },
  { id: 'reavivamiento', name: 'Reavivamiento y Reforma', icon: '🔥', cat: 'Formación' },
  // Niños, adolescentes y jóvenes
  { id: 'ministerio_infantil', name: 'Ministerio Infantil', icon: '🧒', cat: 'Jóvenes' },
  { id: 'adolescente', name: 'Ministerio del Adolescente', icon: '🧑', cat: 'Jóvenes' },
  { id: 'ministerio_joven', name: 'Ministerio Joven', icon: '🙋', cat: 'Jóvenes' },
  { id: 'aventureros', name: 'Aventureros', icon: '⛺', cat: 'Jóvenes' },
  { id: 'conquistadores', name: 'Conquistadores', icon: '🏕️', cat: 'Jóvenes' },
  { id: 'universitario', name: 'Ministerio Universitario', icon: '🎓', cat: 'Jóvenes' },
  { id: 'voluntario', name: 'Servicio Voluntario', icon: '🌱', cat: 'Jóvenes' },
  // Familia
  { id: 'familia', name: 'Ministerio de la Familia', icon: '👨‍👩‍👧', cat: 'Familia' },
  { id: 'mujer', name: 'Ministerio de la Mujer', icon: '👩', cat: 'Familia' },
  { id: 'hogar', name: 'Hogar y Familia', icon: '🏠', cat: 'Familia' },
  { id: 'afam', name: 'AFAM', icon: '💒', cat: 'Familia' },
  { id: 'hombre', name: 'Ministerio del Hombre', icon: '👨', cat: 'Familia' },
  { id: 'adulto_mayor', name: 'Ministerio del Adulto Mayor', icon: '👴', cat: 'Familia' },
  { id: 'posibilidades', name: 'Ministerio de Posibilidades', icon: '♿', cat: 'Familia' },
  // Educación
  { id: 'educacion', name: 'Educación', icon: '🏫', cat: 'Educación' },
  { id: 'musica', name: 'Música', icon: '🎵', cat: 'Educación' },
  { id: 'publicaciones', name: 'Publicaciones', icon: '📰', cat: 'Educación' },
  { id: 'espiritu_profecia', name: 'Espíritu de Profecía', icon: '✍️', cat: 'Educación' },
  { id: 'libertad_religiosa', name: 'Libertad Religiosa', icon: '⚖️', cat: 'Educación' },
  // Salud
  { id: 'salud', name: 'Ministerio de Salud', icon: '❤️‍🩹', cat: 'Salud' },
  { id: 'asa', name: 'ASA', icon: '🤲', cat: 'Salud' },
  { id: 'adra', name: 'ADRA', icon: '🌐', cat: 'Salud' },
  { id: 'capellania', name: 'Capellanía', icon: '🕊️', cat: 'Salud' },
  // Comunicación
  { id: 'comunicacion', name: 'Comunicación', icon: '📡', cat: 'Comunicación' },
  { id: 'medios', name: 'Medios / Hope Channel', icon: '📺', cat: 'Comunicación' },
  { id: 'multimedia', name: 'Producción Multimedia', icon: '🎬', cat: 'Comunicación' },
  { id: 'redes', name: 'Redes Sociales', icon: '📱', cat: 'Comunicación' },
  // Administración
  { id: 'secretaria', name: 'Secretaría', icon: '📋', cat: 'Administración' },
  { id: 'tesoreria', name: 'Tesorería', icon: '💰', cat: 'Administración' },
  { id: 'rrhh', name: 'Recursos Humanos', icon: '👥', cat: 'Administración' },
  { id: 'donaciones', name: 'Donaciones y Legados', icon: '🎁', cat: 'Administración' },
  { id: 'auditoria', name: 'Auditoría', icon: '🔍', cat: 'Administración' },
  { id: 'juridica', name: 'Jurídica', icon: '📜', cat: 'Administración' },
];

// ===== STORAGE HELPERS =====
const DB = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('adv_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('adv_' + key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem('adv_' + key); } catch {}
  }
};

// ===== TOAST =====
function showToast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== MODAL =====
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ===== MINISTRY HELPER =====
function getMinistry(id) {
  return ALL_MINISTRIES.find(m => m.id === id) || { name: id, icon: '⭐' };
}

// ===== ID GENERATOR =====
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===== FORMAT DATE =====
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ===== AGE HELPER =====
function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ===== INITIALS =====
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ===== NAVIGATION =====
function navigate(page) {
  window.location.href = page;
}

// ===== MINISTRY PAGE ROUTING =====
// Personalizacion por codigo: si un ministerio tiene HTML propio, se abre ese archivo.
// Convencion automatica: crear ministerios/<id-del-ministerio>.html
// Mapa opcional para casos especiales, por ejemplo:
// const MINISTRY_CUSTOM_PAGES = { educacion: 'ministerios/educacion.html' };
const MINISTRY_CUSTOM_PAGES = {
};

function getMinistryConventionPage(ministryId) {
  return 'ministerios/' + encodeURIComponent(ministryId) + '.html';
}

async function ministryCustomPageExists(page) {
  if (!page) return false;
  try {
    const head = await fetch(page, { method: 'HEAD', cache: 'no-store' });
    if (head.ok) return true;
    if (head.status && head.status !== 405) return false;
  } catch {}

  try {
    const get = await fetch(page, { method: 'GET', cache: 'no-store' });
    return get.ok;
  } catch {
    return false;
  }
}

async function openMinistry(ministryId) {
  DB.set('active_ministry', ministryId);

  const configuredPage = MINISTRY_CUSTOM_PAGES[ministryId];
  if (typeof configuredPage === 'string' && configuredPage.trim()) {
    navigate(configuredPage.trim());
    return;
  }
  if (configuredPage === false) {
    navigate('ministry.html');
    return;
  }

  const conventionPage = getMinistryConventionPage(ministryId);
  const hasCustomPage = await ministryCustomPageExists(conventionPage);
  navigate(hasCustomPage ? conventionPage : 'ministry.html');
}

function openActiveMinistry() {
  const activeId = DB.get('active_ministry', null);
  if (activeId) openMinistry(activeId);
  else navigate('ministry.html');
}

// ===== SERVER SYNC =====
/**
 * Obtiene la URL del servidor activo.
 * Prioridad: iglesia del catálogo seleccionada → server_url guardado manualmente (legado).
 */
function getServerUrl() {
  const iglesia = getIglesiaActual();
  if (iglesia && iglesia.server) return iglesia.server;
  // Compatibilidad con configuración manual anterior
  return DB.get('server_url', '');
}

async function fetchMembersFromServer() {
  const url = getServerUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': '1'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.members || data.data || null);
  } catch (e) {
    console.error('fetchMembersFromServer:', e);
    return null;
  }
}

async function pushMembersToServer(members) {
  const url = getServerUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({ members })
    });
    return res.ok;
  } catch (e) {
    console.error('pushMembersToServer:', e);
    return false;
  }
}

// ===== CONTROL DE ACCESO PARA AGREGAR/EDITAR MIEMBROS =====
/**
 * Verifica que el usuario tenga sesión con rol 'director' o 'asistente'
 * (director de ministerios personales).
 * Si no hay sesión, abre el modal de login y luego ejecuta la acción.
 * Si la sesión existe pero NO tiene el rol requerido, muestra un aviso.
 */
function requireMemberRole(action) {
  const session = getSessionUser();

  // Sin sesión → pedir login primero
  if (!session) {
    _showLoginModal(() => {
      // Después del login verificar rol
      const s2 = getSessionUser();
      const roles2 = getUserRoles(s2);
      if (roles2.includes('director') || roles2.includes('asistente')) {
        action();
      } else {
        showToast('No tienes permiso para esta acción', 'error');
      }
    });
    return;
  }

  const roles = getUserRoles(session);
  if (roles.includes('director') || roles.includes('asistente')) {
    action();
  } else {
    showToast('Solo directores y asistentes pueden gestionar miembros', 'error');
  }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
