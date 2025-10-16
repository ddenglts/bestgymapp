"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/toast";
import { CURRENT_WORKOUT_TOAST_KEY } from "./toast-constants";

export function CurrentWorkoutToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedMessage = window.sessionStorage.getItem(CURRENT_WORKOUT_TOAST_KEY);
    if (!storedMessage) {
      return;
    }

    window.sessionStorage.removeItem(CURRENT_WORKOUT_TOAST_KEY);
    setMessage(storedMessage);
  }, []);

  if (!message) {
    return null;
  }

  return <Toast message={message} onDismiss={() => setMessage(null)} />;
}
