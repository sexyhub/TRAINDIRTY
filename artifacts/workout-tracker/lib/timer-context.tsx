"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type TimerContextType = {
  timeLeft: number;
  isActive: boolean;
  totalTime: number;
  startTimer: (seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 400]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const startTimer = useCallback((seconds: number) => {
    setTotalTime(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
  }, []);

  const pauseTimer = useCallback(() => setIsActive(false), []);
  const resumeTimer = useCallback(() => {
    if (timeLeft > 0) setIsActive(true);
  }, [timeLeft]);
  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
    setTotalTime(0);
  }, []);

  return (
    <TimerContext.Provider value={{
      timeLeft,
      isActive,
      totalTime,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useGlobalTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useGlobalTimer must be used within a TimerProvider');
  }
  return context;
}
