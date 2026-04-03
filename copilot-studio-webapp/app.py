# app.py — Python backend for the Custom Copilot Studio POC
#
# Auth flow (OAuth2 Authorization Code):
#   1. Frontend calls GET /api/auth/login → gets Entra ID authorize URL
#   2. User authenticates at Entra ID → redirected back to frontend with ?code=
#   3. Frontend sends code to POST /api/auth/callback
#   4. Backend exchanges code for tokens (MSAL ConfidentialClient) + caches them
#   5. Backend returns a sessionId to the frontend
#   6. Frontend sends chat messages with sessionId
#   7. Backend uses cached user token to call Copilot Studio via connection string

import logging
import uuid
from os import environ
from pathlib import Path
from urllib.parse import urlparse

from aiohttp import web
from aiohttp.web import Request, Response
from dotenv import load_dotenv
from msal import ConfidentialClientApplication

from microsoft_agents.activity import ActivityTypes
from microsoft_agents.copilotstudio.client import (
    ConnectionSettings,
    CopilotClient,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ms_agents_logger = logging.getLogger("microsoft_agents")
ms_agents_logger.addHandler(logging.StreamHandler())
ms_agents_logger.setLevel(logging.INFO)

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration (matches .env variable names)
# ---------------------------------------------------------------------------
TENANT_ID = environ["TENANT_ID"]
CLIENT_ID = environ["CLIENT_ID"]
CLIENT_SECRET = environ["CLIENT_SECRET"]
REDIRECT_URI = environ["REDIRECT_URI"]
COPILOT_CONNECTION_STRING = environ["COPILOT_CONNECTION_STRING"]
ALLOWED_ORIGIN = environ.get("ALLOWED_ORIGIN", "http://localhost:3000")

# Power Platform API scope — .default requests all consented permissions
COPILOT_SCOPES = ["https://api.powerplatform.com/.default"]

# ---------------------------------------------------------------------------
# MSAL Confidential Client  (server holds the secret, exchanges auth codes)
# ---------------------------------------------------------------------------
msal_app = ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=f"https://login.microsoftonline.com/{TENANT_ID}",
)

# ---------------------------------------------------------------------------
# In-memory stores  (POC only — not for production)
# ---------------------------------------------------------------------------
# session_id  →  { username, name }
sessions: dict[str, dict] = {}
# session_id  →  copilot_studio_conversation_id
conversation_store: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Parse the Copilot Studio connection string into SDK ConnectionSettings
# ---------------------------------------------------------------------------
def _parse_connection_string(url: str) -> ConnectionSettings:
    """Extract environment_id and agent schema name from a Copilot Studio
    connection string URL.

    Example URL:
      https://default6eef...bfe2.82.environment.api.powerplatform.com
        /copilotstudio/dataverse-backed/authenticated/bots/cra99_agent1
        /conversations?api-version=2022-03-01-preview
    """
    parsed = urlparse(url)
    host_parts = parsed.hostname.split(".")
    if len(host_parts) < 3:
        raise ValueError(f"Cannot parse connection string hostname: {parsed.hostname}")

    # Reconstitute the normalised environment hex id
    environment_id = host_parts[0] + host_parts[1]

    # Extract schema name from  .../bots/<schemaName>/conversations
    path_segments = [s for s in parsed.path.split("/") if s]
    schema_name = ""
    for i, seg in enumerate(path_segments):
        if seg == "bots" and i + 1 < len(path_segments):
            schema_name = path_segments[i + 1]
            break

    if not schema_name:
        raise ValueError(
            f"Cannot extract agent schema name from connection string path: {parsed.path}"
        )

    return ConnectionSettings(
        environment_id=environment_id,
        agent_identifier=schema_name,
        cloud=None,
        copilot_agent_type=None,
        custom_power_platform_cloud=None,
        client_session_settings={"read_bufsize": 1024 * 1024},  # 1 MB line buffer
    )


# Pre-parse once at startup so we fail fast if the URL is bad
CONNECTION_SETTINGS = _parse_connection_string(COPILOT_CONNECTION_STRING)
logger.info(
    "Copilot Studio agent: env=%s  schema=%s",
    CONNECTION_SETTINGS.environment_id,
    CONNECTION_SETTINGS.agent_identifier,
)


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
async def handle_login(_request: Request) -> Response:
    """GET /api/auth/login → returns the Entra ID authorization URL."""
    auth_url = msal_app.get_authorization_request_url(
        scopes=COPILOT_SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    return web.json_response({"authUrl": auth_url})


async def handle_callback(request: Request) -> Response:
    """POST /api/auth/callback → exchange the authorization code for tokens.

    Body: { code: string }
    Returns: { sessionId, displayName, email }
    """
    body = await request.json()
    code = body.get("code", "").strip()
    if not code:
        return web.json_response({"error": "'code' is required."}, status=400)

    result = msal_app.acquire_token_by_authorization_code(
        code=code,
        scopes=COPILOT_SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    if "error" in result:
        logger.warning("Token exchange failed: %s", result.get("error_description"))
        return web.json_response(
            {
                "error": result.get("error"),
                "errorDescription": result.get("error_description"),
            },
            status=401,
        )

    # Pull user info from the ID token claims
    claims = result.get("id_token_claims", {})
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "username": claims.get("preferred_username", ""),
        "name": claims.get("name", ""),
    }

    logger.info("Session created for %s", sessions[session_id]["username"])
    return web.json_response(
        {
            "sessionId": session_id,
            "displayName": sessions[session_id]["name"],
            "email": sessions[session_id]["username"],
        }
    )


async def handle_me(request: Request) -> Response:
    """GET /api/auth/me?sessionId=... → returns user info for a session."""
    session_id = request.query.get("sessionId", "")
    session = sessions.get(session_id)
    if not session:
        return web.json_response({"error": "Invalid session."}, status=401)
    return web.json_response(
        {"displayName": session["name"], "email": session["username"]}
    )


async def handle_logout(request: Request) -> Response:
    """POST /api/auth/logout → clears the server-side session."""
    body = await request.json()
    session_id = body.get("sessionId", "")
    sessions.pop(session_id, None)
    conversation_store.pop(session_id, None)
    return web.json_response({"status": "ok"})


# ---------------------------------------------------------------------------
# Token helper — get a valid delegated token for this user's session
# ---------------------------------------------------------------------------
def _get_token_for_session(session_id: str) -> str:
    session = sessions.get(session_id)
    if not session:
        raise ValueError("Invalid session — please sign in again.")

    accounts = msal_app.get_accounts(username=session["username"])
    if not accounts:
        raise ValueError("Session expired — please sign in again.")

    result = msal_app.acquire_token_silent(
        scopes=COPILOT_SCOPES,
        account=accounts[0],
    )
    if not result or "access_token" not in result:
        raise ValueError("Token expired — please sign in again.")

    return result["access_token"]


# ---------------------------------------------------------------------------
# Chat endpoints
# ---------------------------------------------------------------------------
async def handle_chat(request: Request) -> Response:
    """POST /api/chat → proxy a user message to the Copilot Studio agent.

    Body: { message: string, sessionId: string }
    """
    body = await request.json()
    message: str = body.get("message", "").strip()
    session_id: str = body.get("sessionId", "").strip()

    if not message:
        return web.json_response({"error": "'message' is required."}, status=400)
    if not session_id:
        return web.json_response({"error": "'sessionId' is required."}, status=400)

    # Get the user's delegated token (cached / refreshed by MSAL)
    try:
        token = _get_token_for_session(session_id)
    except ValueError as exc:
        return web.json_response({"error": str(exc)}, status=401)

    client = CopilotClient(CONNECTION_SETTINGS, token)

    conversation_id = conversation_store.get(session_id)
    responses: list[str] = []
    suggested_actions: list[str] = []

    if not conversation_id:
        # First message — start a new conversation (skip greeting messages)
        async for reply in client.start_conversation(
            emit_start_conversation_event=True
        ):
            if reply.conversation:
                conversation_id = reply.conversation.id
                conversation_store[session_id] = conversation_id

        # Relay the user's actual question
        if conversation_id:
            async for reply in client.ask_question(message, conversation_id):
                if reply.type == ActivityTypes.message and reply.text:
                    responses.append(reply.text)
                    if reply.suggested_actions:
                        for action in reply.suggested_actions.actions:
                            suggested_actions.append(action.title)
    else:
        async for reply in client.ask_question(message, conversation_id):
            if reply.type == ActivityTypes.message and reply.text:
                responses.append(reply.text)
                if reply.suggested_actions:
                    for action in reply.suggested_actions.actions:
                        suggested_actions.append(action.title)

    return web.json_response(
        {
            "responses": responses,
            "suggestedActions": suggested_actions,
            "sessionId": session_id,
            "conversationId": conversation_id,
        }
    )


async def handle_reset(request: Request) -> Response:
    """POST /api/reset → clear the conversation so the next message starts fresh."""
    body = await request.json()
    session_id = body.get("sessionId", "")
    conversation_store.pop(session_id, None)
    return web.json_response({"status": "ok"})


async def handle_health(_request: Request) -> Response:
    """GET /api/health → liveness check."""
    return web.json_response({"status": "ok"})


# ---------------------------------------------------------------------------
# CORS middleware  (allows the Next.js frontend on a different port)
# ---------------------------------------------------------------------------
@web.middleware
async def cors_middleware(request: Request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex

    allowed_origin = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Origin"] = allowed_origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Max-Age"] = "3600"
    return response


# ---------------------------------------------------------------------------
# App factory & entry point
# ---------------------------------------------------------------------------
def create_app() -> web.Application:
    app = web.Application(middlewares=[cors_middleware])

    # Auth
    app.router.add_get("/api/auth/login", handle_login)
    app.router.add_post("/api/auth/callback", handle_callback)
    app.router.add_get("/api/auth/me", handle_me)
    app.router.add_post("/api/auth/logout", handle_logout)

    # Chat
    app.router.add_post("/api/chat", handle_chat)
    app.router.add_post("/api/reset", handle_reset)
    app.router.add_get("/api/health", handle_health)

    # CORS preflight for all POST endpoints
    for path in ["/api/auth/callback", "/api/auth/logout", "/api/chat", "/api/reset"]:
        app.router.add_route("OPTIONS", path, handle_health)

    # Serve the Next.js static export if the `static/` directory exists
    # (present in the Docker image, absent in local dev)
    static_dir = Path(__file__).parent / "static"
    if static_dir.is_dir():

        async def serve_static(request: Request) -> Response:
            """Serve static files, falling back to index.html for SPA routes."""
            rel_path = request.match_info.get("path", "")
            file_path = static_dir / rel_path

            # Serve the exact file if it exists
            if file_path.is_file():
                return web.FileResponse(file_path)

            # Try adding .html (Next.js static export convention)
            html_path = static_dir / f"{rel_path}.html"
            if html_path.is_file():
                return web.FileResponse(html_path)

            # Fall back to index.html for SPA client-side routing
            return web.FileResponse(static_dir / "index.html")

        app.router.add_get("/{path:.*}", serve_static)

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(environ.get("PORT", "3978"))
    host = environ.get("HOST", "0.0.0.0")
    logger.info("Starting Copilot Studio proxy on http://%s:%s", host, port)
    web.run_app(app, host=host, port=port)
