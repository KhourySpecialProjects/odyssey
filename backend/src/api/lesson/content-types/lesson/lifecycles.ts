module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate that at least one content field exists
    if (!data.blocks && !data.blocksV2) {
      throw new Error('Lesson must have either blocks or blocksV2 content');
    }
    
    // Generate slug
    event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
      contentTypeUID: "api::lesson.lesson",
      field: "slug",
      data: event.params.data
    });
  },
  
  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Validate content fields if either is being updated
    if ('blocks' in data || 'blocksV2' in data) {
      // Fetch existing lesson to check final state
      const existingLesson = await strapi.entityService.findOne(
        'api::lesson.lesson',
        event.params.where.id
      );
      
      // Determine final state after update
      const existingLessonAny = existingLesson as any;
      const finalBlocks = 'blocks' in data ? data.blocks : existingLessonAny?.blocks;
      const finalBlocksV2 = 'blocksV2' in data ? data.blocksV2 : existingLessonAny?.blocksV2;
      
      if (!finalBlocks && !finalBlocksV2) {
        throw new Error('Lesson must have either blocks or blocksV2 content');
      }
    }
    
    // Handle slug regeneration
    if (event.params.data.regenerateSlug) { 
      event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
        contentTypeUID: "api::lesson.lesson",
        field: "slug",
        data: event.params.data
      });
    }
    delete event.params.data.regenerateSlug;
  },
};