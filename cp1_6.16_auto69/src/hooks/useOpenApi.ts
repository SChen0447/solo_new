import { useCallback } from 'react';
import type { ApiEndpoint } from '@/types';
import { loadOpenApiFromFile } from '@/utils/openapiParser';
import { useAppStore } from '@/store/useAppStore';

export function useOpenApi() {
  const apiEndpoints = useAppStore((state) => state.apiEndpoints);
  const setApiEndpoints = useAppStore((state) => state.setApiEndpoints);
  const setDocumentContent = useAppStore((state) => state.setDocumentContent);
  const documentContent = useAppStore((state) => state.documentContent);

  const importSpec = useCallback(async (file: File): Promise<ApiEndpoint[]> => {
    const endpoints = await loadOpenApiFromFile(file);
    setApiEndpoints(endpoints);
    return endpoints;
  }, [setApiEndpoints]);

  const insertApiToDocument = useCallback(() => {
    const { generateApiMarkdown } = require('@/utils/markdownUtils');
    const apiMarkdown = generateApiMarkdown(apiEndpoints);
    setDocumentContent(documentContent + apiMarkdown);
  }, [apiEndpoints, documentContent, setDocumentContent]);

  const clearEndpoints = useCallback(() => {
    setApiEndpoints([]);
  }, [setApiEndpoints]);

  return {
    apiEndpoints,
    importSpec,
    insertApiToDocument,
    clearEndpoints,
    hasEndpoints: apiEndpoints.length > 0,
  };
}
