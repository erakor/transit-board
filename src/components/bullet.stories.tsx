import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RouteBullet, RouteChip } from '@/components/bullet';
import { BULLETS } from '@/stories/fixtures';

const meta = {
  title: 'Board/Route bullet',
  component: RouteBullet,
  args: { route: BULLETS.L, size: 'md' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] } },
} satisfies Meta<typeof RouteBullet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subway: Story = {};

/** Dark text on a light route color: the text color comes from the API. */
export const LightRoute: Story = { args: { route: BULLETS.N } };

/** The small size used inline in alert text. */
export const Small: Story = { args: { size: 'sm' } };

/** Names longer than two characters still fit, but the cards switch to a chip for them. */
export const ThreeLetters: Story = { args: { route: BULLETS.SIR } };

/** The rectangular chip for buses and PATH, whose names are too long for a bullet. */
export const Chip: StoryObj<typeof RouteChip> = {
  render: (args) => <RouteChip {...args} />,
  args: { route: BULLETS.B62 },
};

export const AllRoutes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {[BULLETS.L, BULLETS.G, BULLETS.A, BULLETS.N].map((r) => (
          <RouteBullet key={r.name} route={r} />
        ))}
        {[BULLETS.L, BULLETS.G, BULLETS.A, BULLETS.N].map((r) => (
          <RouteBullet key={`sm-${r.name}`} route={r} size="sm" />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {[BULLETS.B62, BULLETS.B32, BULLETS.NWK, BULLETS.HOB].map((r) => (
          <RouteChip key={r.name} route={r} />
        ))}
      </div>
    </div>
  ),
};
