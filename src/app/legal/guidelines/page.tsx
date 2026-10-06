/*
 * app/legal/guidelines/page.tsx — community guidelines (template).
 * Why: moderators need a public standard to point at when they action a
 * report. Written as norms rather than legalese, matching the tone a gym
 * would actually use on its wall.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "How we treat each other on and off the mat.",
};

export default function GuidelinesPage() {
  return (
    <>
      <h1>Community Guidelines</h1>
      <p className="text-sm">
        <strong>Template for client review.</strong> These are the standards moderators enforce.
      </p>

      <h2>Leave your ego at the door</h2>
      <p>
        The same etiquette that makes a good training partner makes a good member here. Be useful,
        be honest, and assume the person on the other side is trying their best.
      </p>

      <h2>Safety first, always</h2>
      <ul>
        <li>Be honest about your experience level and your injuries when arranging to train.</li>
        <li>Respect a partner&apos;s stated limits — intensity, submissions, and what&apos;s off-limits.</li>
        <li>Meet new partners at a gym or a public open mat, never somewhere private.</li>
        <li>Do not arrange unsupervised sparring with someone you&apos;ve just met online.</li>
      </ul>

      <h2>Connection requests</h2>
      <p>
        Send a short, specific intro — your level, your weight, when you train. Accepting a request
        shares contact details, so only accept people you actually intend to train with. Declining
        is always fine and the other person is never told who declined.
      </p>

      <h2>Harassment is an instant removal</h2>
      <p>
        No sexual advances, slurs, threats, or pressure of any kind. Using connection requests to
        hit on people rather than to train is harassment. Members can block anyone instantly — once
        blocked, you disappear from each other entirely.
      </p>

      <h2>Honest listings only</h2>
      <ul>
        <li>Submit gyms and open mats that genuinely exist and that you have accurate details for.</li>
        <li>Keep schedules, drop-in fees and visitor requirements current.</li>
        <li>Only claim ownership of a gym you actually run or coach at.</li>
        <li>Do not use listings as advertising for products, seminars or unrelated services.</li>
      </ul>

      <h2>Respect other academies</h2>
      <p>
        Rivalries belong on the mat, not in the directory. Do not use reviews, listings or reports
        to attack a competing gym, and do not post private disputes about coaches or lineages.
      </p>

      <h2>What happens when you break these</h2>
      <p>
        Depending on severity, a moderator may dismiss the report, hide the listing, send a warning,
        or suspend the account. A suspended member keeps read access to their own data and notebook
        and can appeal at <a href="mailto:appeals@choque.app">appeals@choque.app</a>. Only admins can
        lift a suspension, and every decision is recorded with a reason.
      </p>

      <h2>Reporting</h2>
      <p>
        Every profile and listing has a Report action. Tell us what happened in your own words —
        reports are confidential and the person you report is never told who filed it.
      </p>
    </>
  );
}
