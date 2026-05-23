import AnimateIn from "@/components/AnimateIn";

export const metadata = { title: "Accessibility Statement" };

const sections = [
  {
    title: "Our Commitment",
    content: `Destiny Church Tees Valley is committed to ensuring that our website is accessible to everyone, including people who rely on assistive technologies. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and treat accessibility as an ongoing responsibility rather than a one-off project. Where we fall short, we want to hear about it so we can put it right.`,
  },
  {
    title: "What We Have Built In",
    content: `We have designed and built this site with the following in mind:\n\n• Semantic HTML and clear page structure so that screen readers can announce headings, lists, landmarks and links accurately.\n• Descriptive alternative text on meaningful images, and decorative images marked so they are skipped by screen readers.\n• Sufficient colour contrast across body text, buttons and key interface elements, using our brand palette tested against WCAG ratios.\n• Full keyboard navigation, with visible focus indicators so keyboard and switch-device users can see where they are on the page.\n• Form fields with associated labels, clear error messages and helpful descriptions where needed.\n• Responsive layouts that work on phones, tablets and desktops, and that continue to function when text is enlarged or the browser is zoomed to 200%.\n• ARIA labels and roles on icon-only buttons, menus and other interactive components where the visual meaning is not enough on its own.\n• Captions on the majority of our sermon and video content through YouTube, which supports both manual and automatic captions.`,
  },
  {
    title: "Using Your Device And Browser",
    content: `Many of the features people ask for are best handled by the tools already built into your computer, phone or browser. These work consistently across every website you visit, including ours. We have written this section to help you find them.\n\n• Text-to-speech and reading assistance: macOS and iOS include VoiceOver and Spoken Content; Windows includes Narrator and Edge Read Aloud; Android includes TalkBack and Select to Speak. NVDA is a free, open-source screen reader for Windows.\n• Dyslexia-friendly fonts and reading overlays: browser extensions such as OpenDyslexic for Chrome or Helperbird allow you to apply dyslexia-friendly fonts, line spacing and background tints to any website.\n• Distraction-free reading: Safari Reader, Firefox Reader View and Microsoft Edge Immersive Reader strip away navigation, banners and sidebars so you can focus on the article or page you are reading.\n• High contrast, sepia or desaturated colours: Windows High Contrast Mode, macOS Increase Contrast and Color Filters, and iOS and Android colour filters can be applied system-wide.\n• Voice navigation: macOS Voice Control, Windows Voice Access and Dragon NaturallySpeaking allow you to browse, click and fill in forms using only your voice.\n• Keyboard customisation: your operating system and browser allow you to remap keys and create custom shortcuts that work everywhere, not just on our site.`,
  },
  {
    title: "Things We Are Still Working On",
    content: `There are areas where we know we can do better, and we are working on them:\n\n• British Sign Language interpretation for key pages and service information. In the meantime, if you need a BSL interpreter for a Sunday service, baptism, dedication or pastoral appointment, please contact us in advance and we will do our best to arrange one.\n• Live captions on our Sunday livestream beyond YouTube's automatic captions.\n• Continued review of older pages and PDFs to bring them in line with our current accessibility standards.`,
  },
  {
    title: "Why We Do Not Use Accessibility Overlay Widgets",
    content: `You may have seen sites use plug-in widgets such as accessiBe or UserWay that promise instant accessibility through a floating menu. After reviewing the guidance from disability advocates, screen reader users and the wider accessibility community, we have chosen not to use these tools. Independent testing has repeatedly shown that overlays can interfere with the assistive technologies people already rely on, and they do not fix the underlying code. We prefer to invest the same effort into building accessibility into the site itself.`,
  },
  {
    title: "Reporting An Accessibility Issue",
    content: `If you come across a page, image, form or document on this website that is difficult to use with your assistive technology, or that does not meet the standards above, please let us know. Tell us what you were trying to do, what went wrong, and which device, browser and assistive technology you were using if you can. We will reply within five working days and aim to fix confirmed issues as quickly as possible.\n\nDestiny Church Tees Valley\n395 Norton Road, Norton\nStockton-on-Tees TS20 2QQ\nenquiries@destinytees.uk\n+44 (0) 164 2 559 797`,
  },
  {
    title: "Enforcement And Further Help",
    content: `In the United Kingdom, the Equality and Human Rights Commission (EHRC) is responsible for enforcing accessibility regulations. If you are not happy with how we respond to your complaint, you can contact the EHRC or, for data-related concerns, the Information Commissioner's Office. We will always try to resolve issues with you directly first.`,
  },
];

export default function AccessibilityPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Legal</p>
          <h1 className="mb-2 text-4xl font-black text-destiny-grey md:text-5xl">Accessibility Statement</h1>
          <p className="mb-4 text-sm text-destiny-grey/40">Last modified: May 2026</p>
          <p className="mb-12 text-base leading-relaxed text-destiny-grey/70">
            We want every person who visits our website to be able to find the information they need, plan a
            visit, listen to a sermon, give, or get in touch — regardless of how they read, hear, see or
            navigate the web. This page explains what we have built into the site, what your device or browser
            can do to help, and how to tell us when we get something wrong.
          </p>
        </AnimateIn>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <AnimateIn key={section.title} delay={i * 40}>
              <div className="border-t border-black/6 pt-8">
                <h2 className="mb-3 text-xl font-black text-destiny-grey">{section.title}</h2>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, j) => (
                    <p key={j} className="text-sm leading-relaxed text-destiny-grey/70 whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </div>
  );
}
