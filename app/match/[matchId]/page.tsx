"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

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

  async function handleSubmitAnswer() {
    if (!apiToken || !question?.correct_answer) {
      setErrorMessage("Impossible de soumettre la réponse.");
      return;
    }

    if (!selectedAnswer) {
      setErrorMessage("Sélectionne une réponse avant d’envoyer.");
      return;
    }

    setIsSubmittingAnswer(true);
    setErrorMessage("");

    try {
      const isCorrect = selectedAnswer === question.correct_answer;

      // send answer to backend (keeps compatibility with existing API)
      await fetch(`${API_BASE_URL}/match/${matchId}/answer?isCorrect=${isCorrect}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch(() => null);

      if (isCorrect) setCorrectCount((c) => c + 1);

      // move to next question locally
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        // match finished locally: declare winner (simple implementation: declare this player winner)
        try {
          const resp = await fetch(`${API_BASE_URL}/match/${matchId}/winner`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiToken}` },
          });
          // ignore response body; backend increments point for authenticated user
        } catch (e) {
          // ignore
        }
        setMatchFinished(true);
        setFeedbackMessage(`Partie terminée. Score: ${correctCount + (isCorrect ? 1 : 0)}/${questions.length}`);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsSubmittingAnswer(false);
    }
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