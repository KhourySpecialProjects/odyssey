/* eslint-disable @typescript-eslint/no-explicit-any */
// ODY-699: keep a real `status` attribute working in the content-manager when D&P is off. See docs/agent/backend-architecture.md.

const OWN_STATUS_STATE_KEY = 'ody699OwnStatus';
const OWN_STATUS_CONSUMED_KEY = 'ody699OwnStatusConsumed';
const DIMENSION_STATUSES = ['draft', 'published'];

type AnyFn = (...args: any[]) => any;
type Factory = (deps: { strapi: any }) => Record<string, any>;

export function hasOwnStatus(uid: unknown): boolean {
  if (typeof uid !== 'string') return false;
  const model = (strapi as any).getModel(uid);
  return Boolean(model && !model.options?.draftAndPublish && model.attributes?.status);
}

function requestContext(): any {
  return (strapi as any).requestContext?.get?.();
}

function assertFunctions(owner: string, target: any, names: string[]) {
  for (const name of names) {
    if (typeof target?.[name] !== 'function') {
      throw new Error(`ODY-699 content-manager extension: ${owner}.${name} missing (re-check after Strapi upgrade)`);
    }
  }
}

/** Throws if the content-manager internals we wrap have changed shape. */
export function assertContentManagerShape(plugin: any) {
  for (const name of ['document-metadata', 'document-manager']) {
    assertFunctions('services', plugin?.services, [name]);
  }
  assertFunctions('controllers.collection-types', plugin?.controllers?.['collection-types'], [
    'create',
    'update',
    'clone',
    'autoClone',
  ]);
}

export function wrapDocumentMetadata(factory: Factory): Factory {
  return (deps) => {
    const base = factory(deps);
    assertFunctions('document-metadata', base, ['getStatus', 'formatDocumentWithMetadata']);

    return {
      ...base,
      // List view calls this with no uid, so scope by the request's model.
      getStatus(version: any, others: any) {
        const model = requestContext()?.params?.model;
        if (hasOwnStatus(model) && typeof version?.status === 'string') return version.status;
        return base.getStatus(version, others);
      },
      async formatDocumentWithMetadata(uid: string, document: any, opts?: any) {
        const out = await base.formatDocumentWithMetadata(uid, document, opts);
        if (hasOwnStatus(uid) && typeof document?.status === 'string') {
          out.data.status = document.status;
        }
        return out;
      },
    };
  };
}

/** Swaps a placeholder status for the real one (in place, so `autoClone`'s `this.clone` still works). */
export function wrapCollectionTypesController(controller: Record<string, AnyFn>) {
  assertFunctions('collection-types', controller, ['create', 'update', 'clone']);

  for (const name of ['create', 'update', 'clone']) {
    const original = controller[name];
    controller[name] = async function (this: unknown, ctx: any) {
      const status = ctx.request?.body?.status;
      const model = ctx.params?.model;
      if (typeof status === 'string' && !DIMENSION_STATUSES.includes(status) && hasOwnStatus(model)) {
        const options: string[] = (strapi as any).getModel(model).attributes.status.enum ?? [];
        const placeholder = DIMENSION_STATUSES.find((s) => options.includes(s));
        if (placeholder) {
          ctx.state[OWN_STATUS_STATE_KEY] = status;
          ctx.request.body.status = placeholder;
        }
      }
      const result = await original.call(this, ctx);
      if (ctx.state[OWN_STATUS_STATE_KEY] !== undefined && !ctx.state[OWN_STATUS_CONSUMED_KEY]) {
        const id = ctx.params?.id ?? ctx.params?.sourceId;
        (strapi as any).log.error(
          `ODY-699: status "${ctx.state[OWN_STATUS_STATE_KEY]}" was not restored for ${model} ${id}; saved as placeholder.`
        );
      }
      return result;
    };
  }
}

function restoreStatus(uid: string, data: any) {
  const ctx = requestContext();
  const stashed = ctx?.state?.[OWN_STATUS_STATE_KEY];
  if (stashed === undefined || ctx.params?.model !== uid || !data || !('status' in data)) return data;
  ctx.state[OWN_STATUS_CONSUMED_KEY] = true;
  return { ...data, status: stashed };
}

export function wrapDocumentManager(factory: Factory): Factory {
  return (deps) => {
    const base = factory(deps);
    assertFunctions('document-manager', base, ['create', 'update', 'clone']);

    return {
      ...base,
      create: (uid: string, opts: any = {}) =>
        base.create(uid, { ...opts, data: restoreStatus(uid, opts.data) }),
      update: (id: string, uid: string, opts: any = {}) =>
        base.update(id, uid, { ...opts, data: restoreStatus(uid, opts.data) }),
      clone: (id: string, body: any, uid: string) => base.clone(id, restoreStatus(uid, body), uid),
    };
  };
}
