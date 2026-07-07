/**
 * Custom HTML wrapper for the static web build (Expo Router web).
 * Sets the default RTL direction + Arabic language and a mobile-friendly
 * viewport so the web app matches the native experience.
 */
import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>إنجازاتي</title>

        {/* PWA: installable "add to home screen" on Android/desktop + iOS. */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F4B000" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="إنجازاتي" />

        {/* Reset default scroll behavior so RN ScrollViews behave on web. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Keep the page background white to match the app theme.
const responsiveBackground = `
  body { background-color: #FFFFFF; }
`;

// Registers the PWA service worker (see public/sw.js) after the page loads.
const registerServiceWorker = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
`;
