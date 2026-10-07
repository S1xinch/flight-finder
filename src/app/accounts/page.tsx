import Link from "next/link";

export const metadata = {
  title: "How accounts work",
  description: "What an account does, how sign-up and sign-in work, and what we keep. Free, with no tracking.",
};

export default function Accounts() {
  return (
    <article className="wrap max-w-3xl [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="mb-2">How accounts work</h1>
      <p>
        An account is optional and free. You can search and compare fares without one. Create one when you want your
        saved flights, price alerts and settings to follow you from your laptop to your phone.
      </p>

      <h2>What an account gives you</h2>
      <ul>
        <li><strong>Saved flights.</strong> Save any fare from the results. They sync to every device you sign in on, with the price you saw when you saved them.</li>
        <li><strong>Price alerts.</strong> Watch a route and get an email when the lowest fare drops by the percentage you choose, at most daily or whenever the price changes. You can pause or delete an alert at any time.</li>
        <li><strong>Flight status.</strong> On the day you travel, check whether a saved flight is on time, with the terminal and gate.</li>
        <li><strong>Saved searches and recent routes.</strong> Re-run a search in one tap.</li>
        <li><strong>Booking records.</strong> If you book on an airline or travel site, you can note the confirmation number here. We never see or track your bookings, so this is only what you type in.</li>
        <li><strong>Your currency.</strong> Pick the currency you want prices in once, and it applies everywhere.</li>
      </ul>

      <h2>Signing up</h2>
      <ol className="mb-3 list-decimal pl-6">
        <li>Enter your email and a password of at least 10 characters.</li>
        <li>We email you a verification link. You need to open it before you can sign in, which proves the address is yours.</li>
        <li>If the email does not arrive, check spam, then register again with the same address and we will send a fresh link.</li>
      </ol>
      <p>
        Early-access note: emails currently go out from a shared test address, so verification and alert emails may not
        reach everyone yet. If yours does not arrive, tell us on{" "}
        <a href="https://github.com/S1xinch/flight-finder/issues">GitHub</a>.
      </p>

      <h2>Signing in and staying safe</h2>
      <ul>
        <li>Signing in keeps you signed in for 24 hours on that device. After that you sign in again. Sign out any time from the dashboard.</li>
        <li>Your password is stored only as a salted bcrypt hash. We cannot read it, and no one at the site can tell you what it is.</li>
        <li>Forgot it? Request a reset link from the sign-in page. The link works once and expires after an hour.</li>
        <li>Sign-in, sign-up and reset attempts are rate-limited to slow down guessing.</li>
        <li>Booking notes are encrypted before they are stored. Pages are served over HTTPS only.</li>
      </ul>

      <h2>What we keep</h2>
      <p>
        Your email address, the hashed password, your searches, alerts, saved flights, booking notes, and two settings
        (alert emails on or off, and your currency). We use no advertising or analytics cookies, and nothing is sold or
        shared for marketing. The <Link href="/privacy">Privacy Policy</Link> has the full detail.
      </p>

      <h2>Your data is yours</h2>
      <ul>
        <li><strong>Download it.</strong> The dashboard has a <em>Download my data</em> button that gives you everything we hold in one file.</li>
        <li><strong>Delete it.</strong> <em>Delete my account</em> removes your account, searches, alerts, saved flights and booking notes straight away. It cannot be undone.</li>
      </ul>

      <h2>Limits and what is not here yet</h2>
      <ul>
        <li>You can watch up to 20 routes and save up to 200 flights.</li>
        <li>Flight status uses a free data plan with a small monthly allowance, so it is a button you press, not automatic.</li>
        <li>Signing in with Google or Apple, and text-message alerts, are not available yet.</li>
      </ul>

      <p className="mt-6">
        <Link className="btn" href="/register">Create an account</Link>{" "}
        <Link className="btn btn-plain" href="/login">Sign in</Link>
      </p>
    </article>
  );
}
