"""Authentication utilities for SWA → ACA identity forwarding."""

from fastapi import Request, HTTPException


def get_user_from_swa_headers(request: Request) -> dict:
    """Extract user identity from Static Web Apps forwarded headers.

    When SWA proxies /api/* to the backend, it injects:
      - x-ms-client-principal-id
      - x-ms-client-principal-name
      - x-ms-client-principal-idp
    """
    principal_id = request.headers.get("x-ms-client-principal-id")
    principal_name = request.headers.get("x-ms-client-principal-name", "")
    idp = request.headers.get("x-ms-client-principal-idp", "aad")

    if not principal_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {
        "userId": principal_id,
        "userName": principal_name,
        "identityProvider": idp,
    }
