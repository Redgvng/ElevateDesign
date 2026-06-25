# Contrats API

## Style

API JSON REST pour le MVP. Les jobs longs sont asynchrones.

Base path:

```txt
/api
```

## Projects

### Create project

```http
POST /api/projects
Content-Type: application/json
```

```json
{
  "name": "My Product"
}
```

Réponse:

```json
{
  "project": {
    "id": "proj_123",
    "name": "My Product",
    "slug": "my-product",
    "createdAt": "2026-06-17T10:00:00.000Z",
    "updatedAt": "2026-06-17T10:00:00.000Z",
    "defaultDesignSystemId": null
  }
}
```

### List projects

```http
GET /api/projects
```

### Get project

```http
GET /api/projects/:projectId
```

## Screens

### List screens

```http
GET /api/projects/:projectId/screens
```

### Get screen

```http
GET /api/screens/:screenId
```

### Set current version

```http
POST /api/screens/:screenId/current-version
Content-Type: application/json
```

```json
{
  "screenVersionId": "ver_123"
}
```

## Generation jobs

### Generate screen

```http
POST /api/projects/:projectId/generation-jobs
Content-Type: application/json
```

```json
{
  "type": "generate_screen",
  "prompt": "Create a dense SaaS monitoring dashboard",
  "deviceType": "desktop",
  "mode": "quality"
}
```

Réponse:

```json
{
  "job": {
    "id": "job_123",
    "status": "queued"
  }
}
```

### Edit screen

```json
{
  "type": "edit_screen",
  "screenId": "screen_123",
  "baseVersionId": "ver_123",
  "prompt": "Make it more compact and reduce the marketing feel",
  "mode": "quality"
}
```

### Generate variants

```json
{
  "type": "generate_variants",
  "screenId": "screen_123",
  "baseVersionId": "ver_123",
  "prompt": "Explore denser layouts",
  "variantCount": 3,
  "aspects": ["layout", "color_scheme", "typography"],
  "creativeRange": "explore"
}
```

### Get job

```http
GET /api/generation-jobs/:jobId
```

Réponse:

```json
{
  "job": {
    "id": "job_123",
    "status": "completed",
    "type": "generate_screen",
    "result": {
      "screenId": "screen_123",
      "screenVersionId": "ver_123"
    },
    "error": null
  }
}
```

## Canvas

### Get canvas

```http
GET /api/projects/:projectId/canvas
```

### Update canvas

```http
PUT /api/projects/:projectId/canvas
Content-Type: application/json
```

```json
{
  "revision": 12,
  "nodes": [],
  "edges": [],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

Réponse `409` si la révision reçue n'est plus la révision courante:

```json
{
  "error": {
    "code": "CANVAS_CONFLICT",
    "message": "Canvas changed since it was loaded"
  },
  "canvas": {
    "revision": 13,
    "nodes": [],
    "edges": [],
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    }
  }
}
```

## Design systems

### Get design system

```http
GET /api/projects/:projectId/design-system
```

### Update DESIGN.md

```http
PUT /api/projects/:projectId/design-system
Content-Type: application/json
```

```json
{
  "name": "Default",
  "designMd": "# Design System\n..."
}
```

## Exports

### Create export

```http
POST /api/exports
Content-Type: application/json
```

```json
{
  "screenVersionId": "ver_123",
  "format": "html",
  "options": {
    "inlineCss": true,
    "includeAssets": true
  }
}
```

## Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "DesignSpec root node is missing",
    "details": {
      "path": "designSpec.root"
    }
  }
}
```

## Error codes

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `JOB_FAILED`
- `AI_PROVIDER_ERROR`
- `RENDER_ERROR`
- `EXPORT_ERROR`
- `RATE_LIMITED`
- `UNAUTHORIZED`
