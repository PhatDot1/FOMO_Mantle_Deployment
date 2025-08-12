"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                FOMO Insurance
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                Back to Home
              </Link>
              <Link href="/app">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Launch dApp
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="text-gray-600 leading-relaxed space-y-6">
            <p className="text-sm text-gray-500 mb-8">Last updated August 12, 2025</p>

            <p>
              This Privacy Notice for FOMO Insurance ('we', 'us', or 'our'), describes how and why we might access, collect, store, use, and/or share ('process') your personal information when you use our services ('Services'), including when you:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Visit our website at fomoinsurance.com or any website of ours that links to this Privacy Notice</li>
              <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>

            <p>
              <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at fomoinsurance@gmail.com.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Summary of Key Points</h2>

            <p>
              This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.
            </p>

            <div className="space-y-4">
              <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</p>

              <p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>

              <p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>

              <p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>

              <p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.</p>

              <p><strong>How do we keep your information safe?</strong> We have adequate organisational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.</p>

              <p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.</p>

              <p><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting fomoinsurance.com, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Table of Contents</h2>

            <ol className="list-decimal pl-6 space-y-1">
              <li>WHAT INFORMATION DO WE COLLECT?</li>
              <li>HOW DO WE PROCESS YOUR INFORMATION?</li>
              <li>WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</li>
              <li>WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</li>
              <li>HOW LONG DO WE KEEP YOUR INFORMATION?</li>
              <li>HOW DO WE KEEP YOUR INFORMATION SAFE?</li>
              <li>WHAT ARE YOUR PRIVACY RIGHTS?</li>
              <li>CONTROLS FOR DO-NOT-TRACK FEATURES</li>
              <li>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</li>
              <li>DO WE MAKE UPDATES TO THIS NOTICE?</li>
              <li>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</li>
              <li>HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</li>
            </ol>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">1. WHAT INFORMATION DO WE COLLECT?</h2>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Personal information you disclose to us</h3>
            <p><strong>In Short:</strong> We collect personal information that you provide to us.</p>

            <p>
              We collect personal information that you voluntarily provide to us when you express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </p>

            <p><strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>

            <ul className="list-disc pl-6">
              <li>email addresses</li>
            </ul>

            <p><strong>Sensitive Information.</strong> We do not process sensitive information.</p>

            <p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Information automatically collected</h3>
            <p><strong>In Short:</strong> Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</p>

            <p>
              We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information.
            </p>

            <p>The information we collect includes:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Log and Usage Data.</strong> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files.</li>
              <li><strong>Device Data.</strong> We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services.</li>
              <li><strong>Location Data.</strong> We collect location data such as information about your device's location, which can be either precise or imprecise.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">2. HOW DO WE PROCESS YOUR INFORMATION?</h2>

            <p><strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>

            <p>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>

            <ul className="list-disc pl-6">
              <li>To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual's vital interest, such as to prevent harm.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</h2>

            <p><strong>In Short:</strong> We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e. legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfil our contractual obligations, to protect your rights, or to fulfil our legitimate business interests.</p>

            <p><strong>If you are located in the EU or UK, this section applies to you.</strong></p>

            <p>The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consent.</strong> We may process your information if you have given us permission (i.e. consent) to use your personal information for a specific purpose. You can withdraw your consent at any time.</li>
              <li><strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
              <li><strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>

            <p><strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following third parties.</p>

            <p>We may need to share your personal information in the following situations:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
              <li><strong>Affiliates.</strong> We may share your information with our affiliates, in which case we will require those affiliates to honour this Privacy Notice.</li>
              <li><strong>Business Partners.</strong> We may share your information with our business partners to offer you certain products, services, or promotions.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">5. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>

            <p><strong>In Short:</strong> We keep your information for as long as necessary to fulfil the purposes outlined in this Privacy Notice unless otherwise required by law.</p>

            <p>
              We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements).
            </p>

            <p>
              When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymise such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">6. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>

            <p><strong>In Short:</strong> We aim to protect your personal information through a system of organisational and technical security measures.</p>

            <p>
              We have implemented appropriate and reasonable technical and organisational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorised third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">7. WHAT ARE YOUR PRIVACY RIGHTS?</h2>

            <p><strong>In Short:</strong> Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), and Switzerland, you have rights that allow you greater access to and control over your personal information.</p>

            <p>
              In some regions (like the EEA, UK, and Switzerland), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making.
            </p>

            <p>
              <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us using the contact details provided below.
            </p>

            <p>
              <strong>Opting out of marketing and promotional communications:</strong> You can unsubscribe from our marketing and promotional communications at any time by clicking on the unsubscribe link in the emails that we send, or by contacting us using the details provided below.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">8. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>

            <p>
              Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ('DNT') feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognising and implementing DNT signals has been finalised. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">9. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>

            <p><strong>In Short:</strong> If you are a resident of certain US states, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information.</p>

            <p>Your rights include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Right to know whether or not we are processing your personal data</li>
              <li>Right to access your personal data</li>
              <li>Right to correct inaccuracies in your personal data</li>
              <li>Right to request the deletion of your personal data</li>
              <li>Right to obtain a copy of the personal data you previously shared with us</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <p><strong>How to Exercise Your Rights:</strong> To exercise these rights, you can contact us by visiting fomoinsurance.com, by emailing us at fomoinsurance@gmail.com, or by referring to the contact details at the bottom of this document.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">10. DO WE MAKE UPDATES TO THIS NOTICE?</h2>

            <p><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>

            <p>
              We may update this Privacy Notice from time to time. The updated version will be indicated by an updated 'Revised' date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">11. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>

            <p>If you have questions or comments about this notice, you may email us at fomoinsurance@gmail.com or contact us by post at:</p>
            <p className="font-semibold">FOMO Insurance</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">12. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>

            <p>
              Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please visit: fomoinsurance.com.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-900 font-bold text-lg">FOMO Insurance</div>
            <div className="flex space-x-8">
              <Link href="/app" className="text-gray-600 hover:text-blue-600 transition-colors">
                App
              </Link>
              <Link href="/faucet" className="text-gray-600 hover:text-blue-600 transition-colors">
                Faucet
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="https://explorer.sepolia.mantle.xyz/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                Explorer
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-gray-500 text-sm">
            © 2024 FOMO Insurance. Powered by Mantle.
          </div>
        </div>
      </footer>
    </div>
  )
}