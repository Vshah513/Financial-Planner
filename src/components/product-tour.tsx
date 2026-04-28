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
            target: "#tour-month-link",
            content:
                "Start by adding your monthly data. Use Months to enter income/expenses manually, or use Export / Import (next to Settings) to upload a CSV.",
            placement: "bottom",
            disableBeacon: true,
        },
        {
            target: "#tour-tools-link",
            content:
                "Once your data is in, click Tools to run simulations and reports based on your real numbers.",
            placement: "bottom",
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
