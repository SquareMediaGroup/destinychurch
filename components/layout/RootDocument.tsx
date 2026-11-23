import { ICON_FONT_URL } from "@/lib/iconFont";
import {
  ADDRESS,
  CHURCH_NAME,
  EMAIL,
  GEO,
  PHONE,
  SCHEDULE,
} from "@/lib/churchInfo";
import { CHANNEL_URL } from "@/lib/youtube";

const MATERIAL_SYMBOLS_CSS = `@font-face{font-family:'Material Symbols Rounded';font-style:normal;font-weight:500;font-display:block;src:url(${ICON_FONT_URL}) format('woff2')}.material-symbols-rounded{font-family:'Material Symbols Rounded';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';-webkit-font-smoothing:antialiased}`;

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Church", "LocalBusiness"],
      "@id": "https://destinytees.uk/#church",
      name: CHURCH_NAME,
      url: "https://destinytees.uk",
      logo: "https://destinytees.uk/img/logo.webp",
      image: "https://destinytees.uk/og/sermons-hero.webp",
      description:
        "A multi-cultural church where all can find a place to belong and thrive. Bible-based teaching, vibrant worship, and genuine community.",
      address: {
        "@type": "PostalAddress",
        streetAddress: ADDRESS.street,
        addressLocality: ADDRESS.locality,
        addressRegion: ADDRESS.region,
        postalCode: ADDRESS.postcode,
        addressCountry: ADDRESS.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: GEO.latitude,
        longitude: GEO.longitude,
      },
      telephone: PHONE.e164,
      email: EMAIL,
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Sunday",
          opens: SCHEDULE.iso.doorsOpen,
          closes: SCHEDULE.iso.mainServiceEnd,
        },
      ],
      sameAs: [
        CHANNEL_URL,
        "https://www.facebook.com/destinychurchteesvalley",
        "https://www.instagram.com/destinychurchteesvalley",
      ],
    },
    {
      "@type": "Event",
      "@id": "https://destinytees.uk/#sunday-service",
      name: "Sunday Morning Service",
      description:
        "Join us every Sunday morning for worship, Bible teaching, and community at Destiny Church Tees Valley.",
      startDate: "2024-01-07T11:00:00+00:00",
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: "https://schema.org/Sunday",
        startTime: SCHEDULE.iso.mainServiceStart,
        endTime: SCHEDULE.iso.mainServiceEnd,
      },
      location: {
        "@type": "Place",
        name: ADDRESS.venue,
        address: {
          "@type": "PostalAddress",
          streetAddress: ADDRESS.street,
          addressLocality: ADDRESS.locality,
          postalCode: ADDRESS.postcode,
          addressCountry: ADDRESS.country,
        },
      },
      organizer: { "@id": "https://destinytees.uk/#church" },
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      isAccessibleForFree: true,
    },
  ],
};

export function RootHeadExtras() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MATERIAL_SYMBOLS_CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
              try {
                let glassFX = true;
                let reducedMotion = false;
                const stored = localStorage.getItem("destiny-a11y");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (typeof parsed.glassFX === "boolean") glassFX = parsed.glassFX;
                  if (typeof parsed.reducedMotion === "boolean") reducedMotion = parsed.reducedMotion;
                } else {
                  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    reducedMotion = true;
                  }
                }
                
                if (!glassFX) {
                  document.documentElement.dataset.glassfx = "off";
                }
                if (reducedMotion) {
                  document.documentElement.dataset.motion = "reduced";
                }
              } catch (e) {}
            `,
        }}
      />
    </>
  );
}

export function GlassRefractFilter() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <filter
        id="glass-refract"
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur in="SourceAlpha" stdDeviation={16} result="soft" />
        <feOffset in="soft" dx={8} dy={0} result="sxp" />
        <feOffset in="soft" dx={-8} dy={0} result="sxn" />
        <feComposite
          in="sxp"
          in2="sxn"
          operator="arithmetic"
          k1={0}
          k2={-2.5}
          k3={2.5}
          k4={0.5}
          result="gx"
        />
        <feOffset in="soft" dx={0} dy={8} result="syp" />
        <feOffset in="soft" dx={0} dy={-8} result="syn" />
        <feComposite
          in="syp"
          in2="syn"
          operator="arithmetic"
          k1={0}
          k2={-2.5}
          k3={2.5}
          k4={0.5}
          result="gy"
        />
        <feColorMatrix
          in="gx"
          type="matrix"
          values="0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"
          result="mx"
        />
        <feColorMatrix
          in="gy"
          type="matrix"
          values="0 0 0 0 0  0 0 0 1 0  0 0 0 0 0  0 0 0 0 1"
          result="my"
        />
        <feComposite
          in="mx"
          in2="my"
          operator="arithmetic"
          k1={0}
          k2={1}
          k3={1}
          k4={0}
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale={42}
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispR"
        />
        <feColorMatrix
          in="dispR"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="onlyR"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale={48}
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispG"
        />
        <feColorMatrix
          in="dispG"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="onlyG"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale={54}
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispB"
        />
        <feColorMatrix
          in="dispB"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="onlyB"
        />
        <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
        <feBlend in="rg" in2="onlyB" mode="screen" />
      </filter>
    </svg>
  );
}
