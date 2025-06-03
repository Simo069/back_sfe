// config/keycloak.js
const session = require('express-session');
const Keycloak = require('keycloak-connect');

// Session configuration
const memoryStore = new session.MemoryStore();

const keycloakConfig = {
  realm: 'realmsfe',
  'auth-server-url': 'http://localhost:4000/',
  'ssl-required': 'external',
  resource: 'sfeclient',
  'public-client': false,
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET, // Get this from Keycloak admin console
  },
  'use-resource-role-mappings': true,
  'confidential-port': 0
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

module.exports = {
  keycloak,
  memoryStore,
  keycloakConfig
};