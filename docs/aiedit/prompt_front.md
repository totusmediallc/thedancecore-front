# Prompt para la IA de frontend: módulo `aiedit`

## Objetivo
Diseñar una vista tipo panel administrativo que permita crear/editar todos los parámetros de IA sin romper el prompt maestro. La IA debe generar un CRUD completo (listados + formularios + modales de confirmación) para:
1. **Perfiles de sistema** (`ai_system_profile`).
2. **Documentos del sistema** (`ai_system_document`).
3. **Políticas de herramientas** (`ai_tool_policy`).
4. **Perfiles de tenant** (`tenant_ai_profile`).
5. **Directrices de tenant** (`tenant_ai_directive`).
6. **Overrides de variables** (`ai_prompt_variable_override`).

## Principios de diseño
- Mantener separadas las capas "motor" (base) y "perfil" (db). El editor solo debe modificar los registros de base de datos (`db`); nunca alterar las políticas base del motor.
- Priorizar lectura segura: todas las vistas deben traer datos paginados/filtrables y mostrar `is_active`/`enabled` antes de permitir acciones.
- Cada sección debe indicar el orden de precedencia: invariantes > políticas de sistema > políticas de tenant > overrides de variables.
- Antes de guardar, validar que no se excedan los límites de tokens (`maxPromptTokens`, `maxKnowledgeTokens`).
- Reutilizar componentes existentes (tablas, formularios con validación, toasts) siguiendo la convención de servicios HTTP del proyecto (`services/*.js`, métodos `get/post/patch/del`).

## Mapa de vistas y formularios
1. **Dashboard `aiedit`**: resumen de qué valores rigen el prompt actual.
   - Tarjetas con: perfil maestro activo, documento(s) obligatorios, límite de tokens efectivos, recuento de directrices de tenant y overrides aplicados.
   - Botón "Ver prompt renderizado" que abre un modal con la respuesta de `GET /ai/debug/prompt-structured?tenantId=<id>&includeContent=1&includePrompt=1&includeTemplateValues=1`.

2. **Sistema (`ai_system_profile`)**
   - Campos editables: `code` (solo lectura cuando existe), `name`, `version`, `system_prompt_template` (editor multilinea con resaltado), `invariant_directives` (lista ordenable), `security_policies`, `variable_schema`, `max_prompt_tokens`, `max_knowledge_tokens`, `metadata` (JSON editable), `is_active` (toggle).
   - Subpestañas para políticas: conversación, datos, duplicados, proveedores, conocimiento, herramientas (solo lectura de catálogo), seguridad, failsafes. Cada una editable como lista ordenable de strings o key/value según estructura en `metadata`.
   - Acción "Clonar" para crear un nuevo perfil a partir del actual.

3. **Documentos de sistema (`ai_system_document`)**
   - Listado con filtros por `language`, `is_active`, `title`.
   - Formulario: `title`, `description`, `language`, `source_uri`, `checksum`, `tokens_estimate`, `metadata` (JSON), `is_active`. Mostrar resumen del documento (campo `metadata.summary`).

4. **Políticas de herramientas (`ai_tool_policy`)**
   - Listado con `name`, `slug`, `enabled`, `availability_scope`, `description`.
   - Formulario: `name`, `slug`, `description`, `json_schema` (editor JSON con validación), `enabled` (toggle), `availability_scope` (select), `metadata` (JSON), `system_profile_id` (select del perfil maestro).
   - Botón "Probar schema" para validar que el JSON cumple formato `object`.

5. **Perfil del tenant (`tenant_ai_profile`)**
   - Formulario principal: `display_name`, `locale`, `timezone`, `escalation_email`, `escalation_phone`, flags `allow_custom_documents` y `allow_tool_overrides`, `directives` (lista ordenable), `metadata` (JSON). Campo de solo lectura para `tenant_id` y `system_profile_id`.
   - Subsección de límites: `metadata.maxPromptTokens`, `metadata.maxKnowledgeTokens`, `metadata.runtimeDefaults.tenant.displayName`.
   - Vista previa de valores aplicados tras overrides (`ai_prompt_variable_override`).

6. **Directrices del tenant (`tenant_ai_directive`)**
   - Listado ordenable por `priority` ascendente. Columnas: `title`, `priority`, `applies_to.channels`, `is_active`.
   - Formulario: `title`, `priority` (número), `content` (multilinea), `applies_to` (checkboxes por canal), `is_active` (toggle), `tenant_profile_id` (select).

7. **Overrides de variables (`ai_prompt_variable_override`)**
   - Listado con columnas: `variable_key`, `value`, `scope` (system/tenant/user), `tenant_profile_id`, `updated_at`.
   - Formulario: `tenant_profile_id`, `variable_key` (autocomplete con claves conocidas: `tenant.displayName`, `tenant.escalationEmail`, `system.agentName`, etc.), `value` (texto/JSON según tipo), `scope` (select), `is_active` (si aplica).
   - Validar: no permitir overrides huérfanos (deben asociarse a un tenant profile activo).

## Flujo recomendado
1. Seleccionar tenant → cargar perfil maestro asociado y mostrar valores efectivos.
2. Editar primero las directrices invariantes y políticas de sistema si se requiere un cambio global.
3. Añadir/editar documentos activos para conocimiento.
4. Ajustar herramientas habilitadas y metadatos.
5. Configurar directrices de tenant y overrides para personalizar tono/escala según despacho.
6. Previsualizar el prompt renderizado y confirmar.

## Reglas de UX
- Todas las operaciones sensibles requieren confirmación modal y muestran advertencias sobre impacto en el comportamiento del agente.
- Mostrar diffs antes de guardar cambios en textos largos (plantilla, directrices, políticas).
- En formularios JSON, incluir validación y autoformato (prettify) antes de enviar.
- Registrar auditoría mínima en UI: quién editó, cuándo, y qué campo cambió (si el backend expone esa data).

## Referencias de API
- Consumir `httpClient` ya configurado en `src/services/httpClient.js`. Generar servicios nuevos en `src/services/aiedit/*.js` siguiendo el patrón de `usersApi.js` (métodos `list/create/update/delete/get`).
- Endpoint de depuración ya existente: `GET /ai/debug/prompt-structured?tenantId=<uuid>&includeContent=1&includePrompt=1&includeTemplateValues=1`.
- Mantener la base URL proveniente de `VITE_API_BASE_URL`.

## Validaciones críticas
- Ningún campo de texto largo debe enviarse vacío (plantilla, directrices, contenido de documentos).
- `priority` debe ser único dentro de las directrices del tenant para evitar solapamientos.
- `json_schema` debe ser un JSON válido y de tipo `object`.
- En overrides, validar que `scope` coincida con la ruta de la variable (`tenant.*` solo con scope `tenant`).
- Si `maxPromptTokens` o `maxKnowledgeTokens` se dejan en blanco, usar fallback del perfil maestro.

## Entregables esperados por la IA de frontend
- Nuevas rutas bajo `/aiedit/*` protegidas por autenticación, con breadcrumb claro.
- Tablas con búsqueda y filtros en cliente, paginación (paginado remoto si el backend lo soporta), y acciones rápidas (editar, duplicar, desactivar).
- Formularios modales reutilizables con validación inline y mensajes de error del backend.
- Servicio de previsualización del prompt en vivo a partir del endpoint de depuración.
