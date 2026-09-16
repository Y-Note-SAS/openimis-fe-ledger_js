/**
 * Normalizes the metadata carried by a mutation action so it can be handed to
 * fe-core's `journalize`: the JournalDrawer polls the mutation log by
 * `clientMutationId` (`id`) and needs a serializable `requestedDateTime`.
 */
export const formatMutationMeta = (meta) => {
  if (!meta) return null;
  return {
    ...meta,
    id: meta.id ?? meta.clientMutationId ?? null,
    requestedDateTime:
      meta.requestedDateTime instanceof Date ? meta.requestedDateTime.toISOString() : meta.requestedDateTime,
  };
};
