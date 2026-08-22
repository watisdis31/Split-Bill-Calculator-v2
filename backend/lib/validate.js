export function readJson(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }
  return { value: body };
}

export function requireString(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string") {
    return `${field} is required`;
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    return `${field} is required`;
  }
  if (trimmed.length > max) {
    return `${field} must be at most ${max} characters`;
  }
  return null;
}

export function parseUsername(value) {
  const error = requireString(value, "Username", { min: 3, max: 50 });
  if (error) return { error };
  const username = value.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "Username may only contain letters, numbers, and underscores" };
  }
  return { value: username };
}

export function parsePassword(value) {
  if (typeof value !== "string" || value.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (value.length > 72) {
    return { error: "Password must be at most 72 characters" };
  }
  return { value };
}

export function parseInteger(value, field, { min = null, max = null, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) return { error: `${field} is required` };
    return { value: 0 };
  }
  if (typeof value !== "number" && typeof value !== "string") {
    return { error: `${field} must be a number` };
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { error: `${field} must be a number` };
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) {
    return { error: `${field} must be an integer` };
  }
  if (min !== null && n < min) {
    return { error: `${field} must be at least ${min}` };
  }
  if (max !== null && n > max) {
    return { error: `${field} must be at most ${max}` };
  }
  return { value: n };
}

export function parseDiscountType(value) {
  if (value === undefined || value === null || value === "") {
    return { value: "PERCENTAGE" };
  }
  if (value !== "PERCENTAGE" && value !== "FIXED") {
    return { error: "Discount type must be PERCENTAGE or FIXED" };
  }
  return { value };
}

export function parseDiscountTiming(value) {
  if (value === undefined || value === null || value === "") {
    return { value: "BEFORE_CHARGES" };
  }
  if (value !== "BEFORE_CHARGES" && value !== "AFTER_CHARGES") {
    return { error: "Discount timing must be BEFORE_CHARGES or AFTER_CHARGES" };
  }
  return { value };
}

export function parseBillPayload(body, { partial = false } = {}) {
  const errors = [];
  const result = {};

  if (!partial || body.billTitle !== undefined || body.title !== undefined) {
    const title = body.billTitle ?? body.title;
    const titleError = requireString(title, "Bill title", { min: 1, max: 200 });
    if (titleError) errors.push(titleError);
    else result.title = title.trim();
  }

  if (!partial || body.billRestaurantName !== undefined || body.restaurantName !== undefined) {
    const restaurantName =
      body.billRestaurantName !== undefined ? body.billRestaurantName : body.restaurantName;
    if (restaurantName === undefined || restaurantName === null || restaurantName === "") {
      result.restaurantName = null;
    } else if (typeof restaurantName !== "string") {
      errors.push("Restaurant name must be a string");
    } else {
      const trimmed = restaurantName.trim();
      if (!trimmed) {
        result.restaurantName = null;
      } else if (trimmed.length > 255) {
        errors.push("Restaurant name must be at most 255 characters");
      } else {
        result.restaurantName = trimmed;
      }
    }
  } else if (!partial) {
    result.restaurantName = null;
  }

  if (!partial || body.currencyId !== undefined || body.BillCurrencyFKId !== undefined) {
    const currency = parseInteger(body.currencyId ?? body.BillCurrencyFKId, "Currency", {
      min: 1,
    });
    if (currency.error) errors.push(currency.error);
    else result.currencyId = currency.value;
  }

  if (!partial || body.tax !== undefined || body.billTax !== undefined) {
    const tax = parseInteger(body.tax ?? body.billTax, "Tax", { min: 0, required: false });
    if (tax.error) errors.push(tax.error);
    else result.tax = tax.value;
  } else if (!partial) {
    result.tax = 0;
  }

  if (!partial || body.service !== undefined || body.billService !== undefined) {
    const service = parseInteger(body.service ?? body.billService, "Service charge", {
      min: 0,
      required: false,
    });
    if (service.error) errors.push(service.error);
    else result.service = service.value;
  } else if (!partial) {
    result.service = 0;
  }

  if (!partial || body.discountType !== undefined || body.billDiscountType !== undefined) {
    const discountType = parseDiscountType(body.discountType ?? body.billDiscountType);
    if (discountType.error) errors.push(discountType.error);
    else result.discountType = discountType.value;
  } else if (!partial) {
    result.discountType = "PERCENTAGE";
  }

  if (!partial || body.discountTiming !== undefined || body.billDiscountTiming !== undefined) {
    const discountTiming = parseDiscountTiming(
      body.discountTiming ?? body.billDiscountTiming
    );
    if (discountTiming.error) errors.push(discountTiming.error);
    else result.discountTiming = discountTiming.value;
  } else if (!partial) {
    result.discountTiming = "BEFORE_CHARGES";
  }

  if (!partial || body.discount !== undefined || body.billDiscount !== undefined) {
    const typeForDiscount = result.discountType || "PERCENTAGE";
    const max = typeForDiscount === "PERCENTAGE" ? 10000 : null;
    const discount = parseInteger(body.discount ?? body.billDiscount, "Discount", {
      min: 0,
      max,
      required: false,
    });
    if (discount.error) errors.push(discount.error);
    else result.discount = discount.value;
  } else if (!partial) {
    result.discount = 0;
  }

  if (errors.length > 0) {
    return { error: errors[0], errors };
  }
  return { value: result };
}

export function parseItemPayload(body, { partial = false } = {}) {
  const errors = [];
  const result = {};

  if (!partial || body.name !== undefined || body.itemName !== undefined) {
    const nameError = requireString(body.name ?? body.itemName, "Item name", {
      min: 1,
      max: 200,
    });
    if (nameError) errors.push(nameError);
    else result.name = (body.name ?? body.itemName).trim();
  }

  if (!partial || body.price !== undefined || body.itemPrice !== undefined) {
    const price = parseInteger(body.price ?? body.itemPrice, "Price", { min: 1 });
    if (price.error) errors.push(price.error);
    else result.price = price.value;
  }

  if (!partial || body.quantity !== undefined || body.itemQuantity !== undefined) {
    const quantity = parseInteger(body.quantity ?? body.itemQuantity, "Quantity", {
      min: 1,
    });
    if (quantity.error) errors.push(quantity.error);
    else result.quantity = quantity.value;
  }

  if (!partial || body.notes !== undefined || body.itemNotes !== undefined) {
    const notes = body.notes ?? body.itemNotes;
    if (notes === undefined || notes === null || notes === "") {
      result.notes = null;
    } else if (typeof notes !== "string") {
      errors.push("Notes must be a string");
    } else if (notes.length > 500) {
      errors.push("Notes must be at most 500 characters");
    } else {
      result.notes = notes.trim() || null;
    }
  } else if (!partial) {
    result.notes = null;
  }

  if (errors.length > 0) {
    return { error: errors[0], errors };
  }
  return { value: result };
}

export function parsePage(searchParams) {
  const page = parseInteger(searchParams.get("page") ?? 1, "page", { min: 1, required: false });
  const limit = parseInteger(searchParams.get("limit") ?? 5, "limit", {
    min: 1,
    max: 50,
    required: false,
  });
  return {
    page: page.error ? 1 : page.value || 1,
    limit: limit.error ? 5 : limit.value || 5,
  };
}

export function parseBillListQuery(searchParams) {
  const { page, limit } = parsePage(searchParams);
  const rawSearch = searchParams.get("search");
  const search =
    typeof rawSearch === "string" ? rawSearch.trim().slice(0, 200) : "";

  const monthParsed = parseInteger(searchParams.get("month"), "Month", {
    min: 1,
    max: 12,
    required: false,
  });
  const yearParsed = parseInteger(searchParams.get("year"), "Year", {
    min: 2000,
    max: 2100,
    required: false,
  });

  const rawRestaurant = searchParams.get("restaurant");
  const restaurant =
    typeof rawRestaurant === "string" ? rawRestaurant.trim().slice(0, 255) : "";

  return {
    page,
    limit,
    search,
    restaurant,
    month: monthParsed.error || !monthParsed.value ? null : monthParsed.value,
    year: yearParsed.error || !yearParsed.value ? null : yearParsed.value,
    sort: searchParams.get("sort") === "asc" ? "asc" : "desc",
  };
}
