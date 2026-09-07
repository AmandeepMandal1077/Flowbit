import { HttpRequestConfig, makeHttpRequest } from "./httpRequest.action.js";
import type { RequiredConfig } from "./validateConfig.js";

export type ActionType = 
    | "HTTP_REQUEST";

const actions: Record<ActionType, {execute: (payload: any) => Promise<Record<string, unknown>>, validation: RequiredConfig}> = {
    HTTP_REQUEST: {
        execute: makeHttpRequest,
        validation: HttpRequestConfig,
    }
}

export default actions