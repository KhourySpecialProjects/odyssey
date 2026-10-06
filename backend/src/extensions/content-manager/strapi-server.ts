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

  return plugin;
};
