import Product from "../models/Product.js";
import HttpError from "../utils/HttpError.js";

const getProduct = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock } = req.body;

    const newProduct = await Product.create({ name, description, price, stock });

    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;

    // Only overwrite fields the caller actually sent. Passing `undefined` for an
    // omitted key would otherwise unset a value the admin never intended to
    // touch (e.g. a price-only edit blanking the description).
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) updates.stock = stock;

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      // `new` returns the post-update document. `runValidators` is the important
      // one: without it findByIdAndUpdate bypasses the schema entirely, so
      // `min: 0` was not enforced and PUT could write a negative price or stock.
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      throw new HttpError(404, "Product not found", { code: "PRODUCT_NOT_FOUND" });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      throw new HttpError(404, "Product not found", { code: "PRODUCT_NOT_FOUND" });
    }

    // 204 must not carry a body — the previous version sent JSON with a 204, which
    // Express strips, leaving a confusing empty response. Return the deleted
    // product with 200 so the admin UI can confirm what went away.
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export { getProduct, createProduct, updateProduct, deleteProduct };
