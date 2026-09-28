/**
 * Some mutation failures are raised by the module itself (see `actions.js`),
 * where no `intl` object is available: they travel as translation ids and are
 * resolved here, while backend messages (free text) are rendered verbatim.
 */
export const mutationMessage = (intl, message) =>
  message ? intl.formatMessage({ id: message, defaultMessage: message }) : message;
