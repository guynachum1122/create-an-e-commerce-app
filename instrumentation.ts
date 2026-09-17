export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateProductionConfig } = await import('./lib/config');
    validateProductionConfig();
  }

  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DD_API_KEY) {
    const tracer = await import('dd-trace');
    tracer.default.init({
      service: process.env.DD_SERVICE || 'kitchen-me',
      env: process.env.DD_ENV || process.env.NODE_ENV,
      logInjection: true,
    });
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}
