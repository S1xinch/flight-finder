export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <article className="wrap max-w-3xl [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="mb-2">Privacy Policy</h1>
      <p>Last updated: 6 October 2026.</p>

      <h2>Who we are</h2>
      <p>
        Flight Finder is a free, non-commercial flight price comparison site run by an individual. Contact us by
        opening an issue at <a href="https://github.com/S1xinch/flight-finder/issues">github.com/S1xinch/flight-finder</a>.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li><strong>Searches (anyone):</strong> origin, destination, dates, passengers and cabin. We use them to fetch fares and to record the cheapest fare per route, which powers price history and deal detection. Route price history is not linked to you.</li>
        <li><strong>Account (if you register):</strong> your email address and a bcrypt hash of your password. We use the email to verify your account, reset your password and send price alerts you ask for. Legal basis: performing the service you asked for.</li>
        <li><strong>Saved searches and price alerts (signed-in users):</strong> routes you searched or watch, alert settings and last-notified times. Used for your dashboard and alerts.</li>
        <li><strong>Booking records (optional):</strong> confirmation numbers, airline, route, date and price that you choose to enter. These are encrypted at rest with AES-256-GCM. We never see your bookings on partner sites.</li>
        <li><strong>Session cookie:</strong> one strictly necessary, HTTP-only cookie holding a signed token that keeps you signed in for 24 hours. We use no advertising or analytics cookies.</li>
        <li><strong>IP address:</strong> held temporarily (up to 10 minutes) in a rate-limiting counter to prevent abuse. Hosting providers also keep standard server logs.</li>
      </ul>

      <h2>Who we share data with</h2>
      <p>These providers process data on our behalf. We do not sell data and do not use affiliate tracking.</p>
      <ul>
        <li>Vercel (hosting and server logs).</li>
        <li>Neon (database) and Upstash (cache and rate limiting).</li>
        <li>Google Flights: to find fares, our server reads Google&apos;s public Flights pages for the route and dates you search. Google sees our server&apos;s address, not yours, and receives no account details.</li>
        <li>Bright Data, our backup source, which retrieves public Google Flights results when the direct read fails. It receives only the flight query, not your identity.</li>
        <li>Aviationstack, which receives only a flight number when you look one up or check a saved flight&apos;s status, never your account details.</li>
        <li>Resend, which delivers account and alert emails to your address.</li>
      </ul>
      <p>
        When you click a booking link you go to Google Flights, Skyscanner, Kayak or an airline. Their privacy policies
        apply from that point.
      </p>

      <h2>Retention</h2>
      <p>
        Account data is kept until you delete your account. Route price history is kept in aggregate form without personal
        data. Verification and password-reset tokens are stored only as hashes and expire.
      </p>

      <h2>Your rights (GDPR and similar laws)</h2>
      <p>
        You can access, correct, export and erase your data. In your <a href="/dashboard">dashboard</a>, use
        <em> Download my data</em> for a JSON export and <em>Delete my account</em> to erase your account, searches, alerts and
        bookings immediately. You may also object to or restrict processing, and complain to your data protection authority.
      </p>

      <h2>Security</h2>
      <p>
        Traffic is HTTPS only. Passwords are hashed with bcrypt (12 rounds). Booking data is encrypted at rest. No payment
        card data is collected or stored.
      </p>

      <h2>Children</h2>
      <p>The service is not directed at children under 16.</p>

      <h2>Changes</h2>
      <p>We will update the date above when this policy changes.</p>
    </article>
  );
}
