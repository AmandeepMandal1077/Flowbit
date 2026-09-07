export type ActionExecutionSchema = ({
    action: {
        type: {
            id: number;
            name: string;
            description: string;
            metadata: JsonValue;
        };
    } & {
        id: number;
        order: number;
        configuration: JsonValue;
        workflowId: string;
        availableActionId: number;
    };
} & {
    id: number;
    status: ActionStatus;
    inputPayload: JsonValue;
    outputPayload: JsonValue | null;
    error: JsonValue | null;
    retryAttemptCount: number;
    startedAt: Date;
    lastAttemptedAt: Date | null;
    completedAt: Date | null;
    actionId: number;
    workflowRunId: number;
}) | null