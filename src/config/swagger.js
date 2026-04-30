const swaggerJsdoc = require('swagger-jsdoc');

const servers = [
    {
        url: 'http://localhost:5000/api/v1',
        description: 'Local development server'
    },
    {
        url: 'https://immodest-courthouse.outray.app/api/v1',
        description: 'Staging server'
    },
    {
        url: 'https://dev.jaaiye.com/api/v1',
        description: 'Dev server'
    },
    {
        url: 'https://api.jaaiye.com/api/v1',
        description: 'Production server'
    }
];

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Jaaiye API Documentation',
            version: '1.0.0',
            description: `API documentation for Jaaiye mobile and web applications.

### 🌐 WebSocket Infrastructure (Socket.io)
Connect using **Socket.io v4+** at the base URL (e.g., \`https://api.jaaiye.com\`).

**🔒 Authentication (Mandatory)**: 
You MUST provide a valid JWT access token. Connections without a token or with an invalid/expired token will be rejected.
- **Option 1 (Recommended)**: Pass via \`auth\` object: \`{ auth: { token: "YOUR_JWT" } }\`
- **Option 2**: Pass via query string: \`?token=YOUR_JWT\`

Once authenticated, you are automatically joined to your private room (\`userId\`).

---

#### 📣 **Group Module Events**
- **\`GROUP_MEMBER_ADDED\`** (Personal): Sent to a user when they are added to a group.
- **\`GROUP_MEMBER_LIST_UPDATED\`** (Room): Sent to the group room when someone joins.
- **\`GROUP_MEMBER_REMOVED\`** (Personal/Room): Sent when a user leaves or is kicked.
- **\`GROUP_EVENT_CREATED\`** (Personal/Room): Sent when a hangout/event is added to a group.

#### 🤝 **Social & Friendship Events**
- **\`FRIEND_REQUEST_RECEIVED\`** (Personal): Alert when a new request arrives.
- **\`FRIEND_REQUEST_ACCEPTED\`** (Personal): Trigger for real-time list updates.
- **\`FRIEND_ADDED\`** (Personal): Broad alert for new bidirectional friendship.

#### 🎭 **Event & Discovery Events**
- **\`EVENT_CREATED\`** (Broadcast): Sent to ALL users when a new public event is published.
- **\`EVENT_UPDATED\`** (Room): Sent to watchers in the \`event_\${id}\` room.
- **\`HANGOUT_INVITATION\`** (Personal): Targeted invite for private hangouts.

#### 📡 **Client → Server Handlers**
- **\`join_group\`**: Join a specific group update stream.
- **\`leave_group\`**: Leave a group stream.
- **\`join_event\`**: Join a specific event update stream.
- **\`leave_event\`**: Leave an event stream.`,
            contact: {
                name: 'Jaaiye Support',
                email: 'support@jaaiye.com'
            }
        },
        servers,
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                        traceId: { type: 'string' }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string' },
                        fullName: { type: 'string' },
                        role: { type: 'string' },
                        profilePicture: { type: 'string' }
                    }
                },
                RegisterDTO: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        username: { type: 'string' },
                        fullName: { type: 'string' },
                        password: { type: 'string', minLength: 6 }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    // Paths to files containing OpenAPI definitions
    apis: ['./src/modules/**/*.js', './src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
