# 🤖 Uso de Inteligencia Artificial

Este documento evidencia cómo se emplearon asistentes de IA (ChatGPT / Claude) durante el
desarrollo de **Eventos INACAP**, cumpliendo el enfoque de la Sumativa 2: *integración
inteligente de IA para mejorar la calidad del código, las validaciones y la claridad*.

> En el código fuente, cada aporte asistido por IA está marcado con el comentario `// [IA]`
> seguido del razonamiento final del equipo.

---

## 1. Generación de expresiones regulares para validación

**Prompt utilizado:**
> "Necesito una expresión regular en JavaScript para validar el nombre de un evento:
> debe permitir letras con tildes y ñ, números, espacios y signos básicos como punto,
> coma, dos puntos, paréntesis y guion. Largo entre 4 y 60 caracteres. También necesito
> una regex pragmática para validar correos electrónicos sin ser excesivamente estricta."

**Respuesta de la IA (resumen):**
```js
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 .,:()\-]{4,60}$/;
const RE_EMAIL  = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
```

**Mejora aplicada / razonamiento final:**
Se adoptaron ambas regex, pero **no se dependió solo de ellas**. El equipo las combinó con
validaciones adicionales (largo mínimo, campo obligatorio, `toLowerCase` en el correo) y las
encapsuló en funciones puras `validarNombre` / `validarEmail` que devuelven `{ ok, msg }`
para poder mostrar mensajes claros al usuario. Se decidió una regex de email *pragmática*
(en lugar de la RFC completa) porque es más legible y cubre los casos reales de correos
institucionales `@inacap.cl`.

---

## 2. Refactorización: validar el formulario completo sin repetir código

**Prompt utilizado:**
> "Tengo 5 campos y estoy repitiendo el mismo bloque de código para validar cada uno y
> mostrar su error. ¿Cómo lo refactorizo para que sea reutilizable y recorra todos los campos?"

**Respuesta de la IA (idea):**
Usar un objeto que mapee cada campo a su validador y a su elemento de error, y recorrerlo.

**Mejora aplicada:**
```js
const REGLAS = {
  nombre:    { validar: validarNombre,    error: "errNombre" },
  email:     { validar: validarEmail,     error: "errEmail" },
  fecha:     { validar: validarFecha,     error: "errFecha" },
  capacidad: { validar: validarCapacidad, error: "errCapacidad" },
  categoria: { validar: validarCategoria, error: "errCategoria" },
};

function validarFormulario() {
  return Object.keys(REGLAS).map(validarCampo).every(Boolean);
}
```
**Razonamiento final:** Esta estructura eliminó ~40 líneas duplicadas. Se usó `.map` (y no
`.every` directo) para forzar la validación de **todos** los campos y mostrar todos los errores
a la vez, mejorando la UX. Reutilizamos el mismo mapa `REGLAS` para limpiar errores.

---

## 3. Identificación y mitigación de vulnerabilidades XSS

**Prompt utilizado:**
> "Estoy generando tarjetas de eventos con datos que escribe el usuario. ¿Qué riesgos de
> seguridad tengo si uso innerHTML y cómo lo hago de forma segura?"

**Respuesta de la IA (resumen):**
Advirtió que concatenar datos del usuario en `innerHTML` permite **inyección de scripts (XSS)**;
recomendó `createElement` + `textContent`, y escapar cualquier dato que vaya a atributos.

**Mejora aplicada:**
- Toda tarjeta se construye con `createElement` + `textContent` (helper `crearNodo`).
- Se agregó la función `escaparHTML()` como segunda barrera.
- Los botones usan `addEventListener` en lugar de `onclick` inline.

```js
// Antes (sugerido descartar):
// card.innerHTML = `<h3>${ev.nombre}</h3>`;   // vulnerable

// Después (implementado):
const titulo = document.createElement("h3");
titulo.textContent = ev.nombre;               // seguro
```
**Razonamiento final:** Probamos inyectar `<img src=x onerror=alert(1)>` como nombre de evento
y, gracias a `textContent`, el texto se muestra literal y **no se ejecuta**. Se documentó el
ejemplo en el README.

---

## 4. Sugerencia de estructura de objetos para los datos

**Prompt utilizado:**
> "¿Cuál sería una buena forma de modelar cada evento como objeto para poder ordenarlo por
> fecha, filtrarlo por categoría y calcular totales?"

**Respuesta de la IA (resumen):**
Propuso un objeto con `id` único, campos normalizados y un timestamp de creación.

**Mejora aplicada:**
```js
{
  id: "ev_lz3k…",       // id único para eliminar/identificar
  nombre: "…",
  email: "…",
  fecha: "2025-11-20",  // ISO => permite comparar y ordenar con localeCompare
  capacidad: 120,       // Number => permite reduce/sumas
  categoria: "Cultural",
  creado: 1699999999999
}
```
**Razonamiento final:** Guardar la fecha en formato ISO (`YYYY-MM-DD`) permitió ordenar con
`sort` y comparar con la fecha de hoy sin librerías. El `id` único hace segura la eliminación
con `filter`, y `capacidad` como número habilita `reduce` para el total de cupos.

---

## 5. Mejora de claridad y comentarios

**Prompt utilizado:**
> "Revisa este archivo JS y sugiere cómo dividirlo en secciones claras con comentarios,
> nombres de funciones semánticos y sin lógica repetida."

**Mejora aplicada:** Se reorganizó `app.js` en 8 secciones numeradas (Estado, Utilidades,
Validación, Datos, Persistencia, Render, Eventos, Init), con nombres en español y comentarios
que explican el *por qué*, no solo el *qué*.

---

## ✅ Balance del uso de IA

| Aporte de la IA | ¿Se aceptó tal cual? | Ajuste del equipo |
|---|---|---|
| Regex de nombre y email | Parcial | Se combinaron con validaciones extra y mensajes propios |
| Refactor con mapa `REGLAS` | Sí | Se extendió para reutilizar en limpieza de errores |
| Mitigación XSS | Sí | Se agregó `escaparHTML` y se probó un payload real |
| Estructura del objeto evento | Sí | Se añadió `id` y `creado` para orden y borrado seguro |
| Comentarios/estructura | Parcial | Se reescribieron en español y orientados al "por qué" |

**Conclusión:** La IA se usó como **apoyo estratégico** (acelerar validaciones y detectar
riesgos), pero cada sugerencia fue revisada, probada y adaptada por el equipo, manteniendo el
control sobre las decisiones de diseño y seguridad.
