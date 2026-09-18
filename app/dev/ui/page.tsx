import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import Eyebrow from "@/components/ui/Eyebrow";
import Icon from "@/components/ui/Icon";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";

/**
 * Development-only gallery of the shared UI primitives.
 *
 * The sibling of `/dev/blocks`, for `components/ui/` rather than the block
 * system. Every variant of every primitive on one page, so a change to a token
 * or a shared component can be eyeballed against all of its uses at once
 * instead of hunting for a page that happens to exercise it.
 *
 * Form fields are not here — they are client components with their own state,
 * and `app/contact` already renders every one of them.
 */
export const dynamic = "force-static";

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "accentOutline",
] as const;

const BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const BADGE_TONES = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <Section padding="sm" tone="muted">
        <Eyebrow>Development only</Eyebrow>
        <h1 className="mt-2 text-3xl font-black text-destiny-grey">
          UI primitives
        </h1>
        <p className="mt-2 text-muted">
          Everything in <code>components/ui/</code>. Not linked from anywhere and
          404s in production.
        </p>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Typography"
          title="Section heading with a lead"
          lead="The lead paragraph uses text-muted, which is the accessible replacement for the old text-destiny-grey/60 idiom."
          action={{ label: "An action link", href: "#" }}
        />
      </Section>

      <Section tone="muted">
        <SectionHeading title="Centred, no eyebrow" align="center" />
      </Section>

      <Section tone="dark">
        <SectionHeading
          eyebrow="On dark"
          title="Light tone heading"
          lead="Lead copy on a dark band uses text-on-dark-muted at 7.8:1."
          tone="light"
        />
      </Section>

      <Section>
        <SectionHeading title="Buttons" level={2} />

        <div className="mt-8 space-y-6">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="w-32 shrink-0 text-xs font-bold uppercase tracking-wider text-subtle">
                {variant}
              </span>
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size}
                </Button>
              ))}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-32 shrink-0 text-xs font-bold uppercase tracking-wider text-subtle">
              states
            </span>
            <Button loading>Submitting</Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" aria-label="Previous">
              <Icon name="chevron_left" label="Previous" />
            </Button>
            <Button href="/dev/ui">As a link</Button>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading title="Buttons on dark" tone="light" level={2} />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="onDark">On dark</Button>
          <Button variant="glass">Glass</Button>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Cards" level={2} />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Card className="bg-white p-6">
            <h3 className="font-bold text-destiny-grey">Static</h3>
            <p className="mt-2 text-sm text-muted">
              No hover, no link. The default.
            </p>
          </Card>
          <Card interactive className="bg-white p-6">
            <h3 className="font-bold text-destiny-grey">Interactive</h3>
            <p className="mt-2 text-sm text-muted">
              Lifts on hover, but the action lives inside it.
            </p>
          </Card>
          <Card href="/dev/ui" className="bg-white p-6">
            <h3 className="font-bold text-destiny-grey">Linked</h3>
            <p className="mt-2 text-sm text-muted">
              The whole card is the link. Tab to it to see the focus ring.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading title="Badges" level={2} />
        <div className="mt-8 flex flex-wrap gap-3">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading title="Disclosure" level={2} />
        <div className="mt-8 space-y-3">
          <Disclosure summary="What time are your services?" defaultOpen>
            Sundays at 11:00am. Doors open from 9:45am.
          </Disclosure>
          <Disclosure summary="Is there parking?">
            Yes, free parking on site.
          </Disclosure>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          title="Icons"
          lead="Decorative by default and hidden from assistive tech; the labelled one is role=img."
          level={2}
        />
        <div className="mt-8 flex flex-wrap items-center gap-6">
          {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
            <Icon key={size} name="favorite" size={size} />
          ))}
          <Icon name="favorite" size="2xl" filled className="text-destiny-red" />
          <Icon name="volunteer_activism" size="2xl" label="Giving" />
        </div>
      </Section>
    </>
  );
}
