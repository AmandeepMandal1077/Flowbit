import prisma from "@flowbit/db"
import { Kafka } from "kafkajs"
import "dotenv/config"

const kafka = new Kafka({
    clientId: "outbox-publisher",
    brokers: [process.env.KAFKA_BROKER_URL || "localhost:9092"]
})

const producer = kafka.producer();

const run = async () => {
    await producer.connect();

    // fetch from outbox
    const records = await prisma.outbox.findMany({
        where: {
            availableAt: {
                lte: new Date(),
            }
        },
        include: {
            workflowRuns: {
                select: {
                    workflow: {
                        select: {
                            userId: true
                        }
                    }
                }
            }
        },
        take: 10,
    })
    const recordsId = records.map((record) => record.id);
    // console.log(recordsId);
    // send to kafka
    await producer.send( {
        topic: process.env.TOPIC_NAME || "outbox-events",
        messages: [
            ...records.map((record) => {
                return {
                    key: record.workflowRuns.workflow.userId,
                    value: JSON.stringify(record),
                }
            })
        ]
    } )

    // remove from outbox
    await prisma.outbox.deleteMany({
        where: {
            id: {
                in: recordsId
            }
        }
    })
}

setInterval(
    () => {
        console.log("Run on: ", new Date())
        run().catch(console.error)
    },
    10000
)