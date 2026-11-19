# MCP: consultar los datos desde Claude (fase 1, local)

Un servidor MCP deja que Claude lea los datos de Robot Fan Club y los analice en un chat. Decisión: D-044. Esta es la **fase 1: local y de solo lectura**.

## Dónde funciona
| | Fase 1 (local) |
|---|---|
| Claude Desktop (app de chat de escritorio) | Sí |
| Claude Code (terminal y VS Code) | Sí |
| claude.ai en el navegador y en el celular | **No**: necesita la versión remota (fase 2) |
| Otras personas | No: corre en tu máquina |

## Qué puede preguntarse
Siete herramientas, todas de lectura:
| Herramienta | Qué devuelve |
|---|---|
| `list_clients` | Clientes, tipo (`real`, `demo`, `sandbox`) y la ventana de queries vigente |
| `get_citations` | Citas de la ventana: totales, % fuera del top 10, tasa de cita, estado del SLA y una fila por query. Filtros: `all`, `cited`, `off_top10`, `gap`; superficie; límite |
| `get_gaps` | Queries con respuesta de IA donde no citan al cliente, y a quién citan en su lugar |
| `get_evidence` | La evidencia de una query: texto de la respuesta de IA, fuentes en orden y top 10 orgánico. Con `raw: true` devuelve el JSON crudo completo |
| `get_speed` | INP por plantilla y por día, CrUX, ventanas y scripts de terceros |
| `get_ai_visibility` | Módulo informativo: menciones en Google y ChatGPT, preguntas (paginadas) y sitios citados al lado |
| `get_query_ideas` | Preguntas que Google ya cita para el dominio, sin las ya congeladas |

Ejemplos de preguntas: "¿Qué queries del piloto de Bauman no están citadas y a quién cita la IA?", "Muéstrame por qué 'books worth money' sí cita a Bauman", "¿Qué le falta a 'how to sell rare books'?".

## Cómo conectarlo
Necesitas `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local` (ya están). La clave **se queda en tu máquina**: no viaja por el MCP.

Reemplaza `<PROYECTO>` por la ruta del proyecto y `<NODE>` por la salida de `which node` (Claude Desktop arranca con un `PATH` mínimo, por eso conviene la ruta completa).

**Claude Desktop.** Abre Settings → Developer → Edit Config (archivo `claude_desktop_config.json`) y agrega:
```json
{
  "mcpServers": {
    "robot-fan-club": {
      "command": "<NODE>",
      "args": ["--no-warnings", "--env-file=<PROYECTO>/.env.local", "<PROYECTO>/mcp/server.ts"]
    }
  }
}
```
Reinicia Claude Desktop. Debe aparecer `robot-fan-club` con 7 herramientas.

**Claude Code.**
```
claude mcp add robot-fan-club -- <NODE> --no-warnings --env-file=<PROYECTO>/.env.local <PROYECTO>/mcp/server.ts
```

Para probarlo sin Claude: `npm run mcp` lo arranca (queda esperando; es normal) y `npx vitest run tests/mcp.test.ts` lo prueba de punta a punta.

## Reglas de seguridad
- **Solo lectura, reforzada.** El servidor recibe un cliente de base de datos que solo tiene `select` y `download`: no existe forma de insertar, actualizar, borrar ni subir archivos. Un test lo verifica.
- **Nada llama a DataForSEO.** Ninguna herramienta gasta dinero.
- **No sale información sensible:** ni costos, ni honorarios del cliente, ni rutas internas de Storage, ni claves. Un test busca esas palabras en todas las salidas.
- **Errores cortos.** Ante una entrada inválida o un fallo, Claude recibe una frase corta, nunca una traza ni un mensaje de la base.
- **Límites:** máximo 200 filas por consulta y 120.000 caracteres de JSON crudo.

## Qué esperar (y qué no)
- Las recomendaciones que Claude haga con estos datos son **hipótesis**: las respuestas de IA cambian de un día a otro.
- Este servidor local usa la clave de servicio, que se salta las reglas de acceso (RLS): **es para el dueño y el equipo de la agencia**, que ya ven todo. No lo prepares para otras personas.
- La versión remota (fase 2) usará la sesión de cada persona, con RLS, y depende de D-045 (capa de agencias) y del deploy.

## Cómo está armado
Las consultas viven en un núcleo compartido (`src/lib/data/read.ts`) que reciben el cliente de base de datos como parámetro: el portal lo llama con la sesión del usuario y el MCP con el cliente de solo lectura. Así la fase 2 reutiliza el mismo código. Las herramientas están en `mcp/tools.ts`, el servidor (independiente del transporte) en `mcp/create.ts` y la entrada stdio en `mcp/server.ts`.

Versión en inglés: [`../en/mcp.md`](../en/mcp.md).
