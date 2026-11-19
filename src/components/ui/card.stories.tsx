import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const meta = {
  title: 'UI/Card',
  component: Card,
  decorators: [(Story) => <div className="w-[30rem]">{Story()}</div>],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/** The shadcn-style card every panel on the board is built from. */
export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <span className="text-[1rem] text-muted-foreground">right slot</span>
      </CardHeader>
      <CardContent>
        <p className="m-0 text-[1.15rem]">
          Card content. The header is a fixed 2.6 rem; the content fills the rest and clips.
        </p>
      </CardContent>
    </Card>
  ),
}

export const LongTitle: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Metropolitan Av / Lorimer St, a title long enough to truncate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="m-0 text-[1.15rem] text-muted-foreground">Titles truncate on one line.</p>
      </CardContent>
    </Card>
  ),
}
