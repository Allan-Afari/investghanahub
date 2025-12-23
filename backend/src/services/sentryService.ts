import * as Sentry from '@sentry/node';

// Sentry configuration for error tracking and performance monitoring
export const initializeSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!dsn) {
    console.warn('SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      // HTTP integration for tracing
      Sentry.httpIntegration({ tracing: true }),
      // Console integration for logging
      Sentry.consoleIntegration(),
      // Native integrations for uncaught exceptions
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in production, 100% in development

    // Error tracking
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.request?.data) {
        // Remove sensitive fields from request data
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        const data = event.request.data;

        if (typeof data === 'object') {
          sensitiveFields.forEach(field => {
            if (data[field]) {
              data[field] = '[FILTERED]';
            }
          });
        }
      }

      return event;
    },

    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
  });

  console.log(`✅ Sentry initialized for ${environment} environment`);
};

// Error capture helper functions
export const captureError = (error: Error, context?: any) => {
  Sentry.withScope(scope => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: any) => {
  Sentry.withScope(scope => {
    scope.setLevel(level);
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureMessage(message);
  });
};

// Performance monitoring helpers
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export const setUser = (user: { id: string; email?: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

export const setContext = (key: string, context: any) => {
  Sentry.setContext(key, context);
};

// Graceful shutdown
export const closeSentry = async () => {
  await Sentry.close(2000); // Wait up to 2 seconds
};

export default Sentry;
