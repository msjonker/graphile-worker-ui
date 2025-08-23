import express from 'express';
import { postgraphile } from 'postgraphile';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import PgAggregatesPlugin from '@graphile/pg-aggregates';


const app = express();
const port = process.env.PORT || 5001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Database connection
const databaseUrl = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

// Custom plugin to add job management functions
const JobManagementPlugin = (builder) => {
  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const { extend } = build;
    
    if (context.scope.isRootMutation) {
      return extend(fields, {
        // Retry job mutation
        retryJob: {
          type: build.graphql.GraphQLBoolean,
          args: {
            jobId: {
              type: new build.graphql.GraphQLNonNull(build.graphql.GraphQLString),
            },
          },
          resolve: async (parent, args, context, resolveInfo) => {
            const { pgClient } = context;
            try {
              await pgClient.query(
                'SELECT graphile_worker.reschedule_jobs($1::bigint[], NOW())',
                [[args.jobId]]
              );
              return true;
            } catch (error) {
              console.error('Error retrying job:', error);
              return false;
            }
          },
        },
        
        // Cancel job mutation
        cancelJob: {
          type: build.graphql.GraphQLBoolean,
          args: {
            jobId: {
              type: new build.graphql.GraphQLNonNull(build.graphql.GraphQLString),
            },
          },
          resolve: async (parent, args, context, resolveInfo) => {
            const { pgClient } = context;
            try {
              await pgClient.query(
                'SELECT graphile_worker.permanently_fail_jobs($1::bigint[], $2)',
                [[args.jobId], 'Cancelled by user']
              );
              return true;
            } catch (error) {
              console.error('Error cancelling job:', error);
              return false;
            }
          },
        },
        
        // Complete job mutation
        completeJob: {
          type: build.graphql.GraphQLBoolean,
          args: {
            jobId: {
              type: new build.graphql.GraphQLNonNull(build.graphql.GraphQLString),
            },
          },
          resolve: async (parent, args, context, resolveInfo) => {
            const { pgClient } = context;
            try {
              await pgClient.query(
                'SELECT graphile_worker.complete_jobs($1::bigint[])',
                [[args.jobId]]
              );
              return true;
            } catch (error) {
              console.error('Error completing job:', error);
              return false;
            }
          },
        },
      });
    }
    
    return fields;
  });
};

// PostGraphile configuration
const postgraphileOptions = {
  subscriptions: true,
  watchPg: true,
  dynamicJson: true,
  setofFunctionsContainNulls: false,
  ignoreRBAC: false,
  showErrorStack: 'json',
  extendedErrors: ['hint', 'detail', 'errcode'],
  appendPlugins: [JobManagementPlugin, PgAggregatesPlugin.default],
  exportGqlSchemaPath: 'tmp/schema.graphql',
  graphiql: true,
  enhanceGraphiql: true,
  allowExplain: true,
  enableQueryBatching: true,
  legacyRelations: 'omit',
  pgSettings: {
    search_path: 'graphile_worker,public',
  },
  // Only expose graphile_worker schema
  schemas: ['graphile_worker'],
  // Include the jobs view and management functions
  includeExtensionResources: true,
};

// Create PostGraphile middleware
const postgraphileMiddleware = postgraphile(
  databaseUrl,
  'graphile_worker',
  postgraphileOptions
);

app.use(postgraphileMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server,
  path: '/graphql',
});

// Use the server for GraphQL subscriptions
useServer(
  {
    schema: postgraphileMiddleware.getGraphQLSchema(),
    context: (ctx) => ({
      pgPool: postgraphileMiddleware.pgPool,
    }),
  },
  wsServer
);

server.listen(port, () => {
  console.log(`🚀 Graphile Worker Backend running at http://localhost:${port}`);
  console.log(`📊 GraphiQL available at http://localhost:${port}/graphiql`);
  console.log(`🔌 WebSocket subscriptions available at ws://localhost:${port}/graphql`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
