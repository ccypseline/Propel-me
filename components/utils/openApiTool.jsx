/**
 * OpenAPI Tool Generator
 * Converts OpenAPI definitions into Agent Tool Configurations on the fly.
 */
export class OpenAPIToolHelper {
    static async fetchSpec(url) {
        const response = await fetch(url);
        return await response.json();
    }

    static parseSpecToTools(spec) {
        const tools = [];
        const baseUrl = spec.servers?.[0]?.url || '';

        for (const [path, methods] of Object.entries(spec.paths)) {
            for (const [method, operation] of Object.entries(methods)) {
                if (operation.operationId) {
                    tools.push({
                        name: operation.operationId,
                        description: operation.summary || operation.description || `Call ${method} ${path}`,
                        parameters: this._extractParameters(operation),
                        execute: async (args) => {
                            // In a real implementation, this would make the actual fetch call
                            // For now, it returns the config to be used by the agent
                            return { url: `${baseUrl}${path}`, method, args };
                        }
                    });
                }
            }
        }
        return tools;
    }

    static _extractParameters(operation) {
        // Simplified extraction - normally needs complex schema parsing
        const props = {};
        const required = [];

        // Handle 'parameters' array (query/path)
        operation.parameters?.forEach(param => {
            props[param.name] = { 
                type: param.schema?.type || 'string',
                description: param.description
            };
            if (param.required) required.push(param.name);
        });

        // Handle requestBody
        if (operation.requestBody) {
            const schema = operation.requestBody.content?.['application/json']?.schema;
            if (schema && schema.properties) {
                Object.entries(schema.properties).forEach(([key, val]) => {
                    props[key] = { type: val.type, description: val.description };
                });
                if (schema.required) required.push(...schema.required);
            }
        }

        return {
            type: "object",
            properties: props,
            required: required
        };
    }
}