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
        {/* Reset default scroll behavior so RN ScrollViews behave on web. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Keep the page background white to match the app theme.
const responsiveBackground = `
  body { background-color: #FFFFFF; }
`;
