export type Config = Record<string, unknown>

export const validateConfigFields = (requiredConfig: Config, config: Config) => {
    const requiredConfigKeys = Object.keys(requiredConfig || {});

    // todo: first check if field is required, if yes, than check if it's present or not
    return requiredConfigKeys.every((key) => {
        const value = config[key];
        return value !== undefined && value !== null;
    });
}