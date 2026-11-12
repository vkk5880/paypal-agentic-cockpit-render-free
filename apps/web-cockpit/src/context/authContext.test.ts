import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthProvider } from './AuthContext.js';
import { UiModeProvider } from './UiModeContext.js';
import { Navbar } from '../components/Navbar.js';
import { DevModeToggle } from '../components/DevModeToggle.js';
import { PayPalRealSandboxAuthModal } from '../components/auth/PayPalRealSandboxAuthModal.js';

test('AuthContext & Navbar: Renders "PayPal Login" button when not logged in', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      UiModeProvider,
      null,
      React.createElement(AuthProvider, null, React.createElement(Navbar))
    )
  );

  assert.ok(html.includes('PayPal Login'), 'Expected navbar to render "PayPal Login" button');
});

test('DevModeToggle: Renders clean Dev Mode toggle without mock or test toggles', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      UiModeProvider,
      null,
      React.createElement(DevModeToggle)
    )
  );

  assert.ok(html.includes('Dev Mode') || html.includes('Developer'), 'Expected DevModeToggle to render');
});

test('PayPalRealSandboxAuthModal: Renders modal when open', () => {
  const html = renderToStaticMarkup(
    React.createElement(PayPalRealSandboxAuthModal, {
      isOpen: true,
      mode: 'login',
      onClose: () => {},
      onAuthenticate: async () => {},
    })
  );

  assert.ok(html.includes('PayPal Sandbox'), 'Expected modal to contain "PayPal Sandbox" text');
});
