import type { Decorator, Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const SCREENS = { '1080p': '1080px', '4k': '2160px' } as const

/**
 * The board picks its theme from the sun and sizes itself to the screen height. Here two toolbar
 * switches set the same `data-theme` attribute and the screen height its rem is based on.
 */
const withBoardGlobals: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'light' ? 'light' : 'dark'
  const screen = SCREENS[context.globals.screen as keyof typeof SCREENS] ?? SCREENS['1080p']
  // set before the story renders, so its first frame already has the right theme and size
  document.documentElement.dataset.theme = theme
  document.documentElement.style.setProperty('--screen-h', screen)
  return <Story />
}

const preview: Preview = {
  decorators: [withBoardGlobals],
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
    screen: {
      description: 'Wall screen the rem size follows',
      toolbar: {
        title: 'Screen',
        icon: 'tablet',
        items: [
          { value: '1080p', title: '1080p' },
          { value: '4k', title: '4K' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark', screen: '1080p' },
  parameters: { layout: 'padded' },
}

export default preview
