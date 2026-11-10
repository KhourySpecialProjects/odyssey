// The editable Score with AI prompt text (ODY-898); the caps stay admin-only.
export default {
  routes: [
    {
      method: 'POST',
      path: '/ai-scoring-setting/prompt',
      handler: 'custom-ai-scoring-setting.savePrompt',
    },
  ],
};
