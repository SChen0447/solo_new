import type { OpenApiSpec, ApiEndpoint, Parameter, HttpMethod } from '@/types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

export function parseOpenApiSpec(spec: OpenApiSpec): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];
      if (operation) {
        const parameters: Parameter[] = (operation.parameters || []).map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required || p.in === 'path',
          type: (p.schema as { type?: string })?.type || 'string',
          description: p.description,
        }));

        const responses: Record<string, {
          description: string;
          content?: Record<string, { schema?: unknown; example?: unknown }>;
        }> = {};

        if (operation.responses) {
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            responses[statusCode] = {
              description: response.description,
              content: response.content,
            };
          }
        }

        endpoints.push({
          method,
          path,
          summary: operation.summary || `${method} ${path}`,
          description: operation.description,
          parameters,
          responses,
          requestBody: operation.requestBody,
        });
      }
    }
  }

  return endpoints;
}

export function validateOpenApiSpec(data: unknown): data is OpenApiSpec {
  if (typeof data !== 'object' || data === null) return false;

  const spec = data as Record<string, unknown>;

  if (typeof spec.openapi !== 'string' || !spec.openapi.startsWith('3.')) {
    return false;
  }

  if (typeof spec.info !== 'object' || spec.info === null) {
    return false;
  }

  const info = spec.info as Record<string, unknown>;
  if (typeof info.title !== 'string' || typeof info.version !== 'string') {
    return false;
  }

  if (typeof spec.paths !== 'object' || spec.paths === null) {
    return false;
  }

  return true;
}

export async function loadOpenApiFromFile(file: File): Promise<ApiEndpoint[]> {
  const text = await file.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON 格式');
  }

  if (!validateOpenApiSpec(data)) {
    throw new Error('不是有效的 OpenAPI 3.0 规范');
  }

  return parseOpenApiSpec(data);
}
