import { Contact } from "@prisma/client";
import { prisma } from "../utils/prismaClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IdentityResponse {
  contact: {
    primaryContatctId: number;   // NOTE: matches spec spelling ("Contatct")
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the final response from a resolved cluster.
 * Primary's email/phone always appear first; duplicates are removed.
 */
function buildResponse(
  primary: Contact,
  allContacts: Contact[]
): IdentityResponse {
  const secondaries = allContacts.filter((c) => c.id !== primary.id);

  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
  }

  const phoneNumbers: string[] = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber))
      phoneNumbers.push(c.phoneNumber);
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((c) => c.id),
    },
  };
}

/**
 * Build a Prisma OR conditions array only when values are non-null.
 * This prevents Prisma from throwing: "Argument OR must not be empty".
 */
function buildOrConditions(
  email: string | null,
  phoneNumber: string | null
): Array<{ email: string } | { phoneNumber: string }> {
  const conditions: Array<{ email: string } | { phoneNumber: string }> = [];
  if (email) conditions.push({ email });
  if (phoneNumber) conditions.push({ phoneNumber });
  return conditions;
}

// ── Main service function ─────────────────────────────────────────────────────

export async function processIdentity(
  email: string | null,
  phoneNumber: string | null
): Promise<IdentityResponse> {
  // Guard — controller should already block this, but defence-in-depth
  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber is required");
  }

  return prisma.$transaction(async (tx) => {
    // ── 1. Find all contacts that directly match email OR phone ───────────────
    const conditions = buildOrConditions(email, phoneNumber);

    const directMatches = await tx.contact.findMany({
      where: { OR: conditions, deletedAt: null },
    });

    // ── 2. No matches → brand-new primary contact ─────────────────────────────
    if (directMatches.length === 0) {
      const newContact = await tx.contact.create({
        data: { email, phoneNumber, linkPrecedence: "primary", linkedId: null },
      });
      return buildResponse(newContact, [newContact]);
    }

    // ── 3. Collect all unique primary IDs from the matched contacts ───────────
    const primaryIds = new Set<number>();
    for (const c of directMatches) {
      if (c.linkPrecedence === "primary") {
        primaryIds.add(c.id);
      } else if (c.linkedId !== null) {
        primaryIds.add(c.linkedId);
      }
    }

    // ── 4. Fetch the full cluster for all discovered primaries ─────────────────
    const primaryIdList = Array.from(primaryIds);
    let allContacts = await tx.contact.findMany({
      where: {
        OR: [
          { id: { in: primaryIdList } },
          { linkedId: { in: primaryIdList } },
        ],
        deletedAt: null,
      },
    });

    // ── 5. Determine the single true primary (earliest createdAt) ─────────────
    const primaries = allContacts
      .filter((c) => c.linkPrecedence === "primary")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const truePrimary = primaries[0];
    const primariesToDemote = primaries.slice(1);

    // ── 6. Demote any extra primaries → secondary under truePrimary ───────────
    if (primariesToDemote.length > 0) {
      const demoteIds = primariesToDemote.map((p) => p.id);

      // Re-parent secondaries that were pointing at a demoted primary
      await tx.contact.updateMany({
        where: { linkedId: { in: demoteIds }, deletedAt: null },
        data: { linkedId: truePrimary.id },
      });

      // Demote the primaries themselves
      await tx.contact.updateMany({
        where: { id: { in: demoteIds } },
        data: { linkPrecedence: "secondary", linkedId: truePrimary.id },
      });
    }

    // ── 7. Re-fetch the full cluster after any demotions ──────────────────────
    allContacts = await tx.contact.findMany({
      where: {
        OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
        deletedAt: null,
      },
    });

    // ── 8. Check whether the incoming data introduces new info ─────────────────
    const existingEmails = new Set(
      allContacts.map((c) => c.email).filter(Boolean)
    );
    const existingPhones = new Set(
      allContacts.map((c) => c.phoneNumber).filter(Boolean)
    );

    const isNewEmail = email !== null && !existingEmails.has(email);
    const isNewPhone = phoneNumber !== null && !existingPhones.has(phoneNumber);

    if (isNewEmail || isNewPhone) {
      // Create a secondary contact that carries the new piece(s) of info
      const newSecondary = await tx.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: truePrimary.id,
        },
      });
      allContacts.push(newSecondary);
    }

    // ── 9. Re-fetch the (possibly updated) primary row and return ─────────────
    const updatedPrimary = await tx.contact.findUniqueOrThrow({
      where: { id: truePrimary.id },
    });

    return buildResponse(updatedPrimary, allContacts);
  });
}
