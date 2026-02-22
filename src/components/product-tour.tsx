"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

export function ProductTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Only run on the client side
        const hasCompletedTour = localStorage.getItem("cash-clarity-tour-completed");
        if (!hasCompletedTour) {
            // Need a slight delay to ensure the DOM is fully painted
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem("cash-clarity-tour-completed", "true");
        }
    };

    const steps: Step[] = [
        {
            target: "#tour-export-link",
            content: "Welcome to Cash Clarity! To get started, you can upload CSV or Excel sheets of your monthly transactions from your bank—saving you hours of manual data entry.",
            placement: "right",
            disableBeacon: true,
        },
        {
            target: "#tour-month-link",
            content: "Prefer to upload data manually? Click into any month to start adding your income and expenses, or simply view detailed category breakdowns.",
            placement: "right",
        },
        {
            target: "#tour-tools-link",
            content: "Head over to our powerful Tools to run simulations! You can forecast specific financial events, calculate your runway, and ensure your pricing margins are profitable.",
            placement: "right",
        },
        {
            target: "#tour-settings-link",
            content: "Finally, check out Settings. Here you can seamlessly toggle between Business and Personal modes to keep your finances organized.",
            placement: "right",
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
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: "#2563eb",
                    zIndex: 10000,
                    backgroundColor: "#0a1428",
                    textColor: "#fff",
                    arrowColor: "#0a1428",
                    overlayColor: "rgba(0, 0, 0, 0.6)",
                },
                buttonNext: {
                    backgroundColor: "#2563eb",
                    borderRadius: 8,
                },
                buttonBack: {
                    color: "#9ca3af",
                },
                buttonSkip: {
                    color: "#9ca3af",
                },
            }}
        />
    );
}
