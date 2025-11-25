# Contexto oficial de la IA (módulo `aiedit`)

Este documento resume la estructura vigente del agente IA para propietarios y residentes, basada íntegramente en datos de la base de datos. Sirve como referencia canónica para diseñar editores y CRUDs que no dañen el prompt maestro.

## Fuentes de verdad
- **Perfil maestro** (`ai_system_profile` `code=core-proafccion` v2): contiene la plantilla `system_prompt_template`, directrices invariantes, políticas por dominio (conversación, datos, duplicados, proveedores, conocimiento, seguridad, failsafes), esquema de variables y límites de tokens (`maxPromptTokens=13500`, `maxKnowledgeTokens=7000`, overrides a 99999/7000 via tenant metadata).
- **Documentos del sistema** (`ai_system_document`): cada documento activo se inyecta en `knowledgeSummary`; actualmente destaca "Índice operativo del ecosistema IA" (tokens estimados 4200, requerido=true).
- **Políticas de herramientas** (`ai_tool_policy`): definen `name`, `slug`, `description`, `json_schema`, `enabled`, `availability_scope`, `metadata`. Ejemplo: `create_incidencia` habilitada con cautelas específicas.
- **Perfil del tenant** (`tenant_ai_profile`): define display name, locale/timezone, `escalationEmail/Phone`, flags de `allow_custom_documents` y `allow_tool_overrides`, directrices personalizadas (lista ordenada) y `metadata.runtimeDefaults` para `tenant.displayName` y límites de tokens. Se asocia a `system_profile_id`.
- **Directrices del tenant** (`tenant_ai_directive`): reglas priorizadas por `priority`, `content`, `applies_to` y `is_active`. Se muestran bajo `<DIRECTRICES PERSONALIZADAS DEL TENANT>`.
- **Overrides de variables** (`ai_prompt_variable_override`): sustituyen claves como `tenant.displayName` o `tenant.escalationEmail` a nivel de `tenant_profile_id` y `scope` (ej. `tenant`).

## Composición del prompt
1. **Identidad y propósito**: usa `system_prompt_template` + `system.agentName` y `tenant.displayName` (incluidos overrides) para fijar rol y alcance.
2. **Bloques operativos**: cada bloque `<...>` se rellena combinando políticas base del motor (sección `base` del `breakdown`) y políticas persistidas en el perfil (`db`).
3. **Variables disponibles**: se genera una leyenda con valores actuales (conversation/system/tenant/user) tomando defaults y overrides.
4. **Conocimiento**: lista documentos activos marcados como obligatorios/opcionales con fuente y fecha; se respeta `system.maxKnowledgeTokens`.
5. **Herramientas**: cada `ai_tool_policy` habilitada se lista con su descripción, cuándo usarla y cautelas (`metadata`).
6. **Failsafes y seguridad**: combinan políticas base con las definidas en `ai_system_profile.metadata` y los canales de escalamiento del tenant.

## Observaciones clave para editores
- El endpoint `GET /ai/debug/prompt-structured` ya devuelve la estructura separada por fuentes (`base` vs `db`), útil para edición granular sin mezclar contenido del motor.
- No hay dependencia local a `gepetoTuning` ni a archivos de constantes; cualquier cambio debe operar sobre los registros de base de datos anteriores.
- El orden de prioridad sigue la plantilla: invariantes > variables > políticas de conversación/datos > duplicados > proveedores > conocimiento > herramientas > seguridad > failsafes > respuesta esperada > directrices del tenant.
- `metadata.runtimeDefaults` del sistema y del tenant se aplican antes que los overrides de `ai_prompt_variable_override`; el editor debe mostrar ambos niveles para entender qué valor prevalece.
