import Navbar from "@/components/Navbar";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Terms of Service</h1>
        <p className="text-cream-muted mb-8">Foodies — Private Chef Experience Platform</p>

        <div className="space-y-8 text-sm text-cream/90 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">1. Platform Role & Independent Contractors</h2>
            <p>
              Foodies operates as a marketplace platform that connects clients seeking private chef experiences
              with independent culinary professionals. <strong>Chefs on our platform are independent contractors,
              not employees of Foodies.</strong> Foodies does not employ, supervise, or control the manner in which
              chefs perform their services.
            </p>
            <p className="mt-3">
              Each chef is solely responsible for the quality, safety, and preparation of all food served during
              a booking. Clients acknowledge that Foodies does not guarantee, warranty, or endorse any specific
              chef&apos;s performance or the food they prepare.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">2. Platform Fees & Commission</h2>
            <p>
              Foodies charges a platform service fee on each transaction. This fee covers platform operation,
              payment processing, customer support, background check administration, and insurance verification.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
              <li>Platform fee: up to 30% of the booking total</li>
              <li>Chefs receive their earnings after the platform fee is deducted</li>
              <li>All prices displayed to clients include the platform fee</li>
              <li>Fees are non-negotiable and subject to change with notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">3. Non-Circumvention Agreement</h2>
            <div className="bg-dark-card border border-gold/20 p-5">
              <p className="font-semibold text-cream mb-2">Important: Please read carefully</p>
              <p>
                By using the Foodies platform, both clients and chefs agree not to circumvent the platform
                to arrange bookings directly. This includes but is not limited to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
                <li>Exchanging personal contact information (phone numbers, emails, social media handles)</li>
                <li>Arranging bookings outside the Foodies platform after being introduced through it</li>
                <li>Using third-party payment methods to avoid platform fees</li>
                <li>Soliciting or encouraging off-platform transactions</li>
              </ul>
              <p className="mt-4 font-semibold text-gold">
                Violation of this agreement may result in a penalty of $500 or 25% of the circumvented
                booking value (whichever is greater), account suspension, and/or permanent ban from the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">4. Food Safety & Liability</h2>
            <p>
              All chefs on Foodies are required to hold valid ServSafe certification, general liability insurance,
              and product liability insurance. However:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
              <li>Chefs are independently responsible for food safety, allergen management, and hygiene</li>
              <li>Clients must disclose all dietary restrictions and allergies when booking</li>
              <li>Foodies is not liable for any foodborne illness, allergic reactions, or adverse health effects</li>
              <li>Chefs carry their own liability insurance for claims arising from their services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">5. Background Checks & Safety</h2>
            <p>
              All chefs must consent to and pass a background check before being approved on the platform.
              Background checks may include criminal history, sex offender registry, and identity verification.
            </p>
            <p className="mt-3">
              While we take reasonable measures to verify chef identities and backgrounds, no screening process
              is 100% comprehensive. Clients should exercise their own judgment and take appropriate safety precautions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">6. Address Privacy & Security</h2>
            <p>
              Client addresses are protected and only revealed to the assigned chef when they start the job or
              within one hour of the scheduled booking time. Before that, chefs see only a general area
              (city/neighborhood). This protects client privacy while ensuring chefs can navigate to the location.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">7. In-App Messaging</h2>
            <p>
              All communication between clients and chefs must occur through the Foodies in-app messaging system.
              Messages are monitored for safety, and any contact information shared within messages will be
              automatically filtered. This policy protects both parties and ensures all interactions are documented.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">8. Booking Completion & Payment Release</h2>
            <p>
              Upon completing a booking, the chef marks the job as complete. The client then has <strong>24 hours</strong> to
              confirm completion and release payment. If the client does not confirm or dispute within 24 hours,
              the booking is automatically confirmed and payment is released to the chef.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
              <li>Payment is held in escrow until the client confirms completion or the 24-hour window expires</li>
              <li>Clients are encouraged to review the chef&apos;s work and leave a rating after confirmation</li>
              <li>If a client believes the service was not rendered or was unsatisfactory, they must file a dispute within the 24-hour confirmation window</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">9. Disputes & Conflict Resolution</h2>
            <div className="bg-dark-card border border-gold/20 p-5">
              <p className="font-semibold text-cream mb-2">Dispute Process</p>
              <p>
                If either party is dissatisfied with the service, they may file an incident report through the platform.
                Foodies will review all available evidence, including but not limited to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
                <li>In-app messages between the client and chef</li>
                <li>Booking details, timestamps, and confirmation records</li>
                <li>Platform activity logs and service records</li>
                <li>Photos, reviews, and any supporting documentation provided by either party</li>
              </ul>
              <p className="mt-4">
                Foodies reserves the right to make final, binding decisions on all disputes. Outcomes may include
                full or partial refunds, account warnings, suspensions, or permanent bans depending on the severity of the issue.
              </p>
              <p className="mt-3 text-cream-muted text-xs">
                Disputes must be filed within 7 days of the booking date. Foodies aims to resolve all disputes within 5 business days.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">10. Client Obligations</h2>
            <p>By using the Foodies platform, clients agree to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-cream-muted">
              <li>Provide accurate booking details including guest count, dietary restrictions, and event address</li>
              <li>Ensure a clean, safe, and accessible kitchen for the chef to work in</li>
              <li>Be present or have an authorized adult present during the entire booking</li>
              <li>Provide reasonable notice (minimum 24 hours) for any changes to the booking</li>
              <li>Confirm booking completion promptly after the chef finishes the service</li>
              <li>Not attempt to hire, solicit, or contact chefs outside the Foodies platform</li>
              <li>Treat chefs with respect and professionalism at all times</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">11. Cancellations & Refunds</h2>
            <ul className="list-disc list-inside space-y-1 text-cream-muted">
              <li>Clients may cancel pending bookings at no charge</li>
              <li>Confirmed bookings may be subject to a cancellation fee</li>
              <li>Chefs who cancel confirmed bookings may face account penalties</li>
              <li>Refund requests are handled on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3 text-gold">12. Vehicle Verification</h2>
            <p>
              For client safety, all chefs must register their vehicle information (license plate, make, and model)
              during onboarding. This allows clients to verify the identity of the chef arriving at their home.
            </p>
          </section>

          <section className="border-t border-dark-border pt-6">
            <p className="text-cream-muted text-xs">
              Last updated: {new Date().toLocaleDateString()}. Foodies reserves the right to modify these terms
              at any time. Continued use of the platform constitutes acceptance of any changes.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
