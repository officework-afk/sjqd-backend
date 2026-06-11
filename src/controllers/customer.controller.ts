import { Request, Response } from "express";
import prisma from "../config/db";

export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { partyName: "asc" },
    });

    return res.status(200).json(customers);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch customers",
      error,
    });
  }
};