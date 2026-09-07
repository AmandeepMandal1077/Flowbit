import type { Config } from "./validateConfig.js"
import _ from "lodash"
import prisma from "@flowbit/db"

const resolveTemplate = async (inputPayload: Config, configuration: Config, workflowRunId: number) => {
    for(const [path, value] of Object.entries(configuration)) {
        const match = (value as string).match(/^\{\{\s*(.*?)\s*\}\}$/);
        if(match) {
            const val = match?.[1];
            if(!val) continue;

            const actionId = val.split(".")[0];
            if(!actionId) continue
            const valuePath = val.slice(val.lastIndexOf(actionId + ".") + 1);

            const actionPayload = await prisma.actionExecution.findUnique({
                where: {
                    actionId_workflowRunId: {
                        actionId: parseInt(actionId),
                        workflowRunId: workflowRunId,
                    }
                },
                select: {
                    inputPayload: true,
                    outputPayload: true,
                }
            });

            if(!actionPayload) continue;

            const payload = {
                input: actionPayload.inputPayload,
                output: actionPayload.outputPayload,
            }

            const actionValue = _.get(payload, valuePath, undefined);

            _.set(inputPayload, path, actionValue);
        } else {
            _.set(inputPayload, path, value)
        }
    }
}

export {resolveTemplate}