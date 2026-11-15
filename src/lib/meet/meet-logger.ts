import { logger } from '@/lib/logger';

function formatMeta(metaOrMsg: Record<string, unknown> | string, msg?: string) {
  if (typeof metaOrMsg === 'string') {
    return {
      meta: { domain: 'meet' },
      message: metaOrMsg,
    };
  }
  return {
    meta: { domain: 'meet', ...metaOrMsg },
    message: msg,
  };
}

export const meetLogger = {
  debug: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    const { meta, message } = formatMeta(metaOrMsg, msg);
    logger.debug(meta, message);
  },
  info: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    const { meta, message } = formatMeta(metaOrMsg, msg);
    logger.info(meta, message);
  },
  warn: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    const { meta, message } = formatMeta(metaOrMsg, msg);
    logger.warn(meta, message);
  },
  error: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    const { meta, message } = formatMeta(metaOrMsg, msg);
    logger.error(meta, message);
  },
};

