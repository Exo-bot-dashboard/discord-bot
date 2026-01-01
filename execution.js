// Timeout wrapper for all operations
async function safeExecute(promise, timeoutMs = 2500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    ),
  ]).catch(error => {
    console.error('⚠️ Operation timed out or failed:', error.message);
    return null;
  });
}

module.exports = { safeExecute };
