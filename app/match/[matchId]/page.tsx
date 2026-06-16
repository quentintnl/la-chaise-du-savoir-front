"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
const QUIZ_QUESTION_COUNT = 10;

type QuestionDto = {
  type?: string;
  difficulty?: string;
  category?: string;
  question?: string;
  correct_answer?: string;
  incorrect_answer?: string[];
};

type MatchAnswerResponse = {
  message?: string;
  points?: number;
  matchStatus?: "ongoing" | "finished";
};

type RankingEntry = {
  id?: number;
  userId?: number;
  login?: string;
  username?: string;
  user?: {
    id?: number;
    login?: string;
    username?: string;
  };
};

export default function MatchPage() {
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;

  const [apiToken, setApiToken] = useState<string | null>(null);
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [matchFinished, setMatchFinished] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const title = useMemo(() => {
    if (matchFinished) {
      return "Partie terminée";
    }

    return `Partie #${matchId}`;
  }, [matchFinished, matchId]);

  useEffect(() => {
    setApiToken(localStorage.getItem("apiToken"));
    setConnectedUser(localStorage.getItem("connectedUser"));
    if (typeof window !== "undefined") {
      const storedMatchId = localStorage.getItem("activeMatchId");
      const storedInviteCode = localStorage.getItem("activeMatchInviteCode");

      if (storedMatchId === String(matchId) && storedInviteCode) {
        setActiveInviteCode(storedInviteCode);
      } else {
        setActiveInviteCode(null);
      }
    }
  }, []);

  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const totalQuestionsToPlay = useMemo(
    () => Math.min(QUIZ_QUESTION_COUNT, questions.length),
    [questions.length],
  );

  async function resolveConnectedUserId(token: string, login: string | null) {
    const storedUserId = localStorage.getItem("connectedUserId");
    if (storedUserId && !Number.isNaN(Number(storedUserId))) {
      return Number(storedUserId);
    }

    if (!login) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ranking/global`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json().catch(() => null)) as RankingEntry[] | null;
      if (!response.ok || !Array.isArray(data)) {
        return null;
      }

      const currentEntry = data.find((entry) => {
        const entryLogin = entry.login ?? entry.username ?? entry.user?.login ?? entry.user?.username;
        return entryLogin === login;
      });

      const resolvedId = currentEntry?.id ?? currentEntry?.userId ?? currentEntry?.user?.id;
      if (typeof resolvedId === "number") {
        localStorage.setItem("connectedUserId", String(resolvedId));
        return resolvedId;
      }
    } catch {
      return null;
    }

    return null;
  }

  useEffect(() => {
    if (!apiToken || !matchId) return;

    let cancelled = false;

    async function loadQuestions() {
      setIsLoadingQuestion(true);
      setErrorMessage("");

      try {
        const response = await fetch(`${API_BASE_URL}/match/${matchId}/question`, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          // if no questions yet, keep polling
          throw new Error(data?.error ?? "Pas encore de questions disponibles.");
        }

        // backend may return either a single question or an array
        let list: QuestionDto[] = [];
        if (Array.isArray(data)) list = data;
        else if (data) list = [data];

        if (cancelled) return;

        if (list.length === 0) {
          // no questions yet; poll later
          setTimeout(() => {
            if (!cancelled) void loadQuestions();
          }, 3000);
          return;
        }

        setQuestions(list);
        setCurrentIndex(0);
        const first = list[0];
        const choices = [first?.correct_answer, ...(first?.incorrect_answer ?? [])].filter(
          (c): c is string => Boolean(c),
        );
        setQuestion(first);
        setOptions(choices.sort(() => Math.random() - 0.5));
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
      } finally {
        if (!cancelled) setIsLoadingQuestion(false);
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [apiToken, matchId]);

  useEffect(() => {
    if (!question || matchFinished || isLoadingQuestion) {
      return;
    }

    setTimeLeft(60);

    const timerId = window.setInterval(() => {
      setTimeLeft((currentTimeLeft) => {
        if (currentTimeLeft <= 1) {
          window.clearInterval(timerId);
          void resolveCurrentQuestion(false, true);
          return 0;
        }

        return currentTimeLeft - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [question, matchFinished, isLoadingQuestion]);

  async function resolveCurrentQuestion(isCorrect: boolean, isTimeout = false) {
    if (!apiToken || !question?.correct_answer) {
      setErrorMessage("Impossible de soumettre la réponse.");
      return;
    }

    if (!isTimeout && !selectedAnswer) {
      setErrorMessage("Sélectionne une réponse avant d’envoyer.");
      return;
    }

    setIsSubmittingAnswer(true);
    setErrorMessage("");

    try {
      const answerIsCorrect = isTimeout ? false : isCorrect;

      // send answer to backend (keeps compatibility with existing API)
      await fetch(`${API_BASE_URL}/match/${matchId}/answer?isCorrect=${answerIsCorrect}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch(() => null);

      if (answerIsCorrect) setCorrectCount((c) => c + 1);

      // move to next question locally
      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalQuestionsToPlay) {
        const finalScore = correctCount + (answerIsCorrect ? 1 : 0);

        let pointsToAward = 0;
        if (finalScore > 7) {
          pointsToAward = 3;
        } else if (finalScore > 5 && finalScore <= 7) {
          pointsToAward = 1;
        }

        if (pointsToAward > 0) {
          try {
            const connectedUserId = await resolveConnectedUserId(apiToken, connectedUser);
            if (connectedUserId) {
              await fetch(
                `${API_BASE_URL}/ranking/user/${connectedUserId}/add-points?points=${pointsToAward}`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${apiToken}` },
                },
              );
            }
          } catch (e) {
            // ignore ranking update errors; the match itself is already finished locally
          }
        }

        setMatchFinished(true);
        setFeedbackMessage(
          `Partie terminée. Score final: ${finalScore}/${totalQuestionsToPlay}. Points gagnés: ${pointsToAward}.`,
        );
        return;
      }

      const next = questions[nextIndex];
      setQuestion(next);
      const nextChoices = [next?.correct_answer, ...(next?.incorrect_answer ?? [])].filter(
        (c): c is string => Boolean(c),
      );
      setOptions(nextChoices.sort(() => Math.random() - 0.5));
      setSelectedAnswer("");
      setCurrentIndex(nextIndex);
      setTimeLeft(60);
      setFeedbackMessage(isTimeout ? "Temps écoulé. Passage à la question suivante." : "Réponse enregistrée.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  async function handleSubmitAnswer() {
    const isCorrect = selectedAnswer === question?.correct_answer;
    await resolveCurrentQuestion(isCorrect, false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_40%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-4xl border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="p-8 sm:p-10">
            <div className="mx-auto flex max-w-3xl flex-col gap-8">
              <div className="space-y-4 text-center">
                <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  En jeu
                </span>
                {activeInviteCode ? (
                  <span className="inline-flex w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    Code partie : {activeInviteCode}
                  </span>
                ) : null}
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
                <p className="text-base leading-7 text-slate-300 sm:text-lg">
                  {connectedUser ? `Joueur connecté : ${connectedUser}` : `Partie en cours avec l'identifiant ${matchId}`}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                {isLoadingQuestion ? (
                  <p className="text-sm text-slate-300">Chargement de la question...</p>
                ) : errorMessage ? (
                  <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {errorMessage}
                  </p>
                ) : question ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {question.category ?? "Catégorie inconnue"} {question.difficulty ? `· ${question.difficulty}` : ""}
                      </p>
                      <p className="text-2xl font-semibold leading-tight text-white">{question.question}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <span>Temps restant</span>
                      <span className={timeLeft <= 10 ? "font-semibold text-rose-200" : "font-semibold text-amber-100"}>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedAnswer(option)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selectedAnswer === option
                              ? "border-amber-300 bg-amber-300/15 text-white"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={isSubmittingAnswer || !selectedAnswer}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300/50"
                    >
                      {isSubmittingAnswer ? "Envoi de la réponse..." : "Envoyer la réponse"}
                    </button>
                  </div>
                ) : null}
              </div>

              {feedbackMessage ? (
                <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {feedbackMessage}
                </p>
              ) : null}

              {matchFinished ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 text-center">
                  <p className="text-sm text-slate-300">La partie est terminée.</p>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200"
                  >
                    Retour au dashboard
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}