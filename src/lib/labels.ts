import type {
  AccountType,
  TransactionType,
} from "@/generated/prisma/client";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  SAVINGS: "Ahorros",
  WALLET: "Billetera",
};

export const TX_TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
  TRANSFER: "Transferencia",
};
