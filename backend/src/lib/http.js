export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function serializeResource(resource) {
  return {
    ...resource,
    unitPrice: Number(resource.unitPrice),
    stockTotal: resource.stockAvailable + resource.stockReserved,
  };
}

export function serializeOrder(order) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };
}
