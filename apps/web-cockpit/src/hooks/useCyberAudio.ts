'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { webLogger as logger } from '@/lib/logger';

export function useCyberAudio() {
  const audioCtxMain = useRef<AudioContext | null>(null);
  const droneOscillator = useRef<OscillatorNode | null>(null);
  const droneGain = useRef<GainNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    logger.debug('[CyberAudio:Mount] Mounting useCyberAudio hook');
    return () => {
      logger.debug('[CyberAudio:Teardown] Cleaning up AudioContext nodes and connections');
      if (droneOscillator.current) {
        try {
          droneOscillator.current.stop();
          droneOscillator.current.disconnect();
          logger.debug('[CyberAudio:Teardown] droneOscillator disconnected');
        } catch (err: any) {
          logger.warn('[CyberAudio:Teardown] Non-fatal error stopping droneOscillator', {
            error: err?.message || String(err),
          });
        }
        droneOscillator.current = null;
      }
      if (droneGain.current) {
        try {
          droneGain.current.disconnect();
          logger.debug('[CyberAudio:Teardown] droneGain disconnected');
        } catch (err: any) {
          logger.warn('[CyberAudio:Teardown] Non-fatal error disconnecting droneGain', {
            error: err?.message || String(err),
          });
        }
        droneGain.current = null;
      }
      if (audioCtxMain.current && audioCtxMain.current.state !== 'closed') {
        try {
          audioCtxMain.current.close().then(() => {
            logger.debug('[CyberAudio:Teardown] AudioContext closed successfully');
          }).catch((err) => {
            logger.warn('[CyberAudio:Teardown] AudioContext close promise rejected', {
              error: err?.message || String(err),
            });
          });
        } catch (err: any) {
          logger.warn('[CyberAudio:Teardown] Exception while closing AudioContext', {
            error: err?.message || String(err),
          });
        }
        audioCtxMain.current = null;
      }
    };
  }, []);

  const ensureResumed = useCallback(async (): Promise<boolean> => {
    if (!audioCtxMain.current) {
      logger.debug('[CyberAudio:Resume] No audio context available to resume');
      return false;
    }
    if (audioCtxMain.current.state === 'suspended') {
      try {
        logger.debug('[CyberAudio:Resume] AudioContext suspended, attempting resume()');
        await audioCtxMain.current.resume();
        logger.info('[CyberAudio:Resume] AudioContext resumed successfully');
      } catch (err: any) {
        // Autoplay policy restrictions may reject resume() until user interaction
        logger.warn('[CyberAudio:Resume] AudioContext resume deferred by browser autoplay policy', {
          error: err?.message || String(err),
        });
        return false;
      }
    }
    return audioCtxMain.current.state === 'running';
  }, []);

  const initAudio = useCallback(async () => {
    if (typeof window === 'undefined') {
      logger.debug('[CyberAudio:Init] SSR environment detected, bypassing AudioContext initialization');
      return;
    }

    logger.info('[CyberAudio:Init] Initializing Web Audio API context and cyber synth nodes');
    try {
      if (!audioCtxMain.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          audioCtxMain.current = new AudioCtx();
          logger.debug('[CyberAudio:Init] AudioContext instance created', { state: audioCtxMain.current.state });
        } else {
          logger.warn('[CyberAudio:Init] Web Audio API not supported by this browser');
        }
      }

      if (audioCtxMain.current) {
        // Safe resume handling guarding against browser autoplay policies
        if (audioCtxMain.current.state === 'suspended') {
          audioCtxMain.current.resume().catch((err) => {
            logger.warn('[CyberAudio:Init] AudioContext resume deferred by autoplay policy', {
              error: err?.message || String(err),
            });
          });
        }

        if (!droneOscillator.current && audioCtxMain.current.state !== 'closed') {
          try {
            droneOscillator.current = audioCtxMain.current.createOscillator();
            droneGain.current = audioCtxMain.current.createGain();

            droneOscillator.current.type = 'sawtooth';
            droneOscillator.current.frequency.setValueAtTime(
              55,
              audioCtxMain.current.currentTime
            ); // Low A

            droneGain.current.gain.setValueAtTime(0, audioCtxMain.current.currentTime);
            droneGain.current.gain.linearRampToValueAtTime(
              0.04,
              audioCtxMain.current.currentTime + 2
            );

            const filter = audioCtxMain.current.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 200;

            droneOscillator.current.connect(filter);
            filter.connect(droneGain.current);
            droneGain.current.connect(audioCtxMain.current.destination);

            droneOscillator.current.start();
            logger.debug('[CyberAudio:Init] Ambient cyber drone oscillator started at 55Hz');
          } catch (err: any) {
            logger.warn('[CyberAudio:Init] AudioContext node setup deferred', {
              error: err?.message || String(err),
              stack: err?.stack,
            });
          }
        }
      }

      setIsInitialized(true);
      logger.info('[CyberAudio:Init] Audio system initialized successfully');
    } catch (err: any) {
      logger.error('[CyberAudio:Init] AudioContext initialization failed or was blocked', {
        error: err?.message || String(err),
        stack: err?.stack,
      });
    }
  }, []);

  const playClick = useCallback(() => {
    if (!audioCtxMain.current || audioCtxMain.current.state === 'closed') {
      logger.debug('[CyberAudio:PlayClick] AudioContext unavailable or closed, skipped');
      return;
    }
    ensureResumed();
    try {
      const osc = audioCtxMain.current.createOscillator();
      const gain = audioCtxMain.current.createGain();
      const freq = 800 + Math.random() * 400;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, audioCtxMain.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtxMain.current.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, audioCtxMain.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.current.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtxMain.current.destination);
      osc.start();
      osc.stop(audioCtxMain.current.currentTime + 0.05);
      logger.debug('[CyberAudio:PlayClick] Synthesized click sound', { freq });
    } catch (err: any) {
      logger.warn('[CyberAudio:PlayClick] Non-fatal error during playClick synthesis', {
        error: err?.message || String(err),
      });
    }
  }, [ensureResumed]);

  const playBeam = useCallback(() => {
    if (!audioCtxMain.current || audioCtxMain.current.state === 'closed') {
      logger.debug('[CyberAudio:PlayBeam] AudioContext unavailable or closed, skipped');
      return;
    }
    ensureResumed();
    try {
      const osc = audioCtxMain.current.createOscillator();
      const gain = audioCtxMain.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, audioCtxMain.current.currentTime);
      osc.frequency.linearRampToValueAtTime(60, audioCtxMain.current.currentTime + 1.2);

      gain.gain.setValueAtTime(0.25, audioCtxMain.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.current.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtxMain.current.destination);
      osc.start();
      osc.stop(audioCtxMain.current.currentTime + 1.2);
      logger.debug('[CyberAudio:PlayBeam] Synthesized beam sound effect');
    } catch (err: any) {
      logger.warn('[CyberAudio:PlayBeam] Non-fatal error during playBeam synthesis', {
        error: err?.message || String(err),
      });
    }
  }, [ensureResumed]);

  const playSuccess = useCallback(() => {
    if (!audioCtxMain.current || audioCtxMain.current.state === 'closed') {
      logger.debug('[CyberAudio:PlaySuccess] AudioContext unavailable or closed, skipped');
      return;
    }
    ensureResumed();
    try {
      const osc = audioCtxMain.current.createOscillator();
      const gain = audioCtxMain.current.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtxMain.current.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtxMain.current.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(880, audioCtxMain.current.currentTime + 0.16); // A5

      gain.gain.setValueAtTime(0.12, audioCtxMain.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.current.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtxMain.current.destination);
      osc.start();
      osc.stop(audioCtxMain.current.currentTime + 0.5);
      logger.info('[CyberAudio:PlaySuccess] Synthesized success tri-tone sound');
    } catch (err: any) {
      logger.warn('[CyberAudio:PlaySuccess] Non-fatal error during playSuccess synthesis', {
        error: err?.message || String(err),
      });
    }
  }, [ensureResumed]);

  const setScrollVelocity = useCallback((velocity: number) => {
    if (!droneOscillator.current || !audioCtxMain.current || audioCtxMain.current.state === 'closed') return;
    try {
      const clamped = Math.min(Math.abs(velocity), 100);
      const targetFreq = 55 + clamped * 1.5;
      droneOscillator.current.frequency.setTargetAtTime(
        targetFreq,
        audioCtxMain.current.currentTime,
        0.1
      );
      logger.debug('[CyberAudio:ScrollVelocity] Modulated drone frequency', { velocity, targetFreq });
    } catch (err: any) {
      logger.warn('[CyberAudio:ScrollVelocity] Non-fatal error updating scroll velocity frequency', {
        error: err?.message || String(err),
      });
    }
  }, []);

  return { initAudio, isInitialized, playClick, playBeam, playSuccess, setScrollVelocity };
}
