import { ReportData } from "../components/ReportTable";

export const reportsData: Record<number, ReportData> = {
  1: {
    customerName: "ABC Corp",
    accountNo: "100200300",
    accountType: "Corporate",
    period: "01/01/2025 - 01/31/2025",
    currency: "USD",
    transactions: [
      { srl: 1, txnDate: "01/01/2025", transCode: "BAL2025", debit: 0, credit: 50000, balance: 50000, remarks: "Opening Balance" },
      { srl: 2, txnDate: "01/15/2025", transCode: "PAY123", debit: -10000, credit: 0, balance: 40000, remarks: "Payment Out" },
    ],
  },
  2: {
    customerName: "XYZ Ltd",
    accountNo: "400500600",
    accountType: "SME",
    period: "01/08/2025 - 01/31/2025",
    currency: "USD",
    transactions: [
      { srl: 1, txnDate: "01/08/2025", transCode: "INC123", debit: 0, credit: 15000, balance: 15000, remarks: "Income" },
      { srl: 2, txnDate: "01/20/2025", transCode: "EXP999", debit: -3000, credit: 0, balance: 12000, remarks: "Expense" },
    ],
  },
  3: {
    customerName: "Cash Flow Summary",
    accountNo: "N/A",
    accountType: "Summary",
    period: "Year 2025",
    currency: "USD",
    transactions: [
      { srl: 1, txnDate: "2025", transCode: "CASHFLOW", debit: -20000, credit: 50000, balance: 30000, remarks: "Net Cash Flow" },
    ],
  },
  4: {
    customerName: "John Doe",
    accountNo: "7000012274478",
    accountType: "Personal",
    period: "2025",
    currency: "ETB",
    transactions: [
      { srl: 1, txnDate: "02/01/2025", transCode: "CUST001", debit: -500, credit: 0, balance: 9500, remarks: "ATM Withdrawal" },
    ],
  },
  5: {
    customerName: "John Doe",
    accountNo: "7000012274478",
    accountType: "Personal",
    period: "2025",
    currency: "ETB",
    transactions: [
      { srl: 1, txnDate: "01/05/2025", transCode: "TRX001", debit: 0, credit: 2000, balance: 2000, remarks: "Deposit" },
      { srl: 2, txnDate: "01/10/2025", transCode: "TRX002", debit: -1000, credit: 0, balance: 1000, remarks: "Purchase" },
    ],
  },
  6: {
    customerName: "Fraud Detection Report",
    accountNo: "N/A",
    accountType: "Analytics",
    period: "2025",
    currency: "ETB",
    transactions: [
      { srl: 1, txnDate: "03/01/2025", transCode: "FRAUD001", debit: -10000, credit: 0, balance: -10000, remarks: "Suspicious Transfer" },
    ],
  },
  7: {
    customerName: "Credit Exposure",
    accountNo: "N/A",
    accountType: "Risk",
    period: "2025",
    currency: "USD",
    transactions: [
      { srl: 1, txnDate: "2025", transCode: "CRED001", debit: -50000, credit: 0, balance: -50000, remarks: "Overdraft Risk" },
    ],
  },
};
