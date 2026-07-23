/**
 * Privacy page. Plain-English, honest account of what Bramble stores and why.
 * A starting point — worth a legal review before scaling, given it involves
 * children's data and payments.
 */
import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = { title: "Privacy · Bramble" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy" updated="23 July 2026">
      <p>
        Bramble is a private family app. We collect as little as we can, we never sell it, and
        there is nothing in here to advertise to. This page explains, in plain English, what we
        store and why.
      </p>

      <h3>What we store</h3>
      <ul>
        <li>
          <b>The grown-up&apos;s sign-in.</b> Your email address and password, so you can log in.
          Passwords are handled by our authentication provider and are never stored in plain text.
        </li>
        <li>
          <b>Your household.</b> The children you add — a first name or nickname, a colour, and a
          PIN or picture-PIN you choose. PINs are stored hashed (scrambled), never as the real
          number.
        </li>
        <li>
          <b>What you create in the app.</b> Jobs, the pocket-money ledger, savings goals, favourite
          foods, and meal plans.
        </li>
      </ul>

      <h3>Children</h3>
      <p>
        Children never create an account and never enter personal details beyond the first name or
        nickname and PIN that you set up for them. There are no notifications sent to children, no
        tracking, no profiling, and no advertising anywhere in the app.
      </p>

      <h3>What we never do</h3>
      <ul>
        <li>We never sell or share your family&apos;s data.</li>
        <li>There are no third-party advertising or tracking cookies.</li>
        <li>We don&apos;t build profiles of you or your children.</li>
      </ul>

      <h3>Who helps us run it</h3>
      <p>
        A few trusted services process data on our behalf, only so the app can work:
      </p>
      <ul>
        <li><b>Supabase</b> — stores your household&apos;s data and handles sign-in.</li>
        <li><b>Vercel</b> — hosts and serves the app.</li>
        <li>
          <b>Stripe</b> — takes the one-off payment. Card details go straight to Stripe and never
          touch Bramble; we only record whether your household has paid.
        </li>
      </ul>

      <h3>Keeping and deleting your data</h3>
      <p>
        Your data stays until you ask us to remove it. You can ask to see, correct, or delete
        everything about your household at any time — just email{" "}
        <a href="mailto:hello@familybramble.online">hello@familybramble.online</a> and we&apos;ll
        sort it.
      </p>

      <h3>Contact</h3>
      <p>
        Questions about privacy? Email{" "}
        <a href="mailto:hello@familybramble.online">hello@familybramble.online</a>.
      </p>
    </LegalShell>
  );
}
