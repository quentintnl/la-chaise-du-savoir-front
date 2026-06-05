"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export default function Home() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const endpoint = authMode === "signup" ? "signup" : "login";
      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.error ??
          (response.status === 400
            ? "Identifiants invalides ou compte déjà existant."
            : "Impossible de créer le compte pour le moment.");
        throw new Error(message);
      }

      if (data?.apiToken) {
        localStorage.setItem("apiToken", data.apiToken);
      }
      localStorage.setItem("connectedUser", login);

      setSuccessMessage(
        authMode === "signup"
          ? "Compte créé avec succès. Le token JWT a été enregistré localement."
          : "Connexion réussie. Le token JWT a été enregistré localement.",
      );
      setLogin("");
      setPassword("");
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_42%),linear-gradient(135deg,#0f172a_0%,#111827_50%,#1f2937_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-4xl border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between gap-8 border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              <span className="inline-flex w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                La Chaise du Savoir
              </span>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {authMode === "signup" ? "Crée ton compte et entre dans le duel." : "Reprends ta partie et reconnecte-toi."}
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  {authMode === "signup"
                    ? "Une inscription simple, un token JWT stocké localement et une base prête pour brancher le reste du jeu."
                    : "Une connexion simple, un token JWT stocké localement et un accès immédiat au reste du jeu."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Étape 1</p>
                <p className="mt-1 font-medium text-white">{authMode === "signup" ? "Inscription" : "Connexion"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Étape 2</p>
                <p className="mt-1 font-medium text-white">Token JWT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Étape 3</p>
                <p className="mt-1 font-medium text-white">Prêt pour le duel</p>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mx-auto max-w-md space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {authMode === "signup" ? "Inscription" : "Connexion"}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {authMode === "signup"
                    ? "Crée un compte avec un login et un mot de passe de 6 à 20 caractères."
                    : "Connecte-toi avec ton login et ton mot de passe existants."}
                </p>
              </div>

              <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1 text-sm font-medium">
                <button
                  className={`rounded-xl px-4 py-2 transition ${
                    authMode === "signup" ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setSuccessMessage("");
                    setErrorMessage("");
                  }}
                >
                  Inscription
                </button>
                <button
                  className={`rounded-xl px-4 py-2 transition ${
                    authMode === "login" ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setSuccessMessage("");
                    setErrorMessage("");
                  }}
                >
                  Connexion
                </button>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Login</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-amber-300/60 focus:bg-slate-950/70"
                    placeholder="ex: alice"
                    minLength={6}
                    maxLength={20}
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Mot de passe</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-amber-300/60 focus:bg-slate-950/70"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                    maxLength={20}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <button
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300/50"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? authMode === "signup"
                      ? "Création du compte..."
                      : "Connexion en cours..."
                    : authMode === "signup"
                      ? "Créer mon compte"
                      : "Se connecter"}
                </button>
              </form>

              {successMessage ? (
                <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {successMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {errorMessage}
                </p>
              ) : null}

              <p className="text-xs leading-6 text-slate-400">
                Le frontend appelle <span className="text-slate-200">POST /api/auth/signup</span> ou{" "}
                <span className="text-slate-200">POST /api/auth/login</span> et enregistre le token dans{" "}
                <span className="text-slate-200">localStorage</span> sous la clé <span className="text-slate-200">apiToken</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
