import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AlertStrip, AlertText } from '@/components/alert-strip';
import { ALERTS } from '@/stories/demo-board';

const planned = ALERTS.find((a) => a.planned)!;

const meta = {
  title: 'Board/Alert strip',
  component: AlertStrip,
  args: { items: ALERTS, error: false },
  decorators: [(Story) => <div className="w-[78rem]">{Story()}</div>],
} satisfies Meta<typeof AlertStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Several alerts rotate every 10 s, with a counter on the right. */
export const Rotating: Story = {};

/** An unplanned alert gets an amber category pill; route names in brackets become bullets. */
export const SingleAlert: Story = { args: { items: [ALERTS[0]!] } };

/** Planned work gets a muted pill. */
export const PlannedWork: Story = { args: { items: [planned] } };

/** With no category, the pill falls back to "Alert" or "Planned". */
export const NoCategory: Story = { args: { items: [{ ...ALERTS[0]!, category: null }] } };

/** A route in brackets the alert doesn't list gets a grey bullet. */
export const UnknownRoute: Story = {
  args: { items: [{ id: 'x', planned: false, category: 'Delays', header: '[F] and [M] trains are delayed after a train with mechanical problems at 47-50 Sts.', routes: [] }] },
};

/** Long alerts clamp to two lines. */
export const LongAlert: Story = {
  args: {
    items: [
      {
        ...ALERTS[0]!,
        header:
          'Brooklyn-bound [L] trains are running with delays while we address a signal problem near Bedford Av. Some trains may be held at stations, and [G] trains are running less frequently while crews work. Expect longer waits and allow extra travel time.',
      },
    ],
  },
};

export const NoAlerts: Story = { args: { items: [] } };

export const AlertsUnavailable: Story = { args: { items: [], error: true } };

/** Just the alert text, with routes turned into bullets. */
export const Text: StoryObj<typeof AlertText> = {
  render: (args) => (
    <p className="m-0 text-[1.15rem] leading-tight">
      <AlertText {...args} />
    </p>
  ),
  args: { alert: ALERTS[0]! },
};
