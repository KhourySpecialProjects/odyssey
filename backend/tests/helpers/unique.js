// Raw driver errors can fail jest's Error check, so match the message instead.
// Matches SQLite ("table.column") and Postgres (index name) unique failures.
async function expectUniqueViolation(promise, { table, column, index }) {
  const err = await promise.then(
    () => null,
    (e) => e,
  );
  expect(String(err?.message)).toMatch(
    new RegExp(`UNIQUE constraint failed: ${table}\\.${column}|${index}`),
  );
}

module.exports = { expectUniqueViolation };
