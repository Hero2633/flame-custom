const { error } = require('./network');

function createLimiter(limit, maxQueue) {
  let active = 0;
  const queue = [];
  async function run(task, signal) {
    if (signal?.aborted) throw error('DEADLINE');
    if (active >= limit) {
      if (queue.length >= maxQueue) throw error('BUSY');
      await new Promise((resolve, reject) => {
        const entry = { resolve: () => { signal?.removeEventListener('abort', abort); resolve(); } };
        const abort = () => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(error('DEADLINE'));
        };
        signal?.addEventListener('abort', abort, { once: true });
        queue.push(entry);
      });
    } else active++;
    try {
      if (signal?.aborted) throw error('DEADLINE');
      return await task();
    } finally {
      if (queue.length) queue.shift().resolve();
      else active--;
    }
  }
  return run;
}

module.exports = { createLimiter };
