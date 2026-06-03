146,149c\
export function encryptConfig(config: Record<string, unknown>, secret: string): string {\
  const enrichedConfig: Record<string, unknown> = {\
    ...config,\
    _meta: {\
      version: 2,\
      createdAt: Date.now(),\
    },\
  };\
  const json = JSON.stringify(enrichedConfig);\
  return encrypt(json, secret);\
