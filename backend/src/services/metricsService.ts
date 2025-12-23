import promClient from 'prom-client';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

let defaultMetricsStarted = false;

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const businessMetrics = {
  userRegistrations: new promClient.Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations'
  }),

  investmentsCreated: new promClient.Counter({
    name: 'investments_created_total',
    help: 'Total number of investments created'
  }),

  profitDistributions: new promClient.Counter({
    name: 'profit_distributions_total',
    help: 'Total number of profit distributions'
  }),

  kycSubmissions: new promClient.Counter({
    name: 'kyc_submissions_total',
    help: 'Total number of KYC submissions'
  })
};

const databaseMetrics = {
  queryDuration: new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),

  connectionPoolSize: new promClient.Gauge({
    name: 'database_connection_pool_size',
    help: 'Size of database connection pool'
  }),

  activeConnections: new promClient.Gauge({
    name: 'database_active_connections',
    help: 'Number of active database connections'
  })
};

const cacheMetrics = {
  cacheHits: new promClient.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  }),

  cacheMisses: new promClient.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  }),

  cacheSize: new promClient.Gauge({
    name: 'cache_size',
    help: 'Current size of cache',
    labelNames: ['cache_type']
  })
};

class MetricsService {
  private initialized = false;

  initializeMetrics() {
    if (this.initialized) return;

    // Add a default label which is added to all metrics
    register.setDefaultLabels({
      app: 'investghanahub-backend'
    });

    // Enable the collection of default metrics
    if (!defaultMetricsStarted) {
      promClient.collectDefaultMetrics({ register });
      defaultMetricsStarted = true;
    }

    // Register all metrics
    register.registerMetric(httpRequestDuration);
    register.registerMetric(httpRequestsTotal);
    register.registerMetric(activeConnections);

    // Register business metrics
    Object.values(businessMetrics).forEach(metric => register.registerMetric(metric));

    // Register database metrics
    Object.values(databaseMetrics).forEach(metric => register.registerMetric(metric));

    // Register cache metrics
    Object.values(cacheMetrics).forEach(metric => register.registerMetric(metric));

    this.initialized = true;
    console.log('✅ Prometheus metrics initialized');
  }

  getMetricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      activeConnections.inc();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path || 'unknown';

        httpRequestDuration
          .labels(req.method, route, res.statusCode.toString())
          .observe(duration);

        httpRequestsTotal
          .labels(req.method, route, res.statusCode.toString())
          .inc();

        activeConnections.dec();
      });

      next();
    };
  }

  // Business metrics methods
  incrementUserRegistrations() {
    businessMetrics.userRegistrations.inc();
  }

  incrementInvestmentsCreated() {
    businessMetrics.investmentsCreated.inc();
  }

  incrementProfitDistributions() {
    businessMetrics.profitDistributions.inc();
  }

  incrementKycSubmissions() {
    businessMetrics.kycSubmissions.inc();
  }

  // Database metrics methods
  observeDatabaseQuery(operation: string, table: string, duration: number) {
    databaseMetrics.queryDuration.labels(operation, table).observe(duration);
  }

  setConnectionPoolSize(size: number) {
    databaseMetrics.connectionPoolSize.set(size);
  }

  setActiveDatabaseConnections(count: number) {
    databaseMetrics.activeConnections.set(count);
  }

  // Cache metrics methods
  incrementCacheHits(cacheType: string = 'redis') {
    cacheMetrics.cacheHits.labels(cacheType).inc();
  }

  incrementCacheMisses(cacheType: string = 'redis') {
    cacheMetrics.cacheMisses.labels(cacheType).inc();
  }

  setCacheSize(size: number, cacheType: string = 'redis') {
    cacheMetrics.cacheSize.labels(cacheType).set(size);
  }

  // Get metrics for Prometheus scraping
  async getMetrics() {
    return register.metrics();
  }

  // Get registry for external access
  getRegister() {
    return register;
  }
}

const metricsService = new MetricsService();
export default metricsService;
