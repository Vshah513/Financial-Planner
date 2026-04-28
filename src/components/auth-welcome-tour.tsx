"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const STORAGE_KEY = "cash-clarity-auth-welcome-tour-done";

export function AuthWelcomeTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (localStorage.getItem(STORAGE_KEY)) return;
        const t = setTimeout(() => setRun(true), 1200);
        return () => clearTimeout(t);
    }, []);

    const onCallback = (data: CallBackProps) => {
        if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
            setRun(false);
            localStorage.setItem(STORAGE_KEY, "true");
        }
    };

    const steps: Step[] = [
        {
            target: "#auth-hero",
            content:
                "Welcome. Cash Clarity pairs your real ledger with Gemini-powered insights and a built-in assistant — no Vercel AI Gateway or card required for the free Google AI tier.",
            placement: "bottom",
            disableBeacon: true,
        },
        {
            target: "#auth-panel",
            content: "Create an account or sign in here. New users go through a quick workspace setup, then a guided tour of the app.",
            placement: "left",
        },
    ];

    if (!run) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={onCallback}
            styles={{
                options: {
                    primaryColor: "#2563eb",
                    zIndex: 10000,
                    backgroundColor: "#0a1428",
                    textColor: "#fff",
                    arrowColor: "#0a1428",
                    overlayColor: "rgba(0, 0, 0, 0.65)",
                },
                buttonNext: { backgroundColor: "#2563eb", borderRadius: 8 },
                buttonBack: { color: "#9ca3af" },
                buttonSkip: { color: "#9ca3af" },
            }}
        />
    );
}
