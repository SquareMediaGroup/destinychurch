import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Disclosure from "@/components/ui/Disclosure";
import Eyebrow from "@/components/ui/Eyebrow";
import Icon from "@/components/ui/Icon";
import AppScreen from "@/components/destiny-one-page/AppScreen";
import FeatureRow from "@/components/destiny-one-page/FeatureRow";
import StoreButtons from "@/components/destiny-one-page/StoreButtons";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { FONT_ROBOTO } from "@/components/blocks/tokens";
import { webStoreLinks } from "@/lib/destinyOne/storeLinks";

export const metadata: Metadata = {
  title: "Destiny One, coming 2027",
  description:
    "Destiny One is the Destiny Church app: chats for every team and group, DestinyAI, and what's on, built with safeguarding at its heart. Coming to iPhone and Android in 2027.",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "Destiny One | Destiny Church Tees Valley",
    description: "Our church family, in your pocket. Coming to iPhone and Android in 2027.",
    url: "https://destinytees.uk/app",
    images: [{ url: "/og/app.webp", width: 1200, height: 630, alt: "Destiny One, the Destiny Church app" }],
  },
  twitter: { card: "summary_large_image", images: ["/og/app.webp"] },
};

// The rules the server enforces (README in apps/destiny-one). Worded to match
// what the app itself tells people, including that chats are not end-to-end
// encrypted: the app must say so plainly, and so does this page.
const SAFETY = [
  { icon: "verified_user", title: "Real names only", body: "Everyone is who they say they are, verified by the church office or ChurchSuite." },
  { icon: "family_restroom", title: "Two adults in every group", body: "Every group always has at least two verified adults, so no one is ever chatting alone." },
  { icon: "groups", title: "No one-to-one chats", body: "Conversations happen in groups of three or more, never in private pairs." },
  { icon: "phone_iphone", title: "No phone numbers", body: "Nobody's number is shown or shared, anywhere in the app." },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "When is Destiny One coming?",
    a: "In 2027, on iPhone and Android. Pre-order on the App Store and it downloads to your iPhone on launch day; pre-register on Google Play and you'll be told the moment it's out.",
  },
  {
    q: "Who can use it?",
    a: "Destiny One is for the Destiny Church family. Sign in with your email. If the church already knows you, through an invite or ChurchSuite, you're straight in; otherwise you can ask to join and the church office will confirm it.",
  },
  {
    q: "Can young people use it?",
    a: "Yes, within the same safeguarding rules as everyone else: every group has at least two verified adults and there are no one-to-one chats. Parents can add a child's account on their own phone.",
  },
  {
    q: "Are my chats private?",
    a: "Your chats are only seen by the people in the group. They aren't end-to-end encrypted, so our safeguarding team can step in if something doesn't look right. That's how we keep everyone safe.",
  },
  {
    q: "What is DestinyAI?",
    a: "A helper inside the app that answers questions about Destiny: what's on this week, service times, or last Sunday's message, which it can play right in the chat. It's in beta, so it can make mistakes.",
  },
];

export default function DestinyOnePage() {
  const { ios, android } = webStoreLinks();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-white pt-16 pb-0 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <AnimateIn>
            <Image
              src="/img/destiny-one/icon.webp"
              alt=""
              width={112}
              height={112}
              priority
              className="mx-auto mb-8 h-24 w-24 rounded-[22.37%] shadow-[0_12px_30px_-10px_rgba(16,24,40,.35)] sm:h-28 sm:w-28"
            />
            <Eyebrow className="mb-4">Coming 2027</Eyebrow>
            <h1
              className="text-5xl font-bold tracking-[-0.04em] text-destiny-grey sm:text-6xl lg:text-7xl"
              style={{ fontFamily: FONT_ROBOTO }}
            >
              Destiny One
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              Our church family, in your pocket. Chats for every team and group, DestinyAI, and what&apos;s on,
              in one app built for Destiny.
            </p>
            <StoreButtons ios={ios} android={android} className="mt-9" />
            <p className="mt-4 text-sm text-muted">For iPhone and Android.</p>
          </AnimateIn>

          {/* Three screens, the middle one forward */}
          <AnimateIn delay={150} className="relative mx-auto mt-14 flex max-w-4xl items-end justify-center gap-4 sm:gap-8">
            <AppScreen
              src="/img/destiny-one/chat.webp"
              alt="A Worship Team chat with a poll, a sermon shared from YouTube and replies"
              className="hidden w-[30%] translate-y-10 sm:block"
              sizes="(min-width: 1024px) 260px, 30vw"
            />
            <AppScreen
              src="/img/destiny-one/chats.webp"
              alt="The Chats list: DestinyAI, then Destiny Church, Destiny Youth and Connect Groups with their groups"
              priority
              className="w-[70%] sm:w-[36%]"
              sizes="(min-width: 1024px) 320px, 70vw"
            />
            <AppScreen
              src="/img/destiny-one/destinyai.webp"
              alt="DestinyAI answering what's on this week, then sharing last Sunday's sermon in the chat"
              className="hidden w-[30%] translate-y-10 sm:block"
              sizes="(min-width: 1024px) 260px, 30vw"
            />
          </AnimateIn>
        </div>
        <div className="h-16 bg-gradient-to-b from-white to-[#f5f7fa] sm:h-24" aria-hidden />
      </section>

      <Section tone="muted" padding="lg">
        <AnimateIn>
          <SectionHeading
            align="center"
            eyebrow="The film"
            title="Destiny One in a minute."
            lead="Chats, announcements, events, DestinyAI and the safeguarding rules behind it all."
          />
        </AnimateIn>
        <AnimateIn delay={120} className="mt-12">
          <VideoPlayer
            src="/img/destiny-one/film.mp4"
            poster="/img/destiny-one/film-poster.webp"
            label="Destiny One in a minute, a film about the app"
            className="mx-auto aspect-video w-full max-w-5xl rounded-3xl"
          />
          <p className="mt-4 text-center text-xs text-muted">
            Music: &ldquo;Inspired&rdquo; by Kevin MacLeod (
            <a href="https://incompetech.com" className="underline underline-offset-2 hover:text-destiny-grey">
              incompetech.com
            </a>
            ), licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="underline underline-offset-2 hover:text-destiny-grey">
              CC BY 4.0
            </a>
            .
          </p>
        </AnimateIn>
      </Section>

      <Section tone="light" padding="lg">
        <FeatureRow
          eyebrow="Communities"
          title="Every team. Every group. One place."
          lead="Announcements from the church, your ministry teams and your Connect Group, all in one tidy list."
          points={[
            { icon: "campaign", text: "Church announcements land in one place, so nothing gets lost in a group chat." },
            { icon: "groups", text: "Each ministry has its own community, with groups for every team inside it." },
            { icon: "notifications", text: "Reply to a message or mark it read straight from the notification." },
          ]}
        >
          <AppScreen src="/img/destiny-one/chats.webp" alt="The Chats list grouped by community, with unread counts" className="w-[68%] max-w-[320px]" />
        </FeatureRow>
      </Section>

      <Section tone="muted" padding="lg">
        <FeatureRow
          flip
          eyebrow="Chat"
          title="Polls, sermons and events, right in the chat."
          lead="Everything a team needs to organise a Sunday, without leaving the conversation."
          points={[
            { icon: "poll", text: "Vote on the setlist, the rota or where to eat after." },
            { icon: "play_circle", text: "Share Sunday's message and watch it in the chat." },
            { icon: "event", text: "Send the next church event to your team in two taps." },
            { icon: "image", text: "Photos, voice messages and files, with replies and reactions." },
          ]}
        >
          <AppScreen src="/img/destiny-one/chat.webp" alt="A chat with a poll on which key to sing in, a shared sermon and replies" className="w-[68%] max-w-[320px]" />
        </FeatureRow>
      </Section>

      <Section tone="light" padding="lg">
        <FeatureRow
          eyebrow="DestinyAI · Beta"
          title="Ask DestinyAI anything about Destiny."
          lead="What's on this week, when the service starts, or last Sunday's message, played right in the chat."
          points={[
            { icon: "auto_awesome", text: "Answers in plain words, starting from what the church has published." },
            { icon: "event", text: "Ask what's coming up and share it straight to a group." },
          ]}
        >
          <AppScreen src="/img/destiny-one/destinyai.webp" alt="DestinyAI listing this week's events and sharing a sermon" className="w-[68%] max-w-[320px]" />
        </FeatureRow>
      </Section>

      <Section tone="muted" padding="lg">
        <AnimateIn>
          <SectionHeading
            align="center"
            eyebrow="Make it yours"
            title="Light, dark or true dark."
            lead="Pick your theme, the colour of the messages you send and a wallpaper for your chats. Only you see your choices."
          />
        </AnimateIn>
        <AnimateIn delay={120} className="mx-auto mt-14 flex max-w-4xl items-start justify-center gap-4 sm:gap-8">
          <AppScreen src="/img/destiny-one/chats.webp" alt="Chats in the light theme" className="w-[31%] max-w-[280px]" sizes="(min-width: 1024px) 280px, 31vw" />
          <AppScreen src="/img/destiny-one/appearance-dark.webp" dark color="black" alt="Appearance settings in the dark theme: a chat preview, theme choices and message colours" className="w-[31%] max-w-[280px] sm:-translate-y-6" sizes="(min-width: 1024px) 280px, 31vw" />
          <AppScreen src="/img/destiny-one/chats-dark.webp" dark color="black" alt="Chats in the dark theme" className="w-[31%] max-w-[280px]" sizes="(min-width: 1024px) 280px, 31vw" />
        </AnimateIn>
      </Section>

      <Section tone="light" padding="lg">
        <FeatureRow
          flip
          eyebrow="Safe by design"
          title="Built for church, with safeguarding at its heart."
          lead="The rules aren't settings someone can switch off. The app is built around them."
        >
          <div className="flex w-full items-start justify-center gap-4 sm:gap-6">
            <AppScreen src="/img/destiny-one/chat-safety.webp" alt="How your chats are kept safe: at least two adults in every group, and the safeguarding team can step in" className="w-[46%] max-w-[280px]" sizes="(min-width: 1024px) 280px, 46vw" />
            <AppScreen src="/img/destiny-one/group-rules.webp" alt="A group's info: seven people, seven adults, meets the rules" className="w-[46%] max-w-[280px] translate-y-8" sizes="(min-width: 1024px) 280px, 46vw" />
          </div>
        </FeatureRow>
        <AnimateIn className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY.map((s) => (
            <div key={s.title} className="rounded-[20px] border border-black/[0.07] bg-white p-6">
              <Icon name={s.icon} size="xl" className="text-destiny-orange" />
              <h3 className="mt-4 text-lg font-bold text-destiny-grey" style={{ fontFamily: FONT_ROBOTO }}>
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </AnimateIn>
      </Section>

      <Section tone="muted" padding="lg" width="prose">
        <AnimateIn>
          <SectionHeading align="center" eyebrow="Questions" title="Good to know" />
        </AnimateIn>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <Disclosure key={f.q} summary={f.q}>
              <p className="leading-relaxed text-muted">{f.a}</p>
            </Disclosure>
          ))}
        </div>
      </Section>

      <Section tone="dark" padding="lg" containerClassName="text-center">
        <AnimateIn>
          <Image src="/img/destiny-one/icon.webp" alt="" width={80} height={80} className="mx-auto mb-6 h-20 w-20 rounded-[22.37%]" />
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl" style={{ fontFamily: FONT_ROBOTO }}>
            Be ready on day one.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">Destiny One arrives in 2027. Save your place now.</p>
          <StoreButtons ios={ios} android={android} tone="dark" className="mt-8" />
          <p className="mt-8 text-sm text-white/60">
            Curious how we built our new website?{" "}
            <Link href="/discover" className="font-semibold text-white underline underline-offset-4 hover:text-destiny-orange">
              See behind the build
            </Link>
          </p>
        </AnimateIn>
      </Section>
    </>
  );
}
