const schema = require('../../src/api/quiz-attempt/content-types/quiz-attempt/schema.json');

describe('quiz-attempt schema (ODY-939)', () => {
  it('has no draft and publish and no answer field', () => {
    expect(schema.options.draftAndPublish).toBe(false);
    expect(Object.keys(schema.attributes).sort()).toEqual([
      'attempt',
      'correct',
      'droplet',
      'lesson',
      'questionId',
      'quizType',
      'submitId',
      'user',
    ]);
  });

  it('holds questionId as a biginteger and keeps submitId private', () => {
    expect(schema.attributes.questionId.type).toBe('biginteger');
    expect(schema.attributes.submitId.private).toBe(true);
    expect(schema.attributes.quizType.enum).toEqual(['choice', 'open-ended']);
  });
});
