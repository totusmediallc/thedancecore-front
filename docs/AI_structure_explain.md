# Estructura actual del prompt del sistema de IA

## Resumen ejecutivo
- El prompt maestro ya se arma completamente desde la base de datos (`ai_system_profile`, `ai_system_document`, `ai_tool_policy`, `tenant_ai_profile`, `tenant_ai_directive` y `ai_prompt_variable_override`). No existe en el código un fallback activo a `src/constants/gepetoTuning.constants.ts`; el archivo ni siquiera está presente en este repositorio.
- El endpoint de depuración `GET /ai/debug/prompt-structured` (ejemplo con `tenantId=550e8400-e29b-41d4-a716-446655440001`) confirma que la plantilla (`system_prompt_template`), las directrices invariantes y dinámicas, las políticas de conversación/datos/proveedores, el catálogo de herramientas y los valores por defecto provienen de la capa de datos.
- La plantilla base usa marcadores `{{...}}` para inyectar variables de sistema, tenant, usuario y contexto conversacional. Los valores por defecto (`runtimeDefaults`) rellenan `system.agentName` y los overrides de `tenant_ai_profile.metadata` fijan límites de tokens (`maxPromptTokens=99999`, `maxKnowledgeTokens=7000`).

## Componentes que alimentan el prompt
- **Plantilla del sistema** (`ai_system_profile.system_prompt_template`): define los bloques `<IDENTIDAD>`, `<DIRECTRICES IRROMPIBLES>`, `<VARIABLES DISPONIBLES>` y los epígrafes operativos. Las directrices "irrompibles" y las políticas se insertan con variables como `{{system.invariantDirectives}}`, `{{system.conversationPolicies}}`, `{{system.dataPolicies}}`, etc.
- **Directrices invariantes** (`ai_system_profile.invariant_directives`): ocho reglas con prioridad absoluta (alcance Proafccion, validaciones humanas, límites de módulos, gestión de imágenes/audios y propuestas de área/prioridad). Estas son las que aparecen bajo `breakdown.invariants.db` en el endpoint de depuración.
- **Políticas de conversación/datos/duplicados/proveedores/seguridad/failsafes**: derivan de `ai_system_profile.metadata` y se mezclan con los bloques base del motor. En el `breakdown` se listan como `db` (las específicas del perfil) frente a `base` (políticas genéricas del motor).
- **Documentos del sistema** (`ai_system_document`): actualmente solo se usa "Índice operativo del ecosistema IA" y se marca como obligatorio en el bloque de conocimiento. No hay documentos de tenant activos en el ejemplo.
- **Herramientas** (`ai_tool_policy`): "Crear incidencia en área común" se inserta como herramienta habilitada con su `json_schema`, `whenToUse` y notas de cautela.
- **Perfil del tenant** (`tenant_ai_profile`): fija alias, escalamiento, directrices personalizadas (6 entradas) y overrides de tokens/variables. Sus overrides se ven en `variables.defaulted.tenant` y `system.dynamicTenantDirectives` del endpoint.
- **Overrides de variables** (`ai_prompt_variable_override`): se aplican por `scope` y `tenant_profile_id`. En el ejemplo, `tenant.displayName` y `tenant.escalationEmail` se sustituyen antes de renderizar el prompt.

## Señales del endpoint `prompt-structured`
- `template.source: "db"` ratifica que la plantilla se toma de `ai_system_profile.system_prompt_template`.
- Cada bloque muestra conteos `baseCount` vs `dbCount`; las entradas del perfil se reflejan en `db`, mientras que `base` proviene del motor genérico. Esta separación facilita auditar qué viene de la base y qué del core.
- `variables.defaulted` confirma que los valores de `tenant` y `system` provienen de metadatos y overrides; no hay valores provenientes de archivos locales.

## Estado del archivo `gepetoTuning.constants.ts`
- El repositorio no contiene `src/constants/gepetoTuning.constants.ts` ni referencias a `gepeto`/`gepetoTuning`. La carga actual del prompt no depende de un archivo de constantes en frontend; todo el contenido relevante ya está en la base de datos o proviene del motor.
- Con la evidencia del endpoint, se puede proceder a minimizar o eliminar un eventual archivo de respaldo en backend, siempre que se mantenga la plantilla y las políticas en la base de datos.

## Próximos pasos sugeridos
1. Mantener sincronizados los metadatos del perfil maestro (`ai_system_profile`) con cualquier ajuste operativo; los cambios se reflejan inmediatamente en el prompt renderizado.
2. Registrar cada documento operativo relevante en `ai_system_document` con `is_active=true` para que aparezca en `knowledgePolicies` y `knowledgeSummary`.
3. Migrar cualquier resto de configuración local que pueda existir en servicios heredados al esquema de base de datos usado por el endpoint.
