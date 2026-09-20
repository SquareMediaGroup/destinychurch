import Button from "@/components/ui/Button";
import MediaBanner from "@/components/ui/MediaBanner";

export default function ConnectGroupsBanner() {
  return (
    <MediaBanner
      image="/img/photos/ConnectGroups.webp"
      title="Join a Connect Group"
      body="Connect Groups are where godly friends become spiritual family. Where faith is stirred, assumptions are challenged, sisters are found, and brothers build each other up. Discover who you are, who God is, and how to follow Him."
      actions={
        <>
          <Button href="/connect">Find a Connect Group</Button>
          <Button href="/contact" variant="onDark">
            Contact Pastoral Team
          </Button>
        </>
      }
    />
  );
}
