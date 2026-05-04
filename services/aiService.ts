import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, AppSettings, AIProvider } from '../types';
import { logger } from '../utils/logger';

export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Recommended)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
  { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
];

declare global {
  interface Window {
    ai?: {
      languageModel: {
        create: (options?: any) => Promise<any>;
        capabilities: () => Promise<any>;
      };
    };
  }
}

const SYSTEM_PROMPT = `
You are an expert WordPress Architect.
Your goal is to interpret a user's natural language request and generate a structured JSON object representing:
1. WordPress Custom Post Types (CPTs)
2. Taxonomies
3. Custom REST API Endpoints (Routes) mapped to actions/hooks.

The output must strictly follow the JSON schema provided.

Rules:
- Route should be relative (e.g. 'process-form').
- Method should be standard HTTP method.
- callbackFunction should be snake_case.
- hookName should be snake_case.
- Ensure "slugs" are snake_case and "names" are Title Case.
`;

const LOCAL_SYSTEM_PROMPT = `
${SYSTEM_PROMPT}

IMPORTANT: You must output ONLY valid JSON. No markdown, no explanations. 
Response Format:
{
  "postTypes": [],
  "taxonomies": [],
  "customEndpoints": []
}
`;

export const generateStructure = async (prompt: string, currentProject: ProjectState, settings: AppSettings): Promise<Partial<ProjectState>> => {
  logger.info(`Starting generation using provider: ${settings.provider}`);

  try {
    if (settings.provider === AIProvider.CHROME_LOCAL) {
      return await generateWithLocalAI(prompt, currentProject, settings);
    } else {
      return await generateWithGemini(prompt, currentProject, settings);
    }
  } catch (error: any) {
    logger.error('AI Generation Failed', error);
    throw error;
  }
};

const generateWithGemini = async (prompt: string, currentProject: ProjectState, settings: AppSettings) => {
  const apiKey = settings.apiKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in Settings.");
  }

  logger.info(`Initializing Gemini Client with model: ${settings.model}`);
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: settings.model,
    contents: `Current Project: ${currentProject.name}. Request: ${prompt}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: settings.temperature,
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
    throw new Error("Empty response from Gemini");
  }

  logger.success('Gemini response received');
  return processResponse(JSON.parse(response.text));
};

const generateWithLocalAI = async (prompt: string, currentProject: ProjectState, settings: AppSettings) => {
  if (!window.ai) {
    throw new Error("Chrome Built-in AI is not available. Please enable it in chrome://flags.");
  }

  logger.info('Creating Local AI Session...');
  const session = await window.ai.languageModel.create({
    systemPrompt: LOCAL_SYSTEM_PROMPT,
    temperature: settings.temperature,
    topK: 3
  });

  logger.info('Sending prompt to Local AI...');
  const fullPrompt = `
    Project Name: ${currentProject.name}
    Existing CPTs: ${currentProject.postTypes.map(p => p.slug).join(', ')}
    
    User Request: ${prompt}
    
    Return JSON only.
  `;

  const result = await session.prompt(fullPrompt);
  logger.success('Local AI generated response');
  logger.info('Raw Local Output', result);

  // Local AI doesn't guarantee pure JSON, try to extract code block
  let jsonStr = result;
  if (result.includes('```json')) {
    jsonStr = result.split('```json')[1].split('```')[0];
  } else if (result.includes('```')) {
    jsonStr = result.split('```')[1].split('```')[0];
  }

  try {
    const data = JSON.parse(jsonStr.trim());
    return processResponse(data);
  } catch (e) {
    logger.error('Failed to parse Local AI JSON', e);
    throw new Error("Local AI generated invalid JSON. Try simplifying your request.");
  }
};

const processResponse = (data: any): Partial<ProjectState> => {
  logger.info('Processing AI response data...');
  
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

  logger.success(`Generated: ${processedPostTypes.length} CPTs, ${processedEndpoints.length} Endpoints`);
  
  return {
    postTypes: processedPostTypes,
    taxonomies: processedTaxonomies,
    customEndpoints: processedEndpoints
  };
};
