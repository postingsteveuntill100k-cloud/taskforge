export class DocsService {
  static getOpenApiSpec(): any {
    return {
      openapi: '3.0.3',
      info: {
        title: 'TaskForge API',
        version: '1.0.0',
        description: 'Autonomous SaaS Task & Project Management REST API Engine',
      },
      servers: [
        {
          url: 'http://localhost:4000/api',
          description: 'Local Production Daemon',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      paths: {
        '/health': {
          get: {
            summary: 'System Health Check',
            responses: {
              '200': { description: 'System is healthy' },
            },
          },
        },
        '/metrics': {
          get: {
            summary: 'Real-time System and Database Metrics',
            responses: {
              '200': { description: 'Process telemetry, memory stats, and table counts' },
            },
          },
        },
        '/auth/register': {
          post: {
            summary: 'Register a new user account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password', 'name'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string', minLength: 6 },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '201': { description: 'User registered successfully with JWT session' },
              '400': { description: 'Invalid input or email already exists' },
            },
          },
        },
        '/auth/login': {
          post: {
            summary: 'Authenticate and receive JWT token',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Authentication successful with JWT' },
              '401': { description: 'Invalid email or password' },
            },
          },
        },
        '/auth/me': {
          get: {
            summary: 'Fetch current authenticated user profile',
            responses: {
              '200': { description: 'User profile' },
              '401': { description: 'Unauthorized' },
            },
          },
        },
        '/projects': {
          get: {
            summary: 'List user workspace projects',
            responses: { '200': { description: 'List of projects' } },
          },
          post: {
            summary: 'Create a new project workspace',
            responses: { '201': { description: 'Project created' } },
          },
        },
        '/projects/import': {
          post: {
            summary: 'Import a complete project bundle (JSON)',
            responses: { '201': { description: 'Project imported successfully' } },
          },
        },
        '/projects/{id}/export': {
          get: {
            summary: 'Export project as complete JSON bundle',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'JSON bundle export' } },
          },
        },
        '/projects/{id}/export/csv': {
          get: {
            summary: 'Export project tasks as CSV file',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'CSV file download' } },
          },
        },
        '/tasks': {
          get: {
            summary: 'List project tasks with optional status and priority filters',
            parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'List of tasks' } },
          },
          post: {
            summary: 'Create a new task',
            responses: { '201': { description: 'Task created' } },
          },
        },
        '/tasks/reorder': {
          post: {
            summary: 'Transactionally reorder tasks in a project',
            responses: { '200': { description: 'Tasks reordered' } },
          },
        },
        '/saved-filters': {
          get: {
            summary: 'List user saved filters',
            responses: { '200': { description: 'Saved filters list' } },
          },
          post: {
            summary: 'Create a new saved filter',
            responses: { '201': { description: 'Filter saved' } },
          },
        },
        '/dashboard': {
          get: {
            summary: 'Fetch executive dashboard analytics',
            parameters: [{ name: 'projectId', in: 'query', schema: { type: 'string' } }],
            responses: { '200': { description: 'Dashboard stats' } },
          },
        },
        '/search': {
          get: {
            summary: 'Server-backed multi-parametric task search',
            parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
            responses: { '200': { description: 'Search results' } },
          },
        },
      },
    };
  }
}
