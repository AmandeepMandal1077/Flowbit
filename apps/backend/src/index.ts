import prisma from "@flowbit/db"
import express from "express"

const app = express();

app.get("/api/v1/health", async (req, res) => {
    res.status(200).json({
        message: {
            "health": "ok"
        }
    })
})

app.listen(3000, () => {
    console.log("Server listening on port 3000");
});