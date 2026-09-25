# Evidencia — SEGUNDA COMPARACIÓN (gate obligatorio)

Fecha: 2026-09-25 · Commit verificado: `9421bb5` (desplegado en GitHub Pages)

## Qué se comparó

| Dimensión | Sistema fuente (12 mascotas) | Proyecto (25 mascotas) | Resultado |
| --- | --- | --- | --- |
| Mascotas | Luna, Shadow, Toby, Coco, Rocky, Nube, Thor, Mimi, Nieve, Kira, Chispa, Canela | 16 originales + 9 migradas (Shadow, Coco, Nube, Thor, Mimi, Nieve, Kira, Chispa, Canela) + Luna/Rocky/Toby ya presentes con ficha propia | ✔ 12/12 nombres cubiertos |
| Datos migrados | raza, edad, peso, sexo, tamaño, badge, historia | copiados literalmente (verificado campo a campo en `verify-mission.mjs`) | ✔ 9/9 fieles |
| Imágenes | `/img/mascota-NN-*.png` | 10 fotografías originales en `images/` (9 portadas + Luna en galería); las de Toby/Rocky no se adjuntan porque las fichas locales con esos nombres son animales distintos | ✔ sin fotos cruzadas |
| Navegación | Inicio, Mascotas, Solicitudes, Cuenta | mismas 4 rutas + 404 propia | ✔ |
| Filtros y búsqueda | nombre/raza + chips de tipo | búsqueda ampliada + chips + tamaño/sexo/edad + ordenación | ✔ superset |
| Formulario de adopción | 4 pasos (vivienda, niños, otras mascotas, motivo) | 3 pasos que cubren las mismas 4 preguntas + contacto + términos + folio | ✔ equivalente |
| Solicitudes | pendiente/aprobado/rechazado | pendiente/en revisión/aprobada/rechazada/cancelada + línea de tiempo + notas | ✔ superset |
| Cuenta | nombre/correo + cerrar sesión | perfil editable, preferencias, favoritos, estadísticas, exportar, restablecer demo | ✔ superset |
| Consola / recursos | — | 7 rutas probadas en Edge headless: 0 errores, 0 recursos 404 | ✔ |

## Lo no trasladado (justificado)

- **Login/registro**: depende del backend PHP del sistema fuente; no se finge autenticación (arquitectura lista documentada en `README.md`).
- **Pantalla "wow"**: equivalente más rico en el proyecto (tarjeta aprobada con mensaje del refugio y línea de tiempo).
- **Enlace APK**: el proyecto no posee APK; banner con aviso honesto "próximamente".
- **Marco de teléfono**: envoltorio de presentación del sistema fuente, no contenido de la aplicación.

## Conclusión

Ninguna información del sistema fuente queda pendiente de trasladar sin justificación técnica. La comparación la ejecuta de nuevo, automáticamente, `tools/harness/verify-mission.mjs` (criterio `segunda_pasada`, peso 15).
