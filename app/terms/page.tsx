/**
 * Terms page. Plain-English terms for a small one-off-fee family app. A starting
 * point — worth a legal review before scaling.
 */
import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = { title: "Terms · Bramble" };

export default function Terms() {
  return (
    <LegalShell title="Terms" updated="23 July 2026">
      <p>
        Bramble is a tool that helps a family share chores and pocket money. By using it you agree
        to these terms. They&apos;re written to be readable, not to trip you up.
      </p>

      <h3>Who it&apos;s for</h3>
      <p>
        Bramble is for personal, family use. A grown-up sets it up and looks after the household and
        the children on it.
      </p>

      <h3>Paying for it</h3>
      <p>
        Bramble is a <b>one-off payment</b> per household — a single payment unlocks the app for
        your family. There is no subscription and no recurring charge. If Bramble isn&apos;t right
        for you, get in touch at{" "}
        <a href="mailto:hello@familybramble.online">hello@familybramble.online</a> and we&apos;ll
        always try to do the fair thing.
      </p>

      <h3>Pocket money</h3>
      <p>
        Bramble keeps track of pocket money as numbers on a screen. It does <b>not</b> hold, move,
        or pay out any actual money — paying your children is between you and your family. Bramble
        is not a bank or a payment service.
      </p>

      <h3>Looking after your account</h3>
      <p>
        Keep your sign-in details and your children&apos;s PINs to yourself. You&apos;re responsible
        for what happens under your household. Please use Bramble as intended and don&apos;t try to
        break or misuse it.
      </p>

      <h3>The app as it is</h3>
      <p>
        We work hard to keep Bramble running and reliable, but we provide it &quot;as is&quot; and
        can&apos;t promise it will always be available or completely free of glitches. We&apos;ll
        always try to put things right quickly.
      </p>

      <h3>Changes</h3>
      <p>
        We may update these terms from time to time. If we make an important change, we&apos;ll
        note it here.
      </p>

      <h3>Contact</h3>
      <p>
        Anything at all, email{" "}
        <a href="mailto:hello@familybramble.online">hello@familybramble.online</a>.
      </p>
    </LegalShell>
  );
}
