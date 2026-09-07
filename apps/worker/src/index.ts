import prisma, { ActionStatus, Prisma, WorkflowRunStatus, type ActionExecution } from "@flowbit/db";
import { Kafka } from "kafkajs";
import "dotenv/config"
import type { KafkaActionMessage } from "./types/kafkaActionMessage.js";
import {executor} from "./actions/index.js"
import type { ActionType } from "./actions/actionRegistry.js";
import type { ActionExecutionSchema } from "./types/schema.js";
import { validateConfigFields, type Config } from "./actions/validateConfig.js";
import { resolveTemplate } from "./actions/resolveTemplate.js";

const kafka = new Kafka({
    clientId: "workflow-action-jobs",
    brokers: [process.env.KAFKA_BROKER_URL || "localhost:9092"]
})

const MAX_ATTEMPT = 3;

const consumer = kafka.consumer({groupId: "test"})

const run = async () => {
    const topic = process.env.TOPIC_NAME || "outbox-events";
    //admin to create topic
    const admin = kafka.admin();
    try {
        await admin.connect();
        await admin.createTopics({
            waitForLeaders: true,
            topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        });
    } catch (err) {
        console.warn("Topic check/creation warning:", err);
    } finally {
        await admin.disconnect();
    }

    await consumer.connect();
    await consumer.subscribe({topic: process.env.TOPIC_NAME || "outbox-events", fromBeginning: true})
    
    await consumer.run({
        autoCommit: false,
        eachMessage: async ({message, partition, topic}) => {
            const commit = async () => consumer.commitOffsets([{topic, partition, offset: (Number(message.offset) + 1).toString()}])

            console.log({
                partition,
                value: message.value?.toString(),
                offset: message.offset,
                topic: topic,
            })

            if(!message.value) return;

            const event: KafkaActionMessage = JSON.parse(message.value.toString());

            try {
                const actionExecution = await prisma.actionExecution.findUnique({
                    where: {
                        actionId_workflowRunId: {
                            actionId: event.actionId, 
                            workflowRunId: event.workflowRunId,
                        }
                    },
                    include: {
                        action: {
                            include: {
                                type: true,
                            }
                        }
                    }
                })

                if(!actionExecution) {
                    console.error("No action execution", event);
                    return;
                }

                if(actionExecution.status === ActionStatus.SUCCESS) {
                    console.log(`Step: ${actionExecution.id} already executed -- skipping`);
                    return;
                }

                if(event.retryAttemptCount < actionExecution.retryAttemptCount) {
                    console.error(`Stale redelivery ${actionExecution.id}`);
                    return;
                }

                await prisma.actionExecution.update({
                    data: {
                        status: ActionStatus.RUNNING,
                        lastAttemptedAt: new Date(),
                    },
                    where: {
                        id: actionExecution.id
                    }
                })

                const actionType: ActionType = actionExecution.action.type.name as ActionType;

                try {
                    const output = await executor.executeAction(actionType, actionExecution.inputPayload as Config);

                    handleSuccess(actionExecution, output);
                } catch (err: any) {
                    await handleFailure(actionExecution, err)
                    console.error(err.message || "Unknown error");
                    return;
                }
            } catch (err) {
                console.error("Unhandled error occurred");
                return;
            } 
            await commit();
        }
    })
}

const handleSuccess = async (actionExecution: NonNullable<ActionExecutionSchema>, response: Record<string, unknown>) => {
    await prisma.$transaction(async (tx) => {
        await prisma.actionExecution.update({
            data: {
                status: "SUCCESS",
                outputPayload: response.data as Prisma.InputJsonValue,
                completedAt: new Date(),
            },
            where: {
                id: actionExecution.id,
            }
        })

        const nextAction = await prisma.action.findFirst({
            where: {
                workflowId: actionExecution.action.workflowId,
                order: {
                    gt: actionExecution.action.order,
                }
            },
            include: {
                type: true,
            },
            orderBy: {
                order: "asc"
            }
        })

        if(!nextAction) {
            await prisma.workflowRun.update({
                data: {
                    status: "SUCCESS",
                    completedAt: new Date(),
                    outputPayload: response.data as Prisma.InputJsonValue,
                }, 
                where: {
                    id: actionExecution.workflowRunId
                }
            })
            return;
        }

        // first validate input field
        const output = response.data;
        const triggerPayload = (await tx.workflowRun.findUnique({
            where: {
                id: actionExecution.workflowRunId,
            },
            select: {
                inputPayload: true,
            }
        }))?.inputPayload as (Record<string, unknown> | null);

        resolveTemplate(output as Config, nextAction.configuration as Config, actionExecution.workflowRunId)

        const {success, missingFields, resolvedFieldValues} = validateConfigFields(nextAction.type.metadata as any, output as Config, triggerPayload)

        if(!success) {
            await tx.actionExecution.create({
                data: {
                    actionId: nextAction.id,
                    workflowRunId: actionExecution.workflowRunId,
                    inputPayload: resolvedFieldValues as Prisma.InputJsonValue,
                    error: {"missing fields": missingFields.join(", ")} as Prisma.InputJsonValue,
                    status: ActionStatus.INVALID_PAYLOAD,
                    completedAt: new Date(),
                }
            });

            await tx.workflowRun.update({
                data: {
                    status: WorkflowRunStatus.FAILED,
                    completedAt: new Date(),
                },
                where: {
                    id: actionExecution.workflowRunId,
                }
            });

            return;
        }

        await tx.outbox.create({
            data: {
                actionId: nextAction.id,
                payload: resolvedFieldValues as Prisma.InputJsonValue,
                workflowRunId: actionExecution.workflowRunId,
            }
        })

        await tx.actionExecution.create({
            data: {
                inputPayload: resolvedFieldValues as Prisma.InputJsonValue,
                actionId: nextAction.id,
                workflowRunId: actionExecution.workflowRunId,
            }
        })
    })
}


const handleFailure = async (actionExecution: NonNullable<ActionExecutionSchema>, err: Error) => {
    const nextAttempCount = actionExecution.retryAttemptCount + 1;

    const isRetryable = nextAttempCount < MAX_ATTEMPT;

    await prisma.$transaction(async (tx) => {
        await tx.actionExecution.update({
            data: {
                status: "FAILED",
                error: err.message || "Unknown error",
                retryAttemptCount: nextAttempCount,
                completedAt: new Date(),
            },
            where: {
                actionId_workflowRunId: {
                    actionId: actionExecution.actionId,
                    workflowRunId: actionExecution.workflowRunId,
                }
            }
        })

        if(isRetryable) {
            await tx.outbox.create({
                data: {
                    actionId: actionExecution.actionId,
                    workflowRunId: actionExecution.workflowRunId,
                    retryAttemptCount: nextAttempCount,
                    payload: actionExecution.inputPayload,
                    availableAt: new Date(Date.now() + 5000),
                }
            })
            return;
        }

        await tx.workflowRun.update({
            data: {
                status: "FAILED",
                error: {actionId: actionExecution.actionId, msg: err.message} as Prisma.InputJsonValue,
                completedAt: new Date(),
            },
            where: {
                id: actionExecution.workflowRunId
            }
        })
    })
}

run().catch(console.error);