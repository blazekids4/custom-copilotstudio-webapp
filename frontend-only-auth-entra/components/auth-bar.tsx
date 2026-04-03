"use client";

import { useState, useEffect } from "react";

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export default function AuthBar() {
  const [user, setUser] = useState<ClientPrincipal | null>(null);

  useEffect(() => {
    fetch("/.auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.clientPrincipal) {
          setUser(data.clientPrincipal);
        }
      })
      .catch(() => {
        /* not in SWA environment (local dev) — ignore */
      });
  }, []);

  if (!user) return null;

  return (
    <div className="auth-bar">
      <span className="user-name">
        {user.userDetails}
      </span>
      <a className="btn btn-secondary btn-sm" href="/.auth/logout">
        Sign out
      </a>
    </div>
  );
}
