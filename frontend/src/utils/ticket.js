import { formatMoney, formatPercent } from "./money";

const WIDTH = 36;

const line = (char = "-") => char.repeat(WIDTH);
const centre = (text) => {
  const pad = Math.max(0, Math.floor((WIDTH - text.length) / 2));
  return " ".repeat(pad) + text;
};
/** Label on the left, amount right-aligned to the receipt width. */
const row = (label, amount) => {
  const space = Math.max(1, WIDTH - label.length - amount.length);
  return label + " ".repeat(space) + amount;
};

/**
 * Render a sale as plain text for printing.
 *
 * Reads only fields the server returned. Line names come from the stored snapshot
 * (`products[].name`) rather than the populated product, so a ticket still prints
 * correctly after the product has been deleted from the catalogue.
 */
export function buildTicketText(sale) {
  const when = sale.createdAt ? new Date(sale.createdAt) : new Date();

  const rows = [
    centre("CAFECITO FELIZ"),
    centre("Ticket de venta"),
    line(),
    `Folio:   ${sale._id}`,
    `Fecha:   ${when.toLocaleString("es-MX")}`,
    `Cliente: ${sale.client?.display_name ?? "Público general"}`,
    line(),
  ];

  (sale.products ?? []).forEach((item) => {
    rows.push(`${item.quantity} x ${item.name}`);
    // line_total is stored by the server; this file never multiplies money.
    rows.push(row(`   @ ${formatMoney(item.price)}`, formatMoney(item.line_total)));
  });

  rows.push(line());
  rows.push(row("Subtotal", formatMoney(sale.subtotal)));

  if (sale.discount > 0) {
    rows.push(
      row(`Descuento (${formatPercent(sale.discount)})`, `-${formatMoney(sale.discount_amount)}`),
    );
  }

  rows.push(row("TOTAL", formatMoney(sale.total_price)));
  rows.push(line());
  rows.push(centre("¡Gracias por su compra!"));
  rows.push("");

  // CRLF: the target is Windows, and Notepad renders bare \n as one long line.
  return rows.join("\r\n");
}

/**
 * Hand the ticket to the browser as a .txt download.
 *
 * No real printer is involved — this produces a file the user can then print.
 */
export function downloadTicket(sale) {
  const blob = new Blob([buildTicketText(sale)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ticket-${sale._id}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Release the blob, or it is held for the lifetime of the document.
  URL.revokeObjectURL(url);
}
