"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import { hasPermission as checkPermission } from "@/lib/permissions";
import type { User } from "@/types";

// Aktif kullanıcıyı yükleyip yetki kontrolü için kolay bir hook sağlar.
// Kullanıcı hazır olmadan önce tüm kontroller false döner, loading true olur.
export function usePermissions() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        setUser(me);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    user,
    loading,
    can: (permission: string) => checkPermission(user, permission),
    canAny: (permissions: string[]) =>
      permissions.some((permission) => checkPermission(user, permission)),
  };
}
