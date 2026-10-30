const time = () => new Date().toISOString().slice(11, 19);

export const log = {
  info: (...args) => console.log(`[${time()}]`, ...args),
  warn: (...args) => console.warn(`[${time()}] WARN`, ...args),
  error: (...args) => console.error(`[${time()}] ERROR`, ...args),
};
