import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

const getUserId = (req: AuthRequest) => {
  return Number(req.user?.userId || req.user?.id);
};

export const getCustomers = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = getUserId(req);

    const customers = await prisma.customer.findMany({
      where: {
        userId,
      },
      orderBy: {
        partyName: "asc",
      },
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

export const createCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = getUserId(req);

    const partyName = String(req.body.partyName || "").trim();
    const gstNo = String(req.body.gstNo || "").trim();

    if (!partyName) {
      return res.status(400).json({
        message: "Party name is required",
      });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        userId,
        OR: [
          {
            partyName: {
              equals: partyName,
              mode: "insensitive",
            },
          },
          ...(gstNo
            ? [
                {
                  gstNo,
                },
              ]
            : []),
        ],
      },
    });

    if (existingCustomer) {
      return res.status(409).json({
        message: "Customer already exists",
      });
    }

    const customer = await prisma.customer.create({
      data: {
        partyName,
        gstNo: gstNo || null,
        userId,
      },
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);

    return res.status(500).json({
      message: "Failed to create customer",
      error,
    });
  }
};

export const updateCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const partyName = String(req.body.partyName || "").trim();
    const gstNo = String(req.body.gstNo || "").trim();

    const customer = await prisma.customer.update({
      where: {
        id,
      },
      data: {
        partyName,
        gstNo: gstNo || null,
      },
    });

    return res.status(200).json(customer);
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);

    return res.status(500).json({
      message: "Failed to update customer",
      error,
    });
  }
};

export const deleteCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete customer",
      error,
    });
  }
};