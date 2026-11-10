import { generateSlug } from '../../../../lib/lifecycle-utils';

module.exports = {
  // The slug is always made from the name, so any name gives a valid uid
  // ("Command Line Interface (CLI)" -> "command-line-interface-cli").
  async beforeCreate(event) {
    const slug = await generateSlug('api::tag.tag', event.params.data);
    event.params.data.slug =
      slug || (await generateSlug('api::tag.tag', { ...event.params.data, name: 'tag' }));
  },
};
