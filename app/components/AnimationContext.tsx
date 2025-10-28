// AnimationContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface AnimationContextType {
    animationRunning: boolean;
    setAnimationRunning: (v: boolean) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

interface AnimationProviderProps {
    children: ReactNode;
}

export default function AnimationProvider({ children }: AnimationProviderProps) {
    const [animationRunning, setAnimationRunning] = useState(false);
    return (
        <AnimationContext.Provider value={{ animationRunning, setAnimationRunning }}>
            {children}
        </AnimationContext.Provider>
    );
}

export const useAnimation = () => {
    const ctx = useContext(AnimationContext);
    if (!ctx) throw new Error("useAnimation must be used within AnimationProvider");
    return ctx;
};