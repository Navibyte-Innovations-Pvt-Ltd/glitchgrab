interface TesterPatchInput {
  name?: string;
  phone?: string;
  email?: string;
}

interface TesterUpdateData {
  name?: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * Builds the Prisma update payload for PATCH /testers/[id] from raw body fields.
 * Only fields present in the input are included (undefined = leave untouched).
 * Empty phone/email collapse to null (clears the field); empty name is rejected.
 */
export function buildTesterUpdateData(
  input: TesterPatchInput
): { data: TesterUpdateData } | { error: string } {
  const { name, phone, email } = input;

  if (name !== undefined && !name.trim()) {
    return { error: "name cannot be empty" };
  }

  const data: TesterUpdateData = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone.replace(/\D/g, "") || null;
  if (email !== undefined) data.email = email.trim() || null;

  return { data };
}
