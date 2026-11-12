'use client';

import React, { useEffect, useState } from 'react';

const DEFAULT_CHARS = '0123456789ABCDEF!@#$%^&*()_+-=[]{}|;:,.<>?';

export interface DecryptTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  characters?: string;
  onComplete?: () => void;
}

export function DecryptText({
  text,
  speed = 30,
  delay = 0,
  className = '',
  characters = DEFAULT_CHARS,
  onComplete,
}: DecryptTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    setIsResolved(false);
    let iteration = 0;
    let intervalId: NodeJS.Timeout;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setDisplayText(
          text
            .split('')
            .map((char, index) => {
              // Preserve spaces and tabs verbatim
              if (char === ' ' || char === '\n' || char === '\t') return char;
              if (index < iteration) {
                return text[index];
              }
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join('')
        );

        if (iteration >= text.length) {
          setIsResolved(true);
          clearInterval(intervalId);
          onComplete?.();
        }

        iteration += 1 / 3;
      }, speed);
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [text, speed, delay, characters, onComplete]);

  return (
    <span
      role="text"
      aria-label={text}
      className={`font-mono inline-block transition-opacity duration-200 ${
        isResolved ? 'opacity-100 text-inherit' : 'opacity-90'
      } ${className}`}
    >
      <span aria-hidden="true">
        {displayText || text.replace(/[^\s]/g, '0')}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
