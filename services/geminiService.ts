import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState } from '../types';

export const generateProjectStructure = async (prompt: string, currentProject: ProjectState): Promise<Partial<ProjectState>> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are an expert WordPress Architect.
    Your goal is to interpret a user's natural language request and generate a structured JSON object representing:
    1. WordPress Custom Post Types (CPTs)
    2. Taxonomies
    3. Custom REST API Endpoints (Routes) mapped to actions/hooks.
    
    The output must strictly follow the schema provided.
    
    For Custom Endpoints:
    - Route should be relative (e.g. 'process-form', 'users/top').
    - Method should be standard HTTP method.
    - callbackFunction should be snake_case.
    - hookName should be snake_case (this is the WP action hook that will be fired).
    - Provide parameters if the route expects input.
    
    For Post Types:
    - Ensure "slugs" are snake_case and "names" are Title Case.
    - Connect Taxonomies to Post Types via the 'connectedPostTypes' or 'taxonomies' fields logic.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Current Project Name: ${currentProject.name}. User Request: ${prompt}`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          postTypes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slug: { type: Type.STRING },
                singularName: { type: Type.STRING },
                pluralName: { type: Type.STRING },
                description: { type: Type.STRING },
                icon: { type: Type.STRING },
                supports: { type: Type.ARRAY, items: { type: Type.STRING } },
                taxonomies: { type: Type.ARRAY, items: { type: Type.STRING } },
                showInRest: { type: Type.BOOLEAN },
                restBase: { type: Type.STRING },
                metaFields: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      label: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['string', 'integer', 'number', 'boolean', 'array'] },
                      description: { type: Type.STRING },
                      required: { type: Type.BOOLEAN },
                      showInRest: { type: Type.BOOLEAN },
                    },
                    required: ['key', 'label', 'type', 'description']
                  }
                }
              },
              required: ['slug', 'singularName', 'pluralName', 'supports', 'metaFields']
            }
          },
          taxonomies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slug: { type: Type.STRING },
                singularName: { type: Type.STRING },
                pluralName: { type: Type.STRING },
                hierarchical: { type: Type.BOOLEAN },
                showInRest: { type: Type.BOOLEAN },
                connectedPostTypes: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['slug', 'singularName', 'pluralName', 'connectedPostTypes']
            }
          },
          customEndpoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                route: { type: Type.STRING },
                method: { type: Type.STRING, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                callbackFunction: { type: Type.STRING },
                description: { type: Type.STRING },
                hookName: { type: Type.STRING },
                parameters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      type: { type: Type.STRING },
                      required: { type: Type.BOOLEAN },
                      description: { type: Type.STRING }
                    },
                    required: ['key', 'type', 'description']
                  }
                }
              },
              required: ['route', 'method', 'callbackFunction']
            }
          }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  const data = JSON.parse(response.text);

  // Post-processing IDs
  const processedPostTypes = data.postTypes?.map((pt: any) => ({
    ...pt,
    id: `cpt_${Math.random().toString(36).substr(2, 9)}`,
    metaFields: pt.metaFields?.map((mf: any) => ({
      ...mf,
      id: `field_${Math.random().toString(36).substr(2, 9)}`,
    })) || []
  })) || [];

  const processedTaxonomies = data.taxonomies?.map((tx: any) => ({
    ...tx,
    id: `tax_${Math.random().toString(36).substr(2, 9)}`
  })) || [];

  const processedEndpoints = data.customEndpoints?.map((ep: any) => ({
    ...ep,
    id: `endpoint_${Math.random().toString(36).substr(2, 9)}`,
    parameters: ep.parameters?.map((p: any) => ({
      ...p,
      id: `param_${Math.random().toString(36).substr(2, 9)}`
    })) || []
  })) || [];

  return {
    postTypes: processedPostTypes,
    taxonomies: processedTaxonomies,
    customEndpoints: processedEndpoints
  };
};
