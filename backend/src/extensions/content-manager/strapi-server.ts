/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  assertContentManagerShape,
  wrapCollectionTypesController,
  wrapDocumentManager,
  wrapDocumentMetadata,
} from './own-status';

// ODY-699: real `status` attribute on droplet/voyage (D&P off) vs the content-manager's computed status.
export default (plugin: any) => {
  assertContentManagerShape(plugin);

  plugin.services['document-metadata'] = wrapDocumentMetadata(plugin.services['document-metadata']);
  plugin.services['document-manager'] = wrapDocumentManager(plugin.services['document-manager']);
  wrapCollectionTypesController(plugin.controllers['collection-types']);

  // Services are lazy; resolving them after bootstrap runs the shape checks at startup.
  const originalBootstrap = plugin.bootstrap;
  plugin.bootstrap = async (...args: any[]) => {
    const result = await originalBootstrap?.(...args);
    for (const name of ['document-metadata', 'document-manager']) {
      (strapi as any).plugin('content-manager').service(name);
    }
    return result;
  };

  return plugin;
};
