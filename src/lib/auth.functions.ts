import { createServerFn } from "@tanstack/react-start";

/**
 * Legacy compatibility shim. Authentication and authorization are resolved by
 * Supabase Auth plus public.profiles in member.ts; this server function never
 * fabricates a session or grants a role.
 */
export const getSession = createServerFn({ method: "GET" }).handler(async () => null);
