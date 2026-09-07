import { Router } from "express";
const router: Router = Router();

router.get("/", async (req, res) => {
    res.status(200).json({
        message: "healthy",
        url: "https://edunode-api.amandeepmandal.me/health",
    })
})

export default router;