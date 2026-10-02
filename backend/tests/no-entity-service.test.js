const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|js)$/.test(entry.name) ? [full] : [];
  });
}

// ODY-606: the Entity Service is gone on Strapi v5. Use strapi.documents()
// (or strapi.db.query() where a transaction needs it) instead.
describe('Entity Service guard', () => {
  it('finds no entityService usage in backend/src', () => {
    const hits = sourceFiles(srcDir).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          line.includes('entityService')
            ? [`${path.relative(srcDir, file)}:${index + 1}: ${line.trim()}`]
            : []
        )
    );

    expect(hits).toEqual([]);
  });
});
