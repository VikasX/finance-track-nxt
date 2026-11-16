// Generated writable-field metadata from openapi.json.
export const writeContracts = {
  "/api/transactions": {
    required: ["description", "amount", "transaction_type", "transaction_date"],
    fields: {
      description: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Description",
      },
      amount: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Amount",
      },
      transaction_type: {
        type: "string",
        enum: ["income", "expense", "investment", "loan_payment", "transfer"],
        title: "Transaction Type",
      },
      transaction_date: {
        type: "string",
        format: "date",
        title: "Transaction Date",
      },
      category_id: {
        anyOf: [
          {
            type: "integer",
            exclusiveMinimum: 0,
          },
          {
            type: "null",
          },
        ],
        title: "Category Id",
      },
      reference_code: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Reference Code",
      },
      payment_method: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Payment Method",
      },
      notes: {
        anyOf: [
          {
            type: "string",
            maxLength: 2000,
          },
          {
            type: "null",
          },
        ],
        title: "Notes",
      },
    },
  },
  "/api/categories": {
    required: ["name", "type"],
    fields: {
      name: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Name",
      },
      type: {
        type: "string",
        enum: ["income", "expense", "investment", "loan_payment"],
        title: "Type",
      },
    },
  },
  "/api/budgets": {
    required: ["category_id", "budget_month", "limit_amount"],
    fields: {
      category_id: {
        type: "integer",
        exclusiveMinimum: 0,
        title: "Category Id",
      },
      budget_month: {
        type: "string",
        format: "date",
        title: "Budget Month",
      },
      limit_amount: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Limit Amount",
      },
    },
  },
  "/api/loans": {
    required: [
      "loan_name",
      "loan_type",
      "principal",
      "outstanding_balance",
      "interest_rate",
      "tenure_months",
      "monthly_emi",
      "start_date",
    ],
    fields: {
      loan_name: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Loan Name",
      },
      loan_type: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Loan Type",
      },
      principal: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Principal",
      },
      outstanding_balance: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Outstanding Balance",
      },
      interest_rate: {
        anyOf: [
          {
            type: "number",
            maximum: 100,
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Interest Rate",
      },
      tenure_months: {
        type: "integer",
        maximum: 1200,
        minimum: 1,
        title: "Tenure Months",
      },
      monthly_emi: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Monthly Emi",
      },
      start_date: {
        type: "string",
        format: "date",
        title: "Start Date",
      },
      account_reference: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Account Reference",
      },
      next_due_date: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
        title: "Next Due Date",
      },
      status: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Status",
        default: "active",
      },
    },
  },
  "/api/investments": {
    required: [
      "asset_type",
      "name",
      "quantity",
      "average_buy_price",
      "current_price",
    ],
    fields: {
      asset_type: {
        type: "string",
        enum: ["stock", "mutual_fund"],
        title: "Asset Type",
      },
      name: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Name",
      },
      quantity: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Quantity",
      },
      average_buy_price: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Average Buy Price",
      },
      current_price: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Current Price",
      },
      symbol: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Symbol",
      },
      purchase_date: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
        title: "Purchase Date",
      },
      monthly_sip: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Monthly Sip",
        default: "0",
      },
      next_sip_date: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
        title: "Next Sip Date",
      },
    },
  },
  "/api/fixed-deposits": {
    required: [
      "bank_name",
      "principal",
      "interest_rate",
      "start_date",
      "maturity_date",
    ],
    fields: {
      bank_name: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Bank Name",
      },
      principal: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Principal",
      },
      interest_rate: {
        anyOf: [
          {
            type: "number",
            maximum: 100,
            minimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Interest Rate",
      },
      start_date: {
        type: "string",
        format: "date",
        title: "Start Date",
      },
      maturity_date: {
        type: "string",
        format: "date",
        title: "Maturity Date",
      },
      fd_reference: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Fd Reference",
      },
      compounding_frequency: {
        anyOf: [
          {
            type: "string",
            enum: ["monthly", "quarterly", "half_yearly", "annually", "simple"],
          },
          {
            type: "null",
          },
        ],
        title: "Compounding Frequency",
        default: "quarterly",
      },
      status: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Status",
        default: "active",
      },
    },
  },
  "/api/ppf/{record_id}/contributions": {
    required: ["amount", "contribution_date"],
    fields: {
      amount: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Amount",
      },
      contribution_date: {
        type: "string",
        format: "date",
        title: "Contribution Date",
      },
      reference_code: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Reference Code",
      },
    },
  },
  "/api/ppf": {
    required: ["opening_date", "maturity_date"],
    fields: {
      opening_date: {
        type: "string",
        format: "date",
        title: "Opening Date",
      },
      maturity_date: {
        type: "string",
        format: "date",
        title: "Maturity Date",
      },
      account_reference: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Account Reference",
      },
      bank_name: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Bank Name",
      },
      opening_balance: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Opening Balance",
        default: "0",
      },
      current_balance: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Current Balance",
        default: "0",
      },
      interest_rate: {
        anyOf: [
          {
            type: "number",
            maximum: 100,
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Interest Rate",
      },
    },
  },
  "/api/savings-goals": {
    required: ["name", "target_amount"],
    fields: {
      name: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Name",
      },
      target_amount: {
        anyOf: [
          {
            type: "number",
            exclusiveMinimum: 0,
          },
          {
            type: "string",
          },
        ],
        title: "Target Amount",
      },
      saved_amount: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Saved Amount",
        default: "0",
      },
      target_date: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
        title: "Target Date",
      },
    },
  },
  "/api/reminders": {
    required: ["title", "due_date"],
    fields: {
      title: {
        type: "string",
        maxLength: 200,
        minLength: 1,
        title: "Title",
      },
      due_date: {
        type: "string",
        format: "date",
        title: "Due Date",
      },
      amount: {
        anyOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        title: "Amount",
      },
      reminder_type: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Reminder Type",
        default: "bill",
      },
      status: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
            minLength: 1,
          },
          {
            type: "null",
          },
        ],
        title: "Status",
        default: "pending",
      },
    },
  },
} as const;
