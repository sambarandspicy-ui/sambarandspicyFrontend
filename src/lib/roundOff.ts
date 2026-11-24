/** Round a non-negative bill total to the nearest rupee, with 50 paise rounded up. */
export function roundBillTotal(total: number) {
  const paise = Math.round(total * 100);
  const roundedPaise = Math.floor((paise + 50) / 100) * 100;
  return { total: roundedPaise / 100, adjustment: (roundedPaise - paise) / 100 };
}
