import AnimateIn from "@/components/AnimateIn";

export const metadata = { title: "Data & GDPR Policy" };

const sections = [
  {
    title: "1. Purpose and Scope",
    content: `This Data & GDPR Policy sets out the obligations of Destiny Church Tees Valley ("Destiny Church", "we", "us", "our") regarding data protection and the rights of individuals ("data subjects") in respect of their personal data under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.\n\nThis policy applies to all personal data processed by Destiny Church, including data processed by staff, volunteers, contractors, and any third parties acting on behalf of the church.`,
  },
  {
    title: "2. Data Controller",
    content: `Destiny Church Tees Valley is the data controller for all personal data processed in the course of its activities. Our registered address is:\n\nDestiny Centre\n395 Norton Road, Norton\nStockton-on-Tees TS20 2QQ\n\nFor all data protection enquiries, please contact our Data Protection Officer at enquiries@destinytees.uk.`,
  },
  {
    title: "3. What Personal Data We Hold",
    content: `We may hold personal data including, but not limited to:\n\n• Full name, date of birth, and contact details (address, email, phone)\n• Financial information including donation records and Gift Aid declarations\n• Church attendance and ministry participation records\n• Safeguarding records (held separately and securely)\n• Employment and volunteer records\n• Images and video recordings taken at church events\n• Health or dietary information where relevant to event participation\n• Information shared through pastoral care relationships`,
  },
  {
    title: "4. Lawful Basis for Processing",
    content: `We will only process personal data where we have a lawful basis to do so. The lawful bases we rely on include:\n\n• Consent: where individuals have given clear, freely given consent for a specific purpose\n• Contract: where processing is necessary to fulfil a contract or take steps prior to entering one\n• Legal obligation: where processing is required to comply with a legal or regulatory obligation\n• Legitimate interests: where processing is necessary for our legitimate interests as a church, provided those interests are not overridden by the rights of individuals\n• Vital interests: where processing is necessary to protect someone's life`,
  },
  {
    title: "5. Data Minimisation and Accuracy",
    content: `We are committed to collecting only the personal data that is necessary for the stated purpose. We will take reasonable steps to ensure that personal data held is accurate and kept up to date. Individuals are encouraged to notify us of any changes to their personal data.`,
  },
  {
    title: "6. Data Retention",
    content: `Personal data will not be kept for longer than is necessary for the purpose for which it was collected. Different categories of data are retained for different periods based on legal requirements and operational need:\n\n• General contact information: retained while the individual is an active member or attendee, plus 2 years\n• Financial and Gift Aid records: retained for a minimum of 7 years in line with HMRC requirements\n• Safeguarding records: retained in accordance with statutory safeguarding guidance\n• Employment records: retained for 6 years after the employment relationship ends`,
  },
  {
    title: "7. Data Security",
    content: `We take the security of personal data seriously and have implemented appropriate technical and organisational measures to protect data against unauthorised access, loss, or destruction. These measures include:\n\n• Secure, password-protected systems and databases\n• Restricted access on a need-to-know basis\n• Confidentiality agreements for staff and volunteers with data access\n• Regular review of data security practices\n• Secure disposal of data that is no longer required`,
  },
  {
    title: "8. Sharing Data with Third Parties",
    content: `We do not sell or trade personal data. We may share personal data with trusted third parties where necessary for legitimate church operations, including:\n\n• ChurchSuite (church management system) — processed under a data processing agreement\n• Payment processors for donation handling\n• HMRC for Gift Aid reclaim purposes\n• Statutory authorities where legally required (e.g. safeguarding referrals)\n\nAll third-party processors are required to handle personal data in accordance with UK GDPR requirements.`,
  },
  {
    title: "9. Individual Rights",
    content: `Under the UK GDPR, individuals have the following rights regarding their personal data:\n\n• Right to be informed — to know how their data is being used\n• Right of access — to request a copy of their personal data (Subject Access Request)\n• Right to rectification — to request correction of inaccurate data\n• Right to erasure — to request deletion of data in certain circumstances\n• Right to restrict processing — to request we limit how we use data\n• Right to data portability — to receive data in a portable format\n• Right to object — to object to processing based on legitimate interests\n\nTo exercise any of these rights, please contact our Data Protection Officer. We will respond within 30 days.`,
  },
  {
    title: "10. Data Breaches",
    content: `In the event of a personal data breach, Destiny Church will assess the risk to individuals and, where required, notify the Information Commissioner's Office (ICO) within 72 hours. Where a breach is likely to result in a high risk to individuals, those individuals will also be notified without undue delay.`,
  },
  {
    title: "11. Complaints",
    content: `If you have concerns about how we handle your personal data, please contact us in the first instance at enquiries@destinytees.uk. If you remain unsatisfied, you have the right to lodge a complaint with the ICO:\n\nInformation Commissioner's Office\nWycliffe House, Water Lane\nWilmslow, Cheshire SK9 5AF\nTel: 0303 123 1113\nwww.ico.org.uk`,
  },
  {
    title: "12. Policy Review",
    content: `This policy will be reviewed annually or following any significant changes to data protection law or church operations. The most recent version will always be available on our website.`,
  },
];

export default function DataGdprPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Legal</p>
          <h1 className="mb-2 text-4xl font-black text-destiny-grey md:text-5xl">Data &amp; GDPR Policy</h1>
          <p className="mb-12 text-sm text-destiny-grey/40">Last modified: March 2026</p>
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
