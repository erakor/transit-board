import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BikeCardView, DepartureRow, TransitCardView } from '@/components/transit-card';
import { BIKE_CARD, BUS_CARD, NOW, PATH_CARD, ROWS, STATIONS, SUBWAY_CARD, SUBWAY_COMPLEX_CARD } from '@/stories/fixtures';

/** The left column is about 49 rem wide at 1080p, the right one about 28 rem. */
const wide = (Story: () => React.ReactNode) => <div className="flex w-[49rem] flex-col">{Story()}</div>;
const narrow = (Story: () => React.ReactNode) => <div className="flex w-[28rem] flex-col">{Story()}</div>;

const meta = {
  title: 'Board/Transit card',
  component: TransitCardView,
  args: { card: SUBWAY_CARD, now: NOW, stale: false },
  argTypes: { now: { control: 'number' } },
  decorators: [wide],
} satisfies Meta<typeof TransitCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One row per direction: following trains on the left, the big leave-in number on the right. */
export const Subway: Story = {};

/** A station complex. The southbound G at 2 min can't be reached on a 7 min walk, so it is skipped. */
export const SubwayComplex: Story = { args: { card: SUBWAY_COMPLEX_CARD } };

/** Buses show the stop name and sign code, stops away, an alert mark and a cancelled trip. */
export const Bus: Story = { args: { card: BUS_CARD }, decorators: [narrow] };

/** PATH rows are compact: no status line, and the leave-by time sits next to the number. */
export const Path: Story = { args: { card: PATH_CARD } };

/** The data is more than 3 minutes old: the rows grey out. */
export const Stale: Story = { args: { stale: true } };

export const NoDepartures: Story = { args: { card: { ...SUBWAY_CARD, rows: [] } } };

/** One panel failing doesn't take the rest of the board down. */
export const LoadError: Story = { args: { card: { ...SUBWAY_CARD, status: 'error', rows: [] } } };

/** Scrub `now` to watch the countdowns change and trains drop off as they become too late. */
export const TwoMinutesLater: Story = { args: { now: NOW + 120 } };

// Rows -----------------------------------------------------------------------------------------

type RowStory = StoryObj<typeof DepartureRow>;
const row = (args: Partial<React.ComponentProps<typeof DepartureRow>>): RowStory => ({
  render: (a) => (
    <ul className="m-0 list-none rounded-2xl border border-border bg-card px-4 py-0">
      <DepartureRow {...a} />
    </ul>
  ),
  args: { row: ROWS.onTime, walkSec: 4 * 60, now: NOW, compact: false, ...args },
});

export const RowOnTime = row({});
/** Leave now: the number becomes "Go". */
export const RowGo = row({ row: ROWS.go, walkSec: 7 * 60 });
export const RowStalled = row({ row: ROWS.stalled });
export const RowDelayed = row({ row: ROWS.delayed });
/** Trains not yet assigned to a trip are shown fainter. */
export const RowNotAssigned = row({ row: ROWS.notAssigned });
/** The only train left can't be reached in time. */
export const RowTooLate = row({ row: ROWS.tooLate });
export const RowNoTrains = row({ row: ROWS.empty });
/** A bus route with an active alert gets a warning mark. */
export const RowBusWithAlert = row({ row: ROWS.warn, walkSec: 3 * 60 });
export const RowBusAtStop = row({ row: ROWS.atStop, walkSec: 60 });
export const RowBusCancelled = row({ row: ROWS.cancelled, walkSec: 3 * 60 });
export const RowBusAtTerminal = row({ row: ROWS.atTerminal, walkSec: 3 * 60 });
export const RowCompact = row({ row: ROWS.path, walkSec: 16 * 60, compact: true });

// Citi Bike ------------------------------------------------------------------------------------

type BikeStory = StoryObj<typeof BikeCardView>;
const bike = (args: Partial<React.ComponentProps<typeof BikeCardView>>): BikeStory => ({
  render: (a) => <BikeCardView {...a} />,
  args: { card: BIKE_CARD, stale: false, ...args },
  decorators: [narrow],
});

/** Classic bikes, e-bikes and free docks, with a bar for how full the station is. */
export const CitiBike = bike({});
/** A station not renting or not returning says so, and the numbers it affects are struck through. */
export const CitiBikeClosedStations = bike({ card: { ...BIKE_CARD, stations: [STATIONS.noRentals, STATIONS.noReturns] } });
export const CitiBikeFullAndEmpty = bike({ card: { ...BIKE_CARD, stations: [STATIONS.full, STATIONS.empty] } });
export const CitiBikeStale = bike({ stale: true });
export const CitiBikeLoadError = bike({ card: { ...BIKE_CARD, status: 'error', stations: [] } });
