import AnimateIn from "@/components/AnimateIn";

export const metadata = { title: "Safeguarding Policy" };

const sections = [
  {
    title: "1. Policy Statement",
    content: `Destiny Church Tees Valley is committed to the safeguarding and protection of all children, young people and vulnerable adults who are involved in our activities and services. We believe that everyone, regardless of age, gender, ethnicity, disability or background, has the right to protection from abuse and harm.\n\nThis policy applies to all staff, volunteers, trustees, contractors, and anyone acting on behalf of Destiny Church.`,
  },
  {
    title: "2. Our Commitments",
    content: `Destiny Church is committed to:\n\n• Prioritising the welfare of children, young people and vulnerable adults at all times\n• Providing a safe and welcoming environment for all\n• Taking all reasonable steps to protect individuals from harm, abuse and exploitation\n• Responding promptly and appropriately to all concerns or allegations of abuse\n• Implementing robust safer recruitment practices for all staff and volunteers working with children or vulnerable adults\n• Ensuring all relevant workers are appropriately trained in safeguarding\n• Reviewing this policy regularly and keeping it up to date with current legislation and best practice`,
  },
  {
    title: "3. Designated Safeguarding Lead",
    content: `Destiny Church has a Designated Safeguarding Lead (DSL) who is the first point of contact for all safeguarding concerns. The DSL is responsible for:\n\n• Receiving and recording all safeguarding concerns or disclosures\n• Making referrals to statutory agencies (e.g. children's services, police) where necessary\n• Maintaining confidential safeguarding records\n• Ensuring staff and volunteers receive appropriate safeguarding training\n• Liaising with external agencies as required\n\nTo contact our Safeguarding Lead, please email admin@destinytees.uk marked for the attention of the Safeguarding Lead.`,
  },
  {
    title: "4. Types of Abuse",
    content: `Destiny Church recognises the following categories of abuse as defined by statutory guidance:\n\n• Physical abuse: causing physical harm through hitting, shaking, burning or other means\n• Emotional abuse: persistent emotional ill-treatment causing severe and persistent effects on emotional development\n• Sexual abuse: involving a child or vulnerable person in sexual activities they do not fully comprehend, cannot consent to, or that violate the law\n• Neglect: the persistent failure to meet basic physical and/or psychological needs\n• Domestic abuse: any incident of controlling, coercive, threatening behaviour, violence or abuse\n• Financial abuse: theft, fraud or exploitation\n• Spiritual abuse: coercion, control or manipulation using religious authority or doctrine`,
  },
  {
    title: "5. Responding to a Disclosure or Concern",
    content: `If a child, young person or vulnerable adult discloses abuse or you have a concern about someone's welfare, you should:\n\n1. Stay calm and listen carefully without expressing shock or disbelief\n2. Never promise confidentiality — explain that you may need to share what is said with others to keep them safe\n3. Do not ask leading questions or attempt to investigate\n4. Record what has been said as accurately as possible, using the individual's own words\n5. Report the concern to the Designated Safeguarding Lead as soon as possible\n6. If the individual is in immediate danger, contact the police or emergency services on 999\n\nAll concerns will be treated seriously, sensitively and in confidence.`,
  },
  {
    title: "6. Safer Recruitment",
    content: `Destiny Church is committed to safer recruitment practices to help prevent individuals who pose a risk to children or vulnerable adults from gaining access to them. This includes:\n\n• Requiring Disclosure and Barring Service (DBS) checks at an appropriate level for all roles involving unsupervised contact with children or vulnerable adults\n• Taking up references for all new staff and volunteers in relevant roles\n• Verifying identity and right to work in the UK\n• Ensuring all staff and volunteers complete our safeguarding induction training before beginning work`,
  },
  {
    title: "7. Code of Conduct",
    content: `All staff and volunteers working with children, young people or vulnerable adults are expected to:\n\n• Always work in open, observable environments\n• Avoid spending time alone with a child or vulnerable adult where possible\n• Never share personal contact details with children or young people\n• Never use physical punishment or threatening behaviour\n• Never engage in inappropriate communication or relationships\n• Report any situation where they feel uncomfortable or uncertain to the Designated Safeguarding Lead\n• Adhere to the church's social media and communications policy when engaging with children or young people online`,
  },
  {
    title: "8. Photography and Filming",
    content: `Destiny Church recognises the need to protect children and vulnerable adults in relation to photography and filming at church events. We will:\n\n• Obtain explicit consent from parents or guardians before photographing or filming children\n• Never publish images of children or vulnerable adults on social media or our website without appropriate consent\n• Store any images securely and use them only for the stated purpose\n• Delete images when consent is withdrawn`,
  },
  {
    title: "9. Confidentiality",
    content: `All safeguarding information will be handled with the utmost confidentiality. Information will only be shared on a need-to-know basis to protect the individual concerned. Records of safeguarding concerns will be stored securely and separately from other church records.\n\nConfidentiality cannot be guaranteed where there is a risk to the life of an individual, or where a child or vulnerable adult is at risk of significant harm.`,
  },
  {
    title: "10. Allegations Against Staff or Volunteers",
    content: `Any allegation of abuse made against a member of staff or volunteer will be taken seriously and handled in accordance with statutory guidance. The Designated Safeguarding Lead will be notified immediately. The alleged perpetrator will be suspended from their role pending investigation. Destiny Church will cooperate fully with any statutory investigation.`,
  },
  {
    title: "11. Related Policies",
    content: `This Safeguarding Policy should be read alongside:\n\n• Data & GDPR Policy\n• Privacy Policy\n• Volunteer Code of Conduct\n• Social Media Policy\n• Health & Safety Policy`,
  },
  {
    title: "12. Useful Contacts",
    content: `In an emergency, always call 999.\n\nChildren's Services (Stockton-on-Tees): 01642 130 025\nNSPCC Helpline: 0808 800 5000\nChildLine: 0800 1111\nAdult Social Care (Stockton-on-Tees): 01642 527 764\nSamaritans: 116 123\n\nDestiny Church Safeguarding Lead: admin@destinytees.uk`,
  },
];

export default function SafeguardingPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Policy</p>
          <h1 className="mb-2 text-4xl font-black text-destiny-grey md:text-5xl">Safeguarding Policy</h1>
          <p className="mb-4 text-sm text-destiny-grey/40">Last modified: March 2026</p>
          <div className="mb-12 rounded-2xl bg-destiny-orange/10 px-5 py-4">
            <p className="text-sm font-bold text-destiny-orange">
              If you have an immediate safeguarding concern, call 999. For non-emergency concerns, contact our Safeguarding Lead at admin@destinytees.uk.
            </p>
          </div>
        </AnimateIn>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <AnimateIn key={section.title} delay={i * 30}>
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
