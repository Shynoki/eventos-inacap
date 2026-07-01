/* =========================================================
   Eventos INACAP · Lógica de la aplicación (JavaScript puro)
   Sumativa 2 · Front End · INACAP Maipú
   ---------------------------------------------------------
   Arquitectura por capas:
     1) ESTADO        -> arreglo de objetos + persistencia
     2) UTILIDADES    -> sanitización, escape, helpers
     3) VALIDACIÓN    -> funciones puras que devuelven {ok, msg}
     4) RENDER (DOM)  -> creación segura de nodos (createElement)
     5) EVENTOS       -> listeners y flujo principal
   ========================================================= */
"use strict";

/* =========================================================
   1) ESTADO DE LA APLICACIÓN
   Los eventos se guardan como un ARREGLO DE OBJETOS.
   Cada objeto tiene una forma estable (id, nombre, email, ...).
   ========================================================= */
const CLAVE_STORAGE = "eventos_inacap_v1";

let eventos = cargarDesdeStorage(); // arreglo principal de objetos

// Filtros de la vista (no mutan los datos, solo cómo se muestran)
const filtros = { texto: "", categoria: "" };

/* =========================================================
   2) UTILIDADES REUTILIZABLES
   ========================================================= */

/**
 * Sanitiza texto libre eliminando espacios sobrantes.
 * NO confía en el input: siempre se combina con escaparHTML al renderizar.
 * @param {string} valor
 * @returns {string}
 */
function sanitizar(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Escapa caracteres peligrosos para prevenir XSS.
 * Aunque usamos textContent (seguro por defecto), esta función se usa
 * como segunda barrera y para atributos generados dinámicamente.
 * @param {string} texto
 * @returns {string}
 */
function escaparHTML(texto) {
  const mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto).replace(/[&<>"']/g, (caracter) => mapa[caracter]);
}

/** Genera un id único simple (sin depender de librerías externas). */
function generarId() {
  return "ev_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e4).toString(36);
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD (para comparar fechas). */
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Calcula los días que faltan para una fecha (entero, puede ser 0). */
function diasRestantes(fechaISO) {
  const MS_DIA = 86400000;
  const hoy = new Date(hoyISO());
  const objetivo = new Date(fechaISO);
  return Math.round((objetivo - hoy) / MS_DIA);
}

/** Formatea una fecha ISO a un texto legible en español. */
function formatearFecha(fechaISO) {
  const opciones = { day: "2-digit", month: "long", year: "numeric" };
  return new Date(fechaISO + "T00:00:00").toLocaleDateString("es-CL", opciones);
}

/* =========================================================
   3) VALIDACIÓN ROBUSTA
   Cada validador es una función pura: recibe un valor y
   devuelve { ok: boolean, msg: string }. Fáciles de testear
   y reutilizar. Las expresiones regulares fueron generadas
   con apoyo de IA (ver USO_IA.md) y revisadas manualmente.
   ========================================================= */

// [IA] Regex para nombres: letras (incl. tildes/ñ), números, espacios y . , : - básicos
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 .,:()\-]{4,60}$/;
// [IA] Regex de email pragmática (cubre la mayoría de casos reales sin ser excesiva)
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function validarNombre(valor) {
  const v = sanitizar(valor);
  if (!v) return { ok: false, msg: "El nombre es obligatorio." };
  if (v.length < 4) return { ok: false, msg: "Mínimo 4 caracteres." };
  if (!RE_NOMBRE.test(v)) return { ok: false, msg: "Contiene caracteres no permitidos." };
  return { ok: true, msg: "" };
}

function validarEmail(valor) {
  const v = sanitizar(valor).toLowerCase();
  if (!v) return { ok: false, msg: "El correo es obligatorio." };
  if (!RE_EMAIL.test(v)) return { ok: false, msg: "Formato de correo inválido." };
  return { ok: true, msg: "" };
}

function validarFecha(valor) {
  if (!valor) return { ok: false, msg: "La fecha es obligatoria." };
  if (valor < hoyISO()) return { ok: false, msg: "La fecha debe ser futura." };
  return { ok: true, msg: "" };
}

function validarCapacidad(valor) {
  if (valor === "" || valor === null) return { ok: false, msg: "La capacidad es obligatoria." };
  const n = Number(valor);
  if (!Number.isInteger(n)) return { ok: false, msg: "Debe ser un número entero." };
  if (n <= 0) return { ok: false, msg: "Debe ser mayor a 0." };
  if (n > 10000) return { ok: false, msg: "Máximo 10.000 cupos." };
  return { ok: true, msg: "" };
}

function validarCategoria(valor) {
  const permitidas = ["Cultural", "Académico", "Deportivo", "Tecnológico", "Social"];
  if (!permitidas.includes(valor)) return { ok: false, msg: "Selecciona una categoría válida." };
  return { ok: true, msg: "" };
}

/* Mapa que asocia cada campo con su validador y su <small> de error.
   Permite recorrer y validar el formulario completo de forma genérica. */
const REGLAS = {
  nombre: { validar: validarNombre, error: "errNombre" },
  email: { validar: validarEmail, error: "errEmail" },
  fecha: { validar: validarFecha, error: "errFecha" },
  capacidad: { validar: validarCapacidad, error: "errCapacidad" },
  categoria: { validar: validarCategoria, error: "errCategoria" },
};

/**
 * Valida un único campo y pinta/limpia su mensaje de error en el DOM.
 * @returns {boolean} true si el campo es válido
 */
function validarCampo(idCampo) {
  const input = document.getElementById(idCampo);
  const regla = REGLAS[idCampo];
  const resultado = regla.validar(input.value);
  const small = document.getElementById(regla.error);

  // textContent (no innerHTML) => el mensaje nunca se interpreta como HTML
  small.textContent = resultado.ok ? "" : resultado.msg;
  input.classList.toggle("invalido", !resultado.ok);
  return resultado.ok;
}

/** Valida TODO el formulario recorriendo el mapa de reglas. */
function validarFormulario() {
  // .map fuerza a validar todos los campos (para mostrar todos los errores),
  // luego .every comprueba que ninguno haya fallado.
  return Object.keys(REGLAS).map(validarCampo).every(Boolean);
}

/* =========================================================
   4) OPERACIONES SOBRE LOS DATOS (arreglo de objetos)
   ========================================================= */

/** Crea un objeto-evento normalizado a partir de datos crudos del form. */
function crearEvento({ nombre, email, fecha, capacidad, categoria }) {
  return {
    id: generarId(),
    nombre: sanitizar(nombre),
    email: sanitizar(email).toLowerCase(),
    fecha,
    capacidad: Number(capacidad),
    categoria,
    creado: Date.now(),
  };
}

/** Agrega un evento al arreglo, ordena por fecha y persiste. */
function agregarEvento(evento) {
  eventos.push(evento);
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha)); // más próximos primero
  guardarEnStorage();
}

/** Elimina un evento por id (filtrando el arreglo => sin mutar en el medio). */
function eliminarEvento(id) {
  eventos = eventos.filter((ev) => ev.id !== id);
  guardarEnStorage();
}

/** Aplica los filtros de búsqueda/categoría sobre el arreglo (no lo muta). */
function eventosFiltrados() {
  const texto = filtros.texto.toLowerCase();
  return eventos.filter((ev) => {
    const coincideTexto =
      !texto ||
      ev.nombre.toLowerCase().includes(texto) ||
      ev.email.toLowerCase().includes(texto);
    const coincideCategoria = !filtros.categoria || ev.categoria === filtros.categoria;
    return coincideTexto && coincideCategoria;
  });
}

/* =========================================================
   5) PERSISTENCIA (localStorage) — funcionalidad extra
   ========================================================= */
function guardarEnStorage() {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(eventos));
  } catch (e) {
    console.warn("No se pudo guardar en localStorage:", e);
  }
}

function cargarDesdeStorage() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    const datos = crudo ? JSON.parse(crudo) : [];
    // Defensa: solo aceptamos un arreglo; si el storage está corrupto, partimos vacíos.
    return Array.isArray(datos) ? datos : [];
  } catch (e) {
    console.warn("Storage corrupto, se reinicia:", e);
    return [];
  }
}

/* =========================================================
   6) RENDER SEGURO DEL DOM (createElement + textContent)
   Nunca se usa innerHTML con datos del usuario. Cada tarjeta
   se construye con nodos y textContent, lo que neutraliza XSS.
   ========================================================= */

/** Helper reutilizable para crear un elemento con clase y texto seguros. */
function crearNodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto; // seguro: no interpreta HTML
  return el;
}

/** Construye la tarjeta (nodo) de un evento individual. */
function crearTarjetaEvento(ev) {
  const card = crearNodo("article", "evento");
  card.dataset.id = ev.id;

  // --- Cabecera: título + chip de categoría ---
  const top = crearNodo("div", "evento-top");
  const titulo = crearNodo("h3", null, ev.nombre); // textContent => XSS-safe
  const chip = crearNodo("span", "chip " + ev.categoria, ev.categoria);
  top.append(titulo, chip);

  // --- Datos ---
  const org = crearNodo("p", "evento-org", "👤 " + ev.email);

  const fecha = crearNodo("p", "evento-dato");
  fecha.append(document.createTextNode("📅 "));
  fecha.append(crearNodo("strong", null, formatearFecha(ev.fecha)));

  const cupos = crearNodo("p", "evento-dato");
  cupos.append(document.createTextNode("🎟️ Capacidad: "));
  cupos.append(crearNodo("strong", null, ev.capacidad.toLocaleString("es-CL")));

  // --- Footer: días restantes + botón eliminar ---
  const footer = crearNodo("div", "evento-footer");
  const dias = diasRestantes(ev.fecha);
  const etiquetaDias =
    dias === 0 ? "¡Hoy!" : dias === 1 ? "Mañana" : "En " + dias + " días";
  const spanDias = crearNodo("span", "dias-restantes", "⏳ " + etiquetaDias);

  const btnEliminar = crearNodo("button", "btn-eliminar", "Eliminar");
  btnEliminar.type = "button";
  btnEliminar.setAttribute("aria-label", "Eliminar evento " + ev.nombre);
  // Listener directo: evita inline onclick (mejor práctica de seguridad/CSP)
  btnEliminar.addEventListener("click", () => manejarEliminar(ev.id));

  footer.append(spanDias, btnEliminar);
  card.append(top, org, fecha, cupos, footer);
  return card;
}

/**
 * Renderiza la LISTA completa de eventos en el DOM.
 * Función reutilizable: se llama tras agregar, eliminar o filtrar.
 */
function renderizarLista() {
  const contenedor = document.getElementById("listaEventos");
  const vacio = document.getElementById("estadoVacio");
  const lista = eventosFiltrados();

  contenedor.replaceChildren(); // limpia el contenedor sin usar innerHTML=""

  if (lista.length === 0) {
    vacio.style.display = "block";
    vacio.querySelector("p").textContent =
      eventos.length === 0
        ? "Aún no hay eventos. ¡Registra el primero!"
        : "No hay eventos que coincidan con el filtro.";
  } else {
    vacio.style.display = "none";
    // Fragmento para insertar todas las tarjetas de una sola vez (eficiencia).
    const fragmento = document.createDocumentFragment();
    lista.forEach((ev) => fragmento.append(crearTarjetaEvento(ev)));
    contenedor.append(fragmento);
  }

  actualizarMetricas();
}

/** Actualiza las métricas (total, cupos, próximo evento). */
function actualizarMetricas() {
  document.getElementById("mTotal").textContent = eventos.length;

  const totalCupos = eventos.reduce((suma, ev) => suma + ev.capacidad, 0);
  document.getElementById("mCupos").textContent = totalCupos.toLocaleString("es-CL");

  // El arreglo está ordenado por fecha => el primero es el próximo.
  const proximo = eventos[0];
  document.getElementById("mProximo").textContent = proximo
    ? formatearFecha(proximo.fecha).replace(/ de \d{4}/, "") // sin año, más corto
    : "—";
}

/* =========================================================
   7) FLUJO PRINCIPAL / MANEJADORES DE EVENTOS
   ========================================================= */

function manejarEnvio(e) {
  e.preventDefault();

  if (!validarFormulario()) {
    mostrarToast("Revisa los campos marcados en rojo.", "error");
    return;
  }

  const form = e.target;
  const evento = crearEvento({
    nombre: form.nombre.value,
    email: form.email.value,
    fecha: form.fecha.value,
    capacidad: form.capacidad.value,
    categoria: form.categoria.value,
  });

  agregarEvento(evento);
  renderizarLista();
  form.reset();
  limpiarErrores();
  mostrarToast("✅ Evento agregado correctamente.", "ok");
}

function manejarEliminar(id) {
  const ev = eventos.find((x) => x.id === id);
  if (!ev) return;
  if (!confirm(`¿Eliminar el evento "${ev.nombre}"?`)) return;

  // Animación de salida antes de quitarlo del DOM/arreglo.
  const nodo = document.querySelector(`.evento[data-id="${id}"]`);
  if (nodo) nodo.classList.add("saliendo");

  window.setTimeout(() => {
    eliminarEvento(id);
    renderizarLista();
    mostrarToast("🗑️ Evento eliminado.", "ok");
  }, 280);
}

/** Limpia todos los mensajes de error y marcas de inválido. */
function limpiarErrores() {
  Object.values(REGLAS).forEach((r) => {
    document.getElementById(r.error).textContent = "";
  });
  document
    .querySelectorAll(".invalido")
    .forEach((el) => el.classList.remove("invalido"));
}

/* ---------------- Toast (notificaciones) ---------------- */
let toastTimer = null;
function mostrarToast(mensaje, tipo = "") {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje; // textContent => seguro
  toast.className = "toast mostrar " + tipo;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.className = "toast " + tipo;
  }, 2800);
}

/* ---------------- Tema claro / oscuro ---------------- */
function alternarTema() {
  const html = document.documentElement;
  const oscuro = html.getAttribute("data-tema") === "oscuro";
  html.setAttribute("data-tema", oscuro ? "claro" : "oscuro");
  document.getElementById("btnTema").textContent = oscuro ? "🌙" : "☀️";
  try {
    localStorage.setItem("tema_inacap", oscuro ? "claro" : "oscuro");
  } catch (_) {}
}

function aplicarTemaGuardado() {
  let tema = "claro";
  try {
    tema = localStorage.getItem("tema_inacap") || "claro";
  } catch (_) {}
  document.documentElement.setAttribute("data-tema", tema);
  document.getElementById("btnTema").textContent = tema === "oscuro" ? "☀️" : "🌙";
}

/* =========================================================
   8) INICIALIZACIÓN — se conectan todos los listeners
   ========================================================= */
function init() {
  // Envío del formulario
  document.getElementById("formEvento").addEventListener("submit", manejarEnvio);

  // Validación en vivo al salir de cada campo (mejor UX)
  Object.keys(REGLAS).forEach((idCampo) => {
    const input = document.getElementById(idCampo);
    input.addEventListener("blur", () => validarCampo(idCampo));
  });

  // Botón "Limpiar": también borra los mensajes de error
  document.getElementById("formEvento").addEventListener("reset", () => {
    window.setTimeout(limpiarErrores, 0);
  });

  // Búsqueda en vivo
  document.getElementById("buscador").addEventListener("input", (e) => {
    filtros.texto = sanitizar(e.target.value);
    renderizarLista();
  });

  // Filtro por categoría
  document.getElementById("filtroCategoria").addEventListener("change", (e) => {
    filtros.categoria = e.target.value;
    renderizarLista();
  });

  // Tema
  document.getElementById("btnTema").addEventListener("click", alternarTema);
  aplicarTemaGuardado();

  // Fecha mínima = hoy (refuerza la validación de "fecha futura" en el propio input)
  document.getElementById("fecha").min = hoyISO();

  // Primer render
  renderizarLista();
}

// Arranca cuando el DOM está listo.
document.addEventListener("DOMContentLoaded", init);
