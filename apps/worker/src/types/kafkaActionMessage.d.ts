export type KafkaActionMessage = {
    workflowRuns: {
        workflow: {
            id: string;
            userId: string;
        };
    };

    id: number;
    retryAttemptCount: number;
    actionId: number;
    payload: JsonValue;
    workflowRunId: number;
    availableAt: Date;
}