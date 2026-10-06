/*
 * app/legal/terms/page.tsx — terms of service (template for client review).
 * Why: spec 5.8 requires a Terms page. Covers the essentials for a community
 * directory: eligibility, your content, listings, physical-safety disclaimer,
 * suspension, and liability. Marked clearly as a template.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The agreement between you and CHOQUE.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm">
        <strong>Template for client review — not yet legal advice.</strong> Last updated{" "}
        {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
      </p>

      <h2>1. Who can use CHOQUE</h2>
      <p>
        You must be 16 or older to hold an account. If you are under 18, a parent or guardian must
        agree to these terms on your behalf. One account per person.
      </p>

      <h2>2. Your account</h2>
      <p>
        Keep your password private and your profile accurate. You are responsible for activity on
        your account. Tell us promptly at <a href="mailto:support@choque.app">support@choque.app</a>{" "}
        if you believe it has been compromised.
      </p>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of everything you post — profile details, gym submissions, open mats and
        notes. By posting public content you grant CHOQUE a non-exclusive licence to display and
        distribute it within the service. Your notebook is private and is never displayed to anyone.
      </p>

      <h2>4. Listings and accuracy</h2>
      <p>
        Gyms and open mats are community-submitted and reviewed by moderators before publication. We
        do our best, but we cannot guarantee that schedules, prices or visitor requirements are
        current. Confirm with the academy before you travel.
      </p>

      <h2>5. Training is physical. Train at your own risk.</h2>
      <p>
        <strong>CHOQUE introduces people; it does not supervise training.</strong> Martial arts carry
        a real risk of injury. We do not vet, certify, insure or background-check gyms, coaches or
        training partners, and we are not responsible for what happens on the mat or at any meeting
        arranged through the service. Use your judgement, train at reputable academies, meet new
        partners in supervised settings, and carry your own insurance.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Follow the <a href="/legal/guidelines">Community Guidelines</a>. In short: no harassment,
        no fake listings, no spam, no scraping, no attempt to access another member&apos;s private
        data, and no using CHOQUE to recruit for anything other than training.
      </p>

      <h2>7. Moderation and suspension</h2>
      <p>
        Moderators may edit or remove listings and suspend accounts that break these terms. A
        suspended account can still sign in and read its own data, but cannot post, submit or send
        connection requests. Every staff action is logged with a reason, and you may appeal to{" "}
        <a href="mailto:appeals@choque.app">appeals@choque.app</a>.
      </p>

      <h2>8. Ending the agreement</h2>
      <p>
        You can delete your account at any time from your profile. We may terminate accounts for
        serious or repeated breaches. Deletion removes your profile, notes, connections and
        submissions, subject to the retention rules in our <a href="/legal/privacy">Privacy policy</a>.
      </p>

      <h2>9. Liability</h2>
      <p>
        CHOQUE is provided &quot;as is&quot;. To the fullest extent permitted by law, we exclude
        liability for indirect or consequential loss, and for injury arising from training or from
        meetings arranged through the service. Nothing here limits liability that cannot lawfully be
        limited.
      </p>

      <h2>10. Changes</h2>
      <p>
        We will post material changes to these terms here and notify account holders by email at
        least 14 days before they take effect.
      </p>
    </>
  );
}
