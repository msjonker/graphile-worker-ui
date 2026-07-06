import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { LiveRefreshProvider } from './lib/live.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import './index.css';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:5001/graphql',
  credentials: 'include',
});

const wsLink = new GraphQLWsLink(
  createClient({ url: import.meta.env.VITE_GRAPHQL_WS_URL || 'ws://localhost:5001/graphql' }),
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all', fetchPolicy: 'cache-and-network' },
    query: { errorPolicy: 'all' },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <LiveRefreshProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster
              position="bottom-right"
              toastOptions={{
                className:
                  '!bg-elevated !text-foreground !border !border-border !rounded-lg !text-sm',
                duration: 3500,
              }}
            />
          </ConfirmProvider>
        </LiveRefreshProvider>
      </ThemeProvider>
    </ApolloProvider>
  </React.StrictMode>,
);
