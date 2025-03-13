'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme context type
type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with a default value that will be updated after mount
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  // Track if component is mounted to avoid hydration issues
  const [isMounted, setIsMounted] = useState(false);
  
  // After mount, update from localStorage and system preference
  useEffect(() => {
    setIsMounted(true);
    
    const storedTheme = localStorage.getItem('theme');
    
    // Only use stored theme if available, otherwise default to light mode
    setIsDarkMode(storedTheme === 'dark');
  }, []);
  
  // Update document class and localStorage when theme changes
  useEffect(() => {
    if (!isMounted) return;
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    // Store preference in localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isMounted]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
} 