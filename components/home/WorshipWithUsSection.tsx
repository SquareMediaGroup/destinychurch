import Button from "@/components/ui/Button";
import MediaBanner from "@/components/ui/MediaBanner";

/**
 * The universal page-closer — reused on 24+ pages (the homepage, /new-here,
 * /connect, /sermons, /give, /whats-on, and every ministry/course page).
 * Built on MediaBanner now rather than carrying its own copy of the
 * blurred-photo-plus-scrim shell that seven other banners each pasted
 * independently.
 */
export default function WorshipWithUsSection() {
  return (
    <MediaBanner
      image="/img/photos/WorshipWUs.webp"
      title="Worship With Us"
      body="Church is a place to belong, not an event to attend. As a community, together, we can be more and do more as we press on to be all God wants us to be. Come and experience an awesome time of praise, worship, teaching and friendship."
      actions={
        <>
          <Button href="/visit">Plan your visit</Button>
          <Button href="/sermons" variant="onDark">
            Watch Church Online
          </Button>
        </>
      }
    />
  );
}
