import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import '../src/app/globals.css';
import './storybook.css';

/** The board picks its theme from the sun; here a toolbar switch sets the same `data-theme` attribute. */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'light' ? 'light' : 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Board theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Dark (night)' },
          { value: 'light', title: 'Light (day)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
