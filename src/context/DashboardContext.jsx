import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const useDashboardSettings = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const getInitialSettings = () => {
    const saved = localStorage.getItem('dashboard_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const initial = getInitialSettings() || {
    isTvMode: false,
    autoRotation: true,
    rotationInterval: 15,
    soundEnabled: true,
    selectedTabs: ['performance', 'noc', 'acronis', 'monitor'],
    globalFilters: {
      hideHealthy: false,
      onlyOffline: false,
      groupByUF: true
    }
  };

  const [isTvMode, setIsTvMode] = useState(initial.isTvMode);
  const [autoRotation, setAutoRotation] = useState(initial.autoRotation);
  const [rotationInterval, setRotationInterval] = useState(initial.rotationInterval);
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled ?? true);
  const [selectedTabs, setSelectedTabs] = useState(initial.selectedTabs || ['performance', 'noc', 'acronis', 'monitor']);
  const [globalFilters, setGlobalFilters] = useState(initial.globalFilters);
  const [activeTab, setActiveTab] = useState('performance');
  const [progress, setProgress] = useState(0);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('dashboard_settings', JSON.stringify({
      isTvMode: false, // Don't persist active TV mode across hard reloads
      autoRotation,
      rotationInterval,
      soundEnabled,
      selectedTabs,
      globalFilters
    }));
  }, [autoRotation, rotationInterval, soundEnabled, selectedTabs, globalFilters]);

  // Handle Fullscreen
  useEffect(() => {
    if (isTvMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.error("Error attempting to enable fullscreen:", err));
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.error("Error attempting to exit fullscreen:", err));
      }
    }
  }, [isTvMode]);

  // Handle ESC key to exit TV mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isTvMode) {
        setIsTvMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  // Handle Auto Rotation
  useEffect(() => {
    if (!isTvMode || !autoRotation || selectedTabs.length === 0) {
      setProgress(0);
      return;
    }

    let currentProgress = 0;
    const intervalMs = 100; // Update progress every 100ms
    const totalMs = rotationInterval * 1000;

    const interval = setInterval(() => {
      currentProgress += intervalMs;
      setProgress((currentProgress / totalMs) * 100);

      if (currentProgress >= totalMs) {
        currentProgress = 0;
        setActiveTab(current => {
          // Verify if current tab is in selectedTabs, if not start from first
          const currentIndex = selectedTabs.indexOf(current);
          if (currentIndex === -1) return selectedTabs[0];
          
          const nextIndex = (currentIndex + 1) % selectedTabs.length;
          return selectedTabs[nextIndex];
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isTvMode, autoRotation, rotationInterval, activeTab, selectedTabs]);

  const playAlertSound = React.useCallback(() => {
    if (soundEnabled) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch(e) {
        console.log("Audio play failed or blocked by browser.");
      }
    }
  }, [soundEnabled]);

  return (
    <DashboardContext.Provider value={{
      isTvMode, setIsTvMode,
      autoRotation, setAutoRotation,
      rotationInterval, setRotationInterval,
      soundEnabled, setSoundEnabled,
      selectedTabs, setSelectedTabs,
      globalFilters, setGlobalFilters,
      activeTab, setActiveTab,
      progress, playAlertSound
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
