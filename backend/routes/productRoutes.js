import express from "express";
import { getAllProducts, createProduct } from "../controllers/productController.js";
import { authJwt } from "../middlewares/index.js";

const router = express.Router();

router.use(authJwt.verifyToken);
router.get("/", getAllProducts);
router.post("/", [authJwt.verifyToken, authJwt.hasRoles("admin", "moderator")], createProduct);

export default router;