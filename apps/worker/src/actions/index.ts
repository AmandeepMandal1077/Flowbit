import actions, { type ActionType } from "./actionRegistry.js";
import { validateConfigFields, type Config } from "./validateConfig.js";

class ExecuteAction {
    executeAction = async (k: ActionType, payload: Config) => {
        if(!actions[k]) {
            throw new Error("Unknown action");
        }

        const {execute, validation} = actions[k];

        const {success, resolvedFieldValues} = validateConfigFields(validation, payload, null);
        if(!success) {
            throw new Error("Unknown payload type");
        }

        return await execute(resolvedFieldValues)
    }
}

const executor = new ExecuteAction();

export {
    executor
}