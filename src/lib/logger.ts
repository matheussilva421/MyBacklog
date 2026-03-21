/**
 * Logger condicional - apenas em desenvolvimento.
 * Em produção, os logs são silenciados para não poluir o console e não vazar informações.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const NO_OP = () => {};

export const logger = {
  log: IS_PRODUCTION ? NO_OP : console.log.bind(console),
  warn: IS_PRODUCTION ? NO_OP : console.warn.bind(console),
  error: IS_PRODUCTION ? NO_OP : console.error.bind(console),
  info: IS_PRODUCTION ? NO_OP : console.info.bind(console),
  debug: IS_PRODUCTION ? NO_OP : console.debug.bind(console),
};
