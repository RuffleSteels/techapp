// AnimationContext.tsx
import React, { createContext, useContext, useState } from "react";

interface AnimationContextType {
    animationRunning: boolean;
    setAnimationRunning: (v: boolean) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export default function AnimationProvider({ children }) {
    const [animationRunning, setAnimationRunning] = useState(false);
    return (
        <AnimationContext.Provider value={{ animationRunning, setAnimationRunning }}>
            {children}
        </AnimationContext.Provider>
    );
};

export const useAnimation = () => {
    const ctx = useContext(AnimationContext);
    if (!ctx) throw new Error("useAnimation must be used within AnimationProvider");
    return ctx;
};