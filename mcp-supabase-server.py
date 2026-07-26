#!/usr/bin/env python3
"""MCP server for Supabase using service_role key."""
import os, sys, json, re, logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
log = logging.getLogger("supabase-mcp")

# ── Config ──────────────────────────────────────────────────────────────────
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
API_URL = os.environ.get("SUPABASE_API_URL")

if not PROJECT_REF or not SERVICE_KEY:
    try:
        from dotenv import load_dotenv
        env_path = Path(__file__).parent / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            PROJECT_REF = PROJECT_REF or os.environ.get("SUPABASE_PROJECT_REF")
            SERVICE_KEY = SERVICE_KEY or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            API_URL = API_URL or os.environ.get("SUPABASE_API_URL") or os.environ.get("VITE_SUPABASE_URL")
    except ImportError:
        pass
    if not PROJECT_REF:
        PROJECT_REF = "fddvcyqbfqydvsfujcxd"
    if not API_URL:
        API_URL = f"https://{PROJECT_REF}.supabase.co"

log.info("Project ref: %s", PROJECT_REF)

# ── HTTP helpers ────────────────────────────────────────────────────────────
import httpx

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

SCHEMA_CACHE = None

def supabase_post(path, data=None, extra_headers=None):
    h = {**HEADERS, **(extra_headers or {})}
    r = httpx.post(f"{API_URL}{path}", headers=h, json=data, timeout=30)
    if r.status_code >= 400:
        return {"error": f"HTTP {r.status_code}: {r.text[:500]}"}
    try: return r.json()
    except: return {"result": r.text[:2000]}

def supabase_get(path, extra_headers=None):
    h = {**HEADERS, **(extra_headers or {})}
    r = httpx.get(f"{API_URL}{path}", headers=h, timeout=30)
    if r.status_code >= 400:
        return {"error": f"HTTP {r.status_code}: {r.text[:500]}"}
    try: return r.json()
    except: return {"result": r.text[:2000]}

def get_schema():
    """Fetch PostgREST OpenAPI schema."""
    global SCHEMA_CACHE
    if SCHEMA_CACHE:
        return SCHEMA_CACHE
    r = httpx.get(f"{API_URL}/rest/v1/", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/openapi+json",
    }, timeout=30)
    if r.status_code >= 400:
        return {"error": f"HTTP {r.status_code}: {r.text[:300]}"}
    try:
        schema = r.json()
        SCHEMA_CACHE = schema
        return schema
    except:
        return {"error": f"Not JSON: {r.text[:200]}"}

# ── Core operations ─────────────────────────────────────────────────────────
def run_sql(sql: str) -> dict:
    """Execute SQL via Supabase's pg_query RPC."""
    return supabase_post("/rest/v1/rpc/pg_query", {"query": sql})

def list_tables() -> dict:
    """List all tables from the PostgREST schema."""
    schema = get_schema()
    if isinstance(schema, dict) and "error" in schema:
        return schema
    paths = schema.get("paths", {})
    tables = []
    for path in paths:
        # Paths are like /table_name or /rpc/function_name
        if path == "/" or path.startswith("/rpc/"):
            continue
        table = path.lstrip("/")
        if table:
            tables.append({"table_name": table, "table_type": "TABLE"})
    tables.sort(key=lambda t: t["table_name"])
    return tables

def describe_table(table: str) -> dict:
    """Describe columns from the Swagger definitions."""
    schema = get_schema()
    if isinstance(schema, dict) and "error" in schema:
        return schema
    
    # Check definitions for the table schema
    defs = schema.get("definitions", {})
    if table in defs:
        props = defs[table].get("properties", {})
        if props:
            cols = []
            for col_name, col_schema in props.items():
                col_type = col_schema.get("type", "unknown")
                if "format" in col_schema:
                    col_type = col_schema["format"]
                nullable = col_schema.get("nullable", True)
                cols.append({
                    "column_name": col_name,
                    "data_type": col_type,
                    "is_nullable": "YES" if nullable else "NO",
                    "column_default": None,
                })
            return cols
    
    # Fallback: extract columns from path parameters (rowFilter.students.xxx)
    path_key = f"/{table}"
    params = schema.get("paths", {}).get(path_key, {}).get("get", {}).get("parameters", [])
    cols = []
    for p in params:
        ref = p.get("$ref", "")
        prefix = f"#/parameters/rowFilter.{table}."
        if ref.startswith(prefix):
            col_name = ref[len(prefix):]
            # Get the actual parameter definition for more info
            param_def = schema.get("parameters", {}).get(ref.replace("#/parameters/", ""), {})
            col_type = param_def.get("x-db-type", "unknown")
            cols.append({
                "column_name": col_name,
                "data_type": col_type,
                "is_nullable": "YES",
                "column_default": None,
            })
        elif ref == "#/parameters/select":
            break  # non-column params follow column filters
    
    if cols:
        return cols
    return {"error": f"No columns found for '{table}'"}

def query_table(table: str, select: str = "*", limit: int = 100, offset: int = 0, order: str = None, filters: str = None) -> dict:
    """Query a table via PostgREST API."""
    params = f"select={select}&limit={limit}&offset={offset}"
    if order:
        params += f"&order={order}"
    if filters:
        params += f"&{filters}"
    return supabase_get(f"/rest/v1/{table}?{params}")

def count_rows(table: str) -> dict:
    """Count rows via PostgREST (uses COUNT header)."""
    r = httpx.get(f"{API_URL}/rest/v1/{table}?select=count", headers={
        **HEADERS, "Prefer": "count=exact", "Accept": "text/csv",
    }, timeout=30)
    if r.status_code >= 400:
        return {"error": f"HTTP {r.status_code}: {r.text[:300]}"}
    # Content-Range: 0-0/1234
    cr = r.headers.get("content-range", "")
    m = re.search(r"/(\d+)$", cr)
    if m:
        return {"count": int(m.group(1))}
    return {"count": "?", "content-range": cr}

# ── MCP Server ─────────────────────────────────────────────────────────────
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.server.models import InitializationOptions
from mcp.types import Tool, TextContent, ServerCapabilities

server = Server("supabase")

TOOLS = [
    Tool(
        name="list_tables",
        description="List all tables exposed via PostgREST API",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="describe_table",
        description="Show column names and types for a table",
        inputSchema={
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "Table name"}
            },
            "required": ["table"],
        },
    ),
    Tool(
        name="query_table",
        description="Query rows via PostgREST. Use PostgREST filter syntax (e.g. 'name=eq.John', 'created_at=gt.2024-01-01')",
        inputSchema={
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "Table name"},
                "select": {"type": "string", "description": "Columns, e.g. '*' or 'id,name'", "default": "*"},
                "limit": {"type": "integer", "description": "Max rows", "default": 100},
                "offset": {"type": "integer", "description": "Offset", "default": 0},
                "order": {"type": "string", "description": "Sort, e.g. 'created_at.desc'"},
                "filters": {"type": "string", "description": "PostgREST filters, e.g. 'name=eq.John'"},
            },
        },
    ),
    Tool(
        name="count_rows",
        description="Count rows in a table",
        inputSchema={
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "Table name"}
            },
            "required": ["table"],
        },
    ),
    Tool(
        name="execute_sql",
        description="Execute raw SQL via pg_query RPC (must exist in DB). Use query_table instead for SELECT queries.",
        inputSchema={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SQL query"}
            },
            "required": ["sql"],
        },
    ),
]

@server.list_tools()
async def list_tools():
    return TOOLS

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        if name == "list_tables":
            result = list_tables()
        elif name == "describe_table":
            result = describe_table(arguments["table"])
        elif name == "query_table":
            result = query_table(
                arguments["table"],
                arguments.get("select", "*"),
                arguments.get("limit", 100),
                arguments.get("offset", 0),
                arguments.get("order"),
                arguments.get("filters"),
            )
        elif name == "count_rows":
            result = count_rows(arguments["table"])
        elif name == "execute_sql":
            result = run_sql(arguments["sql"])
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def main():
    async with stdio_server() as (read, write):
        await server.run(
            read, write,
            InitializationOptions(
                server_name="supabase",
                server_version="2.0.0",
                capabilities=ServerCapabilities(tools={}),
            ),
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
