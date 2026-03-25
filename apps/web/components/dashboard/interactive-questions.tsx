"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Send, X } from "lucide-react";

interface Question {
  question: string;
  options: string[];
}

interface InteractiveQuestionsProps {
  questions: Question[];
  onComplete: (answers: { question: string; answer: string }[]) => void;
  onDismiss: () => void;
}

export function InteractiveQuestions({
  questions,
  onComplete,
  onDismiss,
}: InteractiveQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(
    () => new Array(questions.length).fill(null)
  );
  const [customInput, setCustomInput] = useState("");
  const [editingCustom, setEditingCustom] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  const current = questions[currentIndex];
  if (!current) return null;

  const selectedAnswer = answers[currentIndex];

  function selectOption(option: string) {
    const next = [...answers];
    next[currentIndex] = option;
    setAnswers(next);
    setEditingCustom(false);
    setCustomInput("");

    // Auto-advance to next question after short delay
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 200);
    }
  }

  function submitCustom() {
    if (!customInput.trim()) return;
    const next = [...answers];
    next[currentIndex] = customInput.trim();
    setAnswers(next);
    setEditingCustom(false);
    setCustomInput("");

    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 200);
    }
  }

  function skip() {
    const next = [...answers];
    next[currentIndex] = null; // skipped
    setAnswers(next);
    setEditingCustom(false);
    setCustomInput("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Last question skipped — auto-submit if there are any answers
      const hasAny = next.some((a) => a !== null);
      if (hasAny) {
        const compiled: { question: string; answer: string }[] = [];
        for (let i = 0; i < questions.length; i++) {
          if (next[i]) {
            compiled.push({ question: questions[i].question, answer: next[i] ?? "" });
          }
        }
        onComplete(compiled);
      }
    }
  }

  function handleComplete() {
    const compiled: { question: string; answer: string }[] = [];
    for (let i = 0; i < questions.length; i++) {
      if (answers[i]) {
        compiled.push({ question: questions[i].question, answer: answers[i] ?? "" });
      }
    }
    onComplete(compiled);
  }

  function startCustom() {
    setEditingCustom(true);
    setTimeout(() => customInputRef.current?.focus(), 50);
  }

  const isLast = currentIndex === questions.length - 1;
  const hasAnyAnswer = answers.some((a) => a !== null);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-medium flex-1 min-w-0">
          {current.question}
        </p>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} of {questions.length}
            </span>
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              disabled={currentIndex === questions.length - 1}
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={onDismiss}
            className="p-0.5 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="divide-y divide-border">
        {current.options.map((option, i) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={i}
              onClick={() => selectOption(option)}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-md text-xs font-medium shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">{option}</span>
              {isSelected && (
                <span className="text-primary shrink-0">→</span>
              )}
            </button>
          );
        })}

        {/* Something else / custom input */}
        {editingCustom ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={customInputRef}
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCustom();
                if (e.key === "Escape") {
                  setEditingCustom(false);
                  setCustomInput("");
                }
              }}
              placeholder="Type your answer..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={submitCustom}
              disabled={!customInput.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={startCustom}
            className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm transition ${
              selectedAnswer &&
              !current.options.includes(selectedAnswer)
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
          >
            <Pencil className="h-4 w-4 shrink-0" />
            <span>
              {selectedAnswer && !current.options.includes(selectedAnswer)
                ? selectedAnswer
                : "Something else"}
            </span>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {answers.filter((a) => a !== null).length} answered
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={skip}>
            Skip
          </Button>
          {(isLast || hasAnyAnswer) && (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!hasAnyAnswer}
              className="gap-1"
            >
              Submit
              <Send className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
