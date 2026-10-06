/*
 * app/legal/privacy/page.tsx — privacy policy (template for client review).
 * Why: spec 5.7 requires a page that plainly explains the no-third-party-
 * cookie analytics stance and Do Not Track handling, and 5.8 requires the
 * policy itself. Written in plain English, flagged for legal review.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What CHOQUE collects, why, and how to control it.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="text-sm">
        <strong>Template for client review.</strong> Last updated{" "}
        {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
      </p>

      <h2>The short version</h2>
      <p>
        We collect the minimum needed to run a training community: who you are, what you train,
        and anonymous counts of how the product is used. We do not sell data, we do not run
        third-party advertising or tracking cookies, and your training notebook is private —
        permanently, including from us.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account</strong> — email address and password hash, handled by our auth provider.</li>
        <li><strong>Profile</strong> — display name, city or neighbourhood, belt/level, interests, availability, and an optional avatar. Each field carries your own visibility setting: public, connections only, or private.</li>
        <li><strong>Connections</strong> — who you requested, who accepted, and the intro message. Contact details are revealed only after both people accept.</li>
        <li><strong>Contributions</strong> — gyms and open mats you submit, and reports you file.</li>
        <li><strong>Notebook</strong> — your notes, collections and attached links.</li>
        <li><strong>Product analytics</strong> — see below.</li>
      </ul>

      <h2>Location</h2>
      <p>
        We never display your exact address. Profiles show a city or neighbourhood only, chosen by
        you, and you can set that field to private at any time.
      </p>

      <h2>Your notebook is private</h2>
      <p>
        Notebook entries, collections and links are readable only by the account that created them.
        This is enforced in the database with row-level security that has <strong>no administrator
        override</strong>. Our staff cannot read your notes, and neither can anyone else.
      </p>

      <h2>Analytics, without the creepiness</h2>
      <p>
        We record first-party product events — page views, searches (the city, style and how many
        results came back), gym profile views, connection requests sent and accepted, open mats
        submitted, notes created, and signups. We use them to fix dead ends: a search that returns
        nothing tells us which city needs more gyms.
      </p>
      <ul>
        <li>No third-party analytics scripts and no tracking or advertising cookies.</li>
        <li>We never log the contents of your notes, messages or searches alongside your identity for advertising purposes.</li>
        <li><strong>We honour Do Not Track.</strong> If your browser sends the DNT signal, we record no events at all for that session.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We set one cookie to keep you signed in and route you correctly. That&apos;s it — there is no
        advertising, profiling or cross-site cookie on CHOQUE.
      </p>

      <h2>Email</h2>
      <p>
        We send transactional email only: welcome, verification, password reset, connection request
        received and accepted, and listing approved or rejected. There is no marketing list.
      </p>

      <h2>Your controls</h2>
      <ul>
        <li><strong>Edit or hide</strong> any profile field from your profile page.</li>
        <li><strong>Export</strong> your notebook as Markdown or JSON at any time.</li>
        <li><strong>Block</strong> anyone — blocked people cannot see you, find you in search, or contact you.</li>
        <li><strong>Delete your account</strong> from your profile. Deletion cascades to your profile, notes, connections and submissions.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        Account data lives until you delete it. Moderation records (reports and the audit log of
        staff actions) are kept after deletion in pseudonymised form, because they protect other
        members. IP addresses in the audit log are stored only as a one-way hash.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, or want a copy of your data? Email{" "}
        <a href="mailto:privacy@choque.app">privacy@choque.app</a>.
      </p>
    </>
  );
}
