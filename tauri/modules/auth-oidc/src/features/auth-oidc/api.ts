/** Typed wrappers for the sign-in commands. Tokens never reach the interface. */
import { invoke } from "@tauri-apps/api/core";

export interface AuthStatus {
  signedIn: boolean;
  user: { sub: string; name: string | null; email: string | null } | null;
}

export const auth = {
  status: () => invoke<AuthStatus>("auth_status"),
  signIn: () => invoke<AuthStatus>("auth_sign_in"),
  signOut: () => invoke<AuthStatus>("auth_sign_out"),
};
