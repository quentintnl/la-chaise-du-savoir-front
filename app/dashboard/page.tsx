"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

type RankingEntry = {
  userId?: number;
  rank?: number;
  login?: string;
  username?: string;
  userLogin?: string;
  name?: string;
  user?: {
    login?: string;
    username?: string;
    name?: string;
  };
  score?: number;
  globalPoints?: number;
  userWinstreak?: number;
};

function getRankingLogin(entry: RankingEntry) {
  return entry.login ?? entry.username ?? entry.userLogin ?? entry.name ?? entry.user?.login ?? entry.user?.username ?? entry.user?.name ?? "Utilisateur inconnu";
}

function getRankingScore(entry: RankingEntry) {
  return entry.score ?? entry.globalPoints ?? 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [isJoiningMatch, setIsJoiningMatch] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [createdMatchId, setCreatedMatchId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [matchMessage, setMatchMessage] = useState("");
  const [matchError, setMatchError] = useState("");
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState("");

  useEffect(() => {
    setConnectedUser(localStorage.getItem("connectedUser"));
    setApiToken(localStorage.getItem("apiToken"));
  }, []);

  useEffect(() => {
    if (!apiToken) {
      return;
    }

    let cancelled = false;

    async function loadRanking() {
      setRankingLoading(true);
      setRankingError("");

      try {
        const response = await fetch(`${API_BASE_URL}/ranking/global`, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? "Impossible de charger le classement global.");
        }

        if (!cancelled) {
          setGlobalRanking(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRankingError(error instanceof Error ? error.message : "Erreur inconnue.");
        }
      } finally {
        if (!cancelled) {
          setRankingLoading(false);
        }
      }
    }

    void loadRanking();

    return () => {
      cancelled = true;
    };
  }, [apiToken]);

  async function handleCreateMatch() {
    if (!apiToken) {
      setMatchError("Token manquant. Reconnecte-toi pour créer une partie.");
      return;
    }

    setIsCreatingMatch(true);
    setMatchError("");
    setMatchMessage("");
    setInviteCode(null);
    setCreatedMatchId(null);

    try {
      const response = await fetch(`${API_BASE_URL}/match/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible de créer la partie pour le moment.");
      }

      setCreatedMatchId(data?.id ?? null);
      setInviteCode(data?.inviteCode ?? null);
      setMatchMessage(data?.message ?? "Partie créée avec succès.");
      if (data?.id && data?.inviteCode) {
        localStorage.setItem("activeMatchId", String(data.id));
        localStorage.setItem("activeMatchInviteCode", data.inviteCode);
      }
      if (data?.id) {
        router.push(`/match/${data.id}`);
      }
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsCreatingMatch(false);
    }
  }

  async function handleJoinMatch() {
    if (!apiToken) {
      setMatchError("Token manquant. Reconnecte-toi pour rejoindre une partie.");
      return;
    }

    if (!joinInviteCode.trim()) {
      setMatchError("Entre un code d'invitation valide.");
      return;
    }

    setIsJoiningMatch(true);
    setMatchError("");
    setMatchMessage("");
    setInviteCode(null);
    setCreatedMatchId(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/match/join?inviteCode=${encodeURIComponent(joinInviteCode.trim())}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible de rejoindre la partie pour le moment.");
      }

      setInviteCode(data?.inviteCode ?? joinInviteCode.trim());
      setMatchMessage(data?.message ?? "Partie rejointe avec succès.");
      setJoinInviteCode("");

      if (data?.id) {
        router.push(`/match/${data.id}`);
      }
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsJoiningMatch(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_40%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-4xl border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="p-8 sm:p-10">
            <div className="mx-auto flex min-h-120 max-w-4xl flex-col items-center justify-center gap-8 text-center">
              <div className="space-y-4">
                <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Connecté
                </span>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Bienvenue sur ta base de duel.
                </h1>
                <p className="text-base leading-7 text-slate-300 sm:text-lg">
                  {connectedUser ? `Utilisateur connecté : ${connectedUser}` : "Utilisateur connecté : inconnu"}
                </p>
              </div>

              <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6 text-left">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Créer une partie</p>
                    <p className="text-sm leading-6 text-slate-300">
                      Clique pour créer un duel et recevoir un code d’invitation à partager.
                    </p>
                  </div>

                  <button
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300/50"
                    type="button"
                    onClick={handleCreateMatch}
                    disabled={isCreatingMatch}
                  >
                    {isCreatingMatch ? "Création de la partie..." : "Créer une partie"}
                  </button>
                </div>

                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6 text-left">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rejoindre une partie</p>
                    <p className="text-sm leading-6 text-slate-300">
                      Saisis un code d’invitation de 4 caractères pour rejoindre le duel.
                    </p>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">Code d'invitation</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-amber-300/60 focus:bg-slate-950/70"
                      placeholder="ex: A7K2"
                      maxLength={4}
                      value={joinInviteCode}
                      onChange={(event) => setJoinInviteCode(event.target.value.toUpperCase())}
                      autoComplete="off"
                    />
                  </label>

                  <button
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/50"
                    type="button"
                    onClick={handleJoinMatch}
                    disabled={isJoiningMatch}
                  >
                    {isJoiningMatch ? "Rejoindre la partie..." : "Rejoindre la partie"}
                  </button>
                </div>
              </div>

              <div className="w-full max-w-4xl space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6 text-left">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Résultat</p>
                  <p className="text-sm leading-6 text-slate-300">
                    Créer ou rejoindre une partie affichera ici le retour de l'API.
                  </p>
                </div>

                {inviteCode ? (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    Code d'invitation : <span className="font-semibold tracking-[0.2em]">{inviteCode}</span>
                  </div>
                ) : null}

                {matchMessage ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {matchMessage}
                  </p>
                ) : null}

                {matchError ? (
                  <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {matchError}
                  </p>
                ) : null}

                {createdMatchId ? (
                  <button
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                    type="button"
                    onClick={() => router.push(`/match/${createdMatchId}`)}
                  >
                    Ouvrir la partie créée
                  </button>
                ) : null}
              </div>

              <div className="w-full max-w-4xl space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6 text-left">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ranking global</p>
                  <p className="text-sm leading-6 text-slate-300">
                    Classement des joueurs par points globaux.
                  </p>
                </div>

                {rankingLoading ? (
                  <p className="text-sm text-slate-300">Chargement du classement...</p>
                ) : rankingError ? (
                  <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {rankingError}
                  </p>
                ) : globalRanking.length > 0 ? (
                  <div className="space-y-3">
                    {globalRanking.slice(0, 10).map((entry) => (
                      <div
                        key={`${entry.userId ?? entry.rank ?? getRankingLogin(entry)}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                      >
                        <div>
                          <p className="font-semibold text-white">{getRankingLogin(entry)}</p>
                          <p className="text-xs text-slate-400">
                            Rang: <span className="font-semibold text-amber-200">#{entry.rank ?? "-"}</span>
                          </p>
                        </div>
                        <p className="font-semibold text-amber-100">{getRankingScore(entry)} pts</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">Aucun classement disponible pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}