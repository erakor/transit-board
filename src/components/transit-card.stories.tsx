import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BikeCardView, TransitCardView } from '@/components/transit-card';
import type { Row, TransitCard } from '@/lib/types';
import { BIKE_CARD, BUS_CARD, PATH_CARD, SUBWAY_CARD, SUBWAY_COMPLEX_CARD } from '@/stories/demo-board';
import { NOW, ROWS, STATIONS } from '@/stories/fixtures';

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
// Each row state is drawn through a one-row card, so walk time and compact layout come from the card.

const oneRow = (row: Row, base: TransitCard = SUBWAY_CARD, walkMin = base.walkMin): Story => ({
  args: { card: { ...base, walkMin, rows: [row] } },
  // buses sit in the narrow right-hand column
  decorators: base.kind === 'bus' ? [narrow] : [],
});

export const RowOnTime = oneRow(ROWS.onTime, SUBWAY_CARD, 4);
/** Leave now: the number becomes "Go". */
export const RowGo = oneRow(ROWS.go, SUBWAY_CARD, 7);
export const RowStalled = oneRow(ROWS.stalled, SUBWAY_CARD, 4);
export const RowDelayed = oneRow(ROWS.delayed, SUBWAY_CARD, 4);
/** Trains not yet assigned to a trip are shown fainter. */
export const RowNotAssigned = oneRow(ROWS.notAssigned, SUBWAY_CARD, 4);
/** The only train left can't be reached in time. */
export const RowTooLate = oneRow(ROWS.tooLate, SUBWAY_CARD, 4);
export const RowNoTrains = oneRow(ROWS.empty, SUBWAY_CARD, 4);
/** A bus route with an active alert gets a warning mark. */
export const RowBusWithAlert = oneRow(ROWS.busWithAlert, BUS_CARD);
export const RowBusAtStop = oneRow(ROWS.busAtStop, BUS_CARD, 1);
export const RowBusCancelled = oneRow(ROWS.busCancelled, BUS_CARD);
export const RowBusAtTerminal = oneRow(ROWS.busAtTerminal, BUS_CARD);
/** PATH rows are compact. */
export const RowCompact = oneRow(ROWS.path, PATH_CARD);

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
