/** Display currencies offered on the results page and dashboard (all covered by the ECB rates feed). */
export const CURRENCIES = [
  "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "JPY", "CHF", "SEK", "NOK", "DKK", "SGD", "HKD", "CNY", "KRW", "INR",
  "BRL", "MXN", "ZAR", "TRY", "PLN", "CZK", "HUF", "ILS", "THB", "MYR", "IDR", "PHP",
];

export const currencyName = (c: string) => {
  try {
    return `${c} - ${new Intl.DisplayNames(["en"], { type: "currency" }).of(c)}`;
  } catch {
    return c;
  }
};
