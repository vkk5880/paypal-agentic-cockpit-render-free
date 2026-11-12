'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Store,
  ShieldAlert,
  Zap,
  Menu,
  X,
  LogIn,
  CreditCard,
  LogOut,
  User,
  CheckCircle2,
} from 'lucide-react';
import NavbarLogo from './NavbarLogo';
import { ThemeToggle } from './ThemeToggle';
import { DevModeToggle } from './DevModeToggle';
import { useUiMode } from '@/context/UiModeContext';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { showTechnicalDetails } = useUiMode();
  const {
    user,
    isLoggedIn,
    isAuthorized,
    loginWithPayPal,
    authorizePayment,
    logout,
  } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    {
      href: '/',
      label: 'Cockpit Home',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/cockpit',
      label: 'Telemetry & Studio',
      icon: Cpu,
      active: pathname === '/cockpit',
    },
    {
      href: '/merchant',
      label: 'Merchant Console',
      icon: Store,
      active: pathname?.startsWith('/merchant'),
    },
    {
      href: '/judge',
      label: 'Dispute Arbiter',
      icon: ShieldAlert,
      active: pathname === '/judge',
    },
    {
      href: '/simulator',
      label: 'Chaos Simulator',
      icon: Zap,
      active: pathname === '/simulator',
    },
  ];

  return (
    <header
      className={`sticky top-0 z-50 shrink-0 transition-all duration-300 relative ${
        scrolled
          ? 'border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#070d1a]/90 backdrop-blur-2xl shadow-xl shadow-black/5 dark:shadow-black/20'
          : 'border-b border-slate-200/40 dark:border-white/5 bg-white/75 dark:bg-[#080e1c]/75 backdrop-blur-xl'
      }`}
    >
      {/* Radiant accent line */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <NavbarLogo />
          <div>
            <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1 group-hover:opacity-95 transition-opacity leading-tight">
              AEGIS<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">PAY</span>
            </span>
            <span className="text-[9px] font-mono tracking-wider uppercase block text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
              Autonomous Agentic Cockpit
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 bg-slate-100/80 dark:bg-[#060b14]/80 px-2 py-1 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-inner">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.active;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-[#0e172a] text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 font-medium'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}
                />
                <span className="text-xs">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PayPal Auth Status / Button */}
          {isLoggedIn && user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{user.name}</span>
                {isAuthorized && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Vault Authorized" />
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => loginWithPayPal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>PayPal Login</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Dev Mode & Theme Toggles */}
          <div className="flex items-center gap-1.5">
            <DevModeToggle />
            <ThemeToggle />
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#070d1a]/95 backdrop-blur-2xl px-4 py-4 space-y-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  link.active
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-500" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
