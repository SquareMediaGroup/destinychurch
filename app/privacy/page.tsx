import AnimateIn from "@/components/AnimateIn";

export const metadata = { title: "Privacy Policy" };

const sections = [
  {
    title: "Introduction",
    content: `This policy describes how and why Destiny Church Tees Valley ('we', 'us', or 'our') may access, collect, store, use or process your personal information when you use our services, including when you visit our website, use our church management application (ChurchSuite), or engage with us in other related ways including attending church services or events. You agree to the terms of this Privacy Policy when you use our services. We may update this policy from time to time, and we encourage you to review it periodically.`,
  },
  {
    title: "Data Protection Principles",
    content: `Destiny Church fully adheres to the seven principles of the GDPR. These principles specify the legal conditions that must be satisfied in relation to obtaining, handling, processing, transportation and storage of personal data:\n\n• Lawfulness, Fairness & Transparency: personal data shall be processed in a lawful, fair and transparent way.\n• Purpose Limitation: personal data shall be collected for specified, explicit and legitimate purposes.\n• Data Minimisation: personal data shall be adequate, relevant and limited to what is necessary.\n• Accuracy: personal data shall be accurate and, where necessary, kept up to date.\n• Storage Limitation: personal data shall be kept for no longer than is necessary.\n• Integrity & Confidentiality: personal data shall be processed in a manner that ensures appropriate security.\n• Accountability: we are responsible for complying with GDPR and able to demonstrate our compliance.`,
  },
  {
    title: "How We Collect Information About You",
    content: `We collect personal information that you voluntarily provide to us when you visit our website, register your details at ChurchSuite or via an embedded form, make a donation, register for a church event, provide your contact details to church staff or volunteers, purchase goods or services, attend church services or participate in other church activities, communicate with the church by email, letter or telephone, or access our social media platforms.`,
  },
  {
    title: "Information We Collect",
    content: `We may collect personal identification information (name, email address, postal address, phone number, date of birth, gender), donation information (payment details processed securely by third-party processors, donation history, Gift Aid declarations), ministry and event registration information, communication preferences, and technical usage information (IP address, browser type, pages visited). We may also collect sensitive information such as health information or religious information when you attend or register for church events.`,
  },
  {
    title: "How We Use Your Information",
    content: `We process your information for the day-to-day administration of the church including pastoral care and oversight, preparation of ministry rotas, and maintaining financial records. We also use your information to contact you about church services and events, fulfil requests you make, comply with legal or regulatory requirements, and to protect our website and users from unauthorised access and fraud.`,
  },
  {
    title: "Disclosure of Your Information",
    content: `Destiny Church will treat all your personal information as private and confidential and not disclose any data about you to anyone other than the leadership and ministry overseers of the church to facilitate the administration and day-to-day ministry of the church. We do not sell, rent, or trade your personal information to third parties. Exceptions apply only where we are legally compelled to do so, where there is a duty to the public to disclose, where disclosure is required to protect your interest, or where disclosure is made at your request or with your consent.`,
  },
  {
    title: "Data Security",
    content: `We have implemented appropriate technical and organisational measures to secure your personal information including SSL/TLS encryption for data transmitted over our website, access controls restricting access to authorised personnel only, regular security audits, data minimisation practices, and secure server storage. While we strive to protect your personal information, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: "Data Retention",
    content: `We will retain your personal information only for as long as necessary to fulfil the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements. To determine the appropriate retention period we consider the amount, nature, and sensitivity of the personal data and the potential risk of harm from unauthorised use or disclosure.`,
  },
  {
    title: "Your Rights",
    content: `Under data protection laws, you have the right to be informed, the right of access, the right to rectification, the right to erasure ('Right to Be Forgotten'), the right to restriction of processing, the right to object, and rights in relation to automated decision-making. To exercise any of these rights, please contact us using the details in the Contact Information section below.`,
  },
  {
    title: "Children's Privacy",
    content: `We do not knowingly collect personal information from children under 13 without verifiable parental consent. For specific ministries or events involving children, we will obtain explicit parental or guardian consent before collecting any personal information about children. Our safeguarding policies provide further details on how we protect children.`,
  },
  {
    title: "Contact Information",
    content: `If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:\n\nFAO: The Data Protection Officer\nDestiny Church Tees Valley\n395 Norton Road, Norton\nStockton-on-Tees TS20 2QQ\nenquiries@destinytees.uk\n+44 (0) 164 2 559 797`,
  },
  {
    title: "Complaints",
    content: `If you are not satisfied with our response to a privacy concern, you have the right to lodge a complaint with the Information Commissioner's Office (ICO):\n\nInformation Commissioner's Office\nWycliffe House, Water Lane, Wilmslow\nCheshire SK9 5AF\nHelpline: 0303 123 1113\nwww.ico.org.uk`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Legal</p>
          <h1 className="mb-2 text-4xl font-black text-destiny-grey md:text-5xl">Privacy Policy</h1>
          <p className="mb-4 text-sm text-destiny-grey/40">Last modified: May 2025</p>
          <p className="mb-12 text-base leading-relaxed text-destiny-grey/70">
            Destiny Church uses personal data about individuals for the purpose of general church administration
            and communication. Destiny Church recognises the importance of the correct and lawful treatment of
            personal data. All personal data we process is managed appropriately and in compliance with the
            General Data Protection Regulation (GDPR) and the Data Protection Act 2018.
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
