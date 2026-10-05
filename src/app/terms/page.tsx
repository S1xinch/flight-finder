export const metadata = { title: "Terms and Conditions" };

export default function Terms() {
  return (
    <article className="wrap max-w-3xl [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="mb-2">Terms and Conditions</h1>
      <p>Last updated: 6 October 2026.</p>

      <h2>The service</h2>
      <p>
        Flight Finder is a free tool that shows flight fares gathered from third-party sources, tracks price history and
        sends price alerts. It is not an airline, travel agent or ticket seller. We do not take payments or make bookings.
      </p>

      <h2>Bookings and booking policies</h2>
      <ul>
        <li>Booking buttons open the booking site (for example Google Flights or an airline). You contract with that seller, under their terms, fare rules and baggage policies.</li>
        <li>We are not responsible for changes, cancellations, refunds, delays, baggage fees, seat fees or taxes. These are often not included in the prices we show. Check the total on the booking site before paying.</li>
        <li>We earn nothing from your bookings and do not track whether you complete one. Booking records in your account are only what you choose to enter.</li>
      </ul>

      <h2>Accuracy of information</h2>
      <p>
        Fares are retrieved from third-party sources and cached for up to one hour. Prices, availability and times can
        change or be wrong. A &quot;Deal&quot; label means the price is at least 10% below the average we recorded for that route over
        30 days. It is not a guarantee of value, and the average is based only on our own observations.
      </p>

      <h2>Your account and responsibilities</h2>
      <ul>
        <li>Provide a real email address you control and keep your password secure.</li>
        <li>Do not misuse the service: no automated scraping, attempts to bypass rate limits, or interference with the site.</li>
        <li>You are responsible for checking passport, visa and travel requirements.</li>
      </ul>

      <h2>Price alerts</h2>
      <p>
        Alerts are best effort and may be delayed or missed, including because of third-party outages or daily usage limits.
        Do not rely on them for time-critical decisions.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties. To the fullest extent permitted by law, we are not liable for any
        loss arising from use of the site, inaccurate fares, missed alerts, or third-party sites. Nothing here limits liability
        that cannot be limited by law.
      </p>

      <h2>Availability and changes</h2>
      <p>We may change, limit or stop the service, and update these terms. Continued use means you accept the updated terms.</p>

      <h2>Privacy</h2>
      <p>See our <a href="/privacy">Privacy Policy</a>.</p>
    </article>
  );
}
