# 🎓 Eventos INACAP — Registro y Gestión de Eventos

Aplicación web funcional desarrollada para la **Sumativa 2 · Front End · INACAP Maipú**.
Permite registrar, listar, filtrar y eliminar eventos culturales y académicos, aplicando
JavaScript avanzado: manipulación dinámica del DOM, validación robusta, prevención de XSS,
estructuras de datos (arreglos de objetos) y funciones reutilizables.

> **Sin frameworks.** Solo HTML5, CSS3 y JavaScript puro (Vanilla JS).

---

## 🚀 Demo y despliegue

- **Repositorio:** `https://github.com/<tu-usuario>/eventos-inacap`
- **Despliegue (GitHub Pages):** `https://<tu-usuario>.github.io/eventos-inacap/`

> Reemplaza `<tu-usuario>` por tu usuario real de GitHub al publicar.

---

## ✨ Funcionalidades

| Funcionalidad | Detalle |
|---|---|
| 📝 Formulario | 5 campos: texto, email, fecha, número y select |
| ✅ Validación robusta | Regex, campos obligatorios, fecha futura, números positivos |
| 🛡️ Seguridad | Sanitización + `textContent`/`createElement` (anti-XSS) |
| 🗂️ Datos | Arreglo de objetos con `push`, `filter`, `sort`, `reduce`, `find` |
| 🔄 DOM dinámico | Alta, baja y filtrado en tiempo real sin recargar |
| 🔎 Búsqueda + filtro | Por nombre/organizador y por categoría |
| 📊 Métricas | Total de eventos, cupos totales y próximo evento |
| 💾 Persistencia | `localStorage` (los datos sobreviven a recargas) |
| 🌙 Modo oscuro | Tema claro/oscuro con preferencia guardada |
| 📱 Responsive | Diseño adaptable a móvil, tablet y escritorio |

---

## 📁 Estructura del proyecto

```
eventos-inacap/
├── index.html     # Estructura + formulario + contenedores del DOM
├── styles.css     # Estilos, variables CSS, responsive y modo oscuro
├── app.js         # Lógica: estado, validación, DOM seguro, eventos
├── README.md      # Este archivo
└── USO_IA.md      # Evidencia del apoyo con IA (prompts + mejoras)
```

---

## 🧩 Arquitectura del código (`app.js`)

El código está organizado en **capas con funciones reutilizables**:

1. **Estado** — arreglo de objetos `eventos` + persistencia.
2. **Utilidades** — `sanitizar()`, `escaparHTML()`, `formatearFecha()`, `diasRestantes()`.
3. **Validación** — validadores puros que devuelven `{ ok, msg }` (`validarNombre`, `validarEmail`, `validarFecha`, `validarCapacidad`, `validarCategoria`).
4. **Datos** — `crearEvento()`, `agregarEvento()`, `eliminarEvento()`, `eventosFiltrados()`.
5. **Render seguro** — `crearNodo()`, `crearTarjetaEvento()`, `renderizarLista()` (todo con `createElement` + `textContent`).
6. **Eventos** — `manejarEnvio()`, `manejarEliminar()` y listeners en `init()`.

---

## 🛡️ Buenas prácticas de seguridad

- **Nunca** se usa `innerHTML` con datos del usuario. Las tarjetas se construyen con
  `document.createElement` + `textContent`, que **no interpreta HTML** → neutraliza XSS.
- Doble barrera: función `escaparHTML()` disponible para cualquier dato que deba ir a un atributo.
- Sanitización de entradas (`trim`, colapso de espacios) antes de guardar.
- Botones creados con `addEventListener` en vez de `onclick` inline (compatible con CSP).
- Validación de tipo/rango en números y de formato con expresiones regulares.

### Ejemplo (fragmento real)
```js
// ❌ Peligroso (vulnerable a XSS):
// contenedor.innerHTML = "<h3>" + ev.nombre + "</h3>";

// ✅ Seguro (usado en el proyecto):
const titulo = document.createElement("h3");
titulo.textContent = ev.nombre; // no se interpreta como HTML
```

---

## ▶️ Cómo ejecutar en local

No requiere instalación ni dependencias:

1. Descarga o clona el repositorio.
2. Abre `index.html` en el navegador (doble clic), **o**
3. Sirve la carpeta con un servidor estático, por ejemplo:
   ```bash
   npx serve .
   # o con Python:
   python -m http.server 8080
   ```

---

## 🤖 Uso de IA

Este proyecto utilizó asistentes de IA (ChatGPT / Claude) para apoyar la validación,
refactorización y buenas prácticas. El detalle de prompts, respuestas y mejoras aplicadas
está documentado en **[USO_IA.md](USO_IA.md)**. En el código, los aportes asistidos por IA
están marcados con comentarios `// [IA] ...`.

---

## 👥 Autores

- Integrante 1 — *Nombre Apellido*
- Integrante 2 — *Nombre Apellido*

Asignatura: **Front End** · Docente: *________* · INACAP Maipú · 2025.
