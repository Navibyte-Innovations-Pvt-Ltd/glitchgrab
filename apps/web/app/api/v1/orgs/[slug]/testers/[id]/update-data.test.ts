// Tester PATCH payload builder tests — run: bun test update-data.test.ts
import { describe, expect, it } from "bun:test";
import { buildTesterUpdateData } from "./update-data";

describe("buildTesterUpdateData", () => {
  it("trims and includes only the fields provided", () => {
    const result = buildTesterUpdateData({ name: "  Pradeep  " });
    expect(result).toEqual({ data: { name: "Pradeep" } });
  });

  it("strips non-digit characters from phone", () => {
    const result = buildTesterUpdateData({ phone: "+91 92842-17216" });
    expect(result).toEqual({ data: { phone: "919284217216" } });
  });

  it("collapses an empty phone to null (clears the field)", () => {
    const result = buildTesterUpdateData({ phone: "" });
    expect(result).toEqual({ data: { phone: null } });
  });

  it("collapses an empty email to null (clears the field)", () => {
    const result = buildTesterUpdateData({ email: "  " });
    expect(result).toEqual({ data: { email: null } });
  });

  it("trims email", () => {
    const result = buildTesterUpdateData({ email: "  pradeep@example.com  " });
    expect(result).toEqual({ data: { email: "pradeep@example.com" } });
  });

  it("omits fields that were not sent at all", () => {
    const result = buildTesterUpdateData({ name: "Pradeep" });
    expect(result).toEqual({ data: { name: "Pradeep" } });
    if ("data" in result) {
      expect(result.data).not.toHaveProperty("phone");
      expect(result.data).not.toHaveProperty("email");
    }
  });

  it("rejects a name that is empty after trimming", () => {
    const result = buildTesterUpdateData({ name: "   " });
    expect(result).toEqual({ error: "name cannot be empty" });
  });

  it("rejects an empty-string name even with other fields present", () => {
    const result = buildTesterUpdateData({ name: "", phone: "919284217216" });
    expect(result).toEqual({ error: "name cannot be empty" });
  });

  it("returns an empty update when nothing is provided", () => {
    const result = buildTesterUpdateData({});
    expect(result).toEqual({ data: {} });
  });

  it("updates all three fields together", () => {
    const result = buildTesterUpdateData({
      name: "Pradeep Pathade",
      phone: "919284217216",
      email: "pradeep@example.com",
    });
    expect(result).toEqual({
      data: { name: "Pradeep Pathade", phone: "919284217216", email: "pradeep@example.com" },
    });
  });
});
