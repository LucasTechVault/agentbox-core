import test from "node:test";
import assert from "node:assert/strict";
import { invoiceTotal } from "../src/invoice.mjs";

test("totals integer cents", () => {
  assert.equal(invoiceTotal([{ priceCents: 125, quantity: 2 }, { priceCents: 399, quantity: 1 }]), 649);
});

test("empty invoices total zero", () => assert.equal(invoiceTotal([]), 0));
test("negative quantities are rejected", () => assert.throws(() => invoiceTotal([{ priceCents: 99, quantity: -1 }]), TypeError));
