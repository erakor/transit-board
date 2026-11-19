import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BoardView } from '@/components/board-screen';
import { BOARD, BOARD_ALERTS_DOWN, BOARD_PATH_DOWN, SUBWAY_CARD, SUBWAY_COMPLEX_CARD } from '@/stories/demo-board';
import { NOW } from '@/stories/fixtures';

/** 45 rem is the screen height (see globals.css), so a 16:9 screen is 80 x 45 rem at any resolution. */
const meta = {
  title: 'Board/Board',
  component: BoardView,
  args: { board: BOARD, now: NOW },
  argTypes: { now: { control: 'number' } },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[45rem] w-[80rem] bg-background">{Story()}</div>],
} satisfies Meta<typeof BoardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole screen as the wall shows it: subway and PATH on the left, buses and Citi Bike on the right. */
export const Default: Story = {};

/** The last good board is over a minute old: the "updated" label turns amber. */
export const UpdateLate: Story = { args: { now: NOW + 90 } };

/** Over three minutes old: the label turns red and every card greys out. */
export const Stale: Story = { args: { now: NOW + 240 } };

/** One upstream failed: its card says so and the rest of the board stays normal. */
export const OnePanelFailed: Story = {
  args: { board: BOARD_PATH_DOWN },
};

export const AlertsUnavailable: Story = { args: { board: BOARD_ALERTS_DOWN } };

/** With only subway panels configured, the left column takes the full width. */
export const SubwayOnly: Story = { args: { board: { ...BOARD, cards: [SUBWAY_CARD, SUBWAY_COMPLEX_CARD], alerts: { status: 'ok', items: [] } } } };
