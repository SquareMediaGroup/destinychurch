import PageHero from "@/components/ui/PageHero";

/**
 * The blurred CSS `background-image` this used to be — a real photo
 * (WorshipMoment2.webp) painted as a background div rather than through
 * next/image — is exactly what PageHero exists to replace: the photo now
 * goes through next/image with `priority`, so it's actually optimised and
 * prioritised as this page's LCP element, and it reads sharp instead of
 * blurred mush.
 */
export default function WhatsOnHero() {
  return (
    <PageHero
      image="/img/photos/WorshipMoment2.webp"
      imageAlt=""
      title="What's On"
      subtitle="Learn more about the Events and Courses at DC"
      size="sm"
    />
  );
}
