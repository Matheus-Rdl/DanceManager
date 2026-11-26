import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidLessonCount, isValidLessonAmount, hasValidParticipants,
  isValidLessonDate, isValidLessonTimestamp, isValidLessonInterval
} from "../src/models/privateLessonRules.js";

const a = "507f1f77bcf86cd799439011";
const b = "507f1f77bcf86cd799439012";
const c = "507f1f77bcf86cd799439013";
const start = "2026-12-01T17:00:00.000Z";
const end = "2026-12-01T18:00:00.000Z";

test("accepts standard and custom positive integer counts", () => {
  for (const value of [1, 4, 10, 6]) assert.equal(isValidLessonCount(value), true);
  for (const value of [0, -1, 1.5, NaN, Infinity, "4"]) assert.equal(isValidLessonCount(value), false);
});
test("accepts BRL prices without fractions of a cent", () => {
  for (const value of [200, 760, 1800, 123.45]) assert.equal(isValidLessonAmount(value), true);
  for (const value of [0, -1, 1.001, Infinity, NaN, "200"]) assert.equal(isValidLessonAmount(value), false);
});
test("accepts one, two or more distinct participants", () => {
  for (const value of [[a], [a, b], [a, b, c]]) assert.equal(hasValidParticipants(value), true);
  for (const value of [[], [a, a], ["000052"], [null], null]) assert.equal(hasValidParticipants(value), false);
});
test("validates real contract calendar dates", () => {
  assert.equal(isValidLessonDate("2028-02-29"), true);
  assert.equal(isValidLessonDate("2026-02-29"), false);
  assert.equal(isValidLessonDate("01/12/2026"), false);
});
test("requires canonical UTC instants and valid intervals", () => {
  assert.equal(isValidLessonTimestamp(start), true);
  assert.equal(isValidLessonTimestamp("2026-02-30T17:00:00.000Z"), false);
  assert.equal(isValidLessonTimestamp("2026-12-01T14:00:00-03:00"), false);
  assert.equal(isValidLessonInterval(start, end), true);
  assert.equal(isValidLessonInterval(start, start), false);
  assert.equal(isValidLessonInterval(end, start), false);
});
