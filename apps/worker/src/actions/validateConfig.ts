export type Config = Record<string, unknown>
export type RequiredConfig = Record<string, {type: unknown, required: Boolean}>

export const validateConfigFields = (requiredConfig: RequiredConfig, config: Config, triggerPayload: Record<string, unknown> | null): {
    success: Boolean,
    missingFields: string[],
    resolvedFieldValues: Record<string, unknown>,
} => {
    const requiredConfigKeys = Object.keys(requiredConfig || {});

    let missingFields = [];
    let success = true;
    let resolvedFieldValues: Record<string, unknown> = {};

    for(let key of requiredConfigKeys) {

        const value = config[key] ?? triggerPayload?.key;
        if(requiredConfig[key]!.required === true && (value === undefined || value === null)) {
            missingFields.push(key);
            success = false;
        }

        resolvedFieldValues[key] = value;
    }

    return {success, missingFields, resolvedFieldValues}
}