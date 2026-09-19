import Product from "../models/Product.js";

const getProduct = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock } = req.body;
    const newProduct = await Product.create({
      name,
      description,
      price,
      stock,
    });

    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        stock,
      },
      {
        returnDocument: "after",
      },
    );

    if (!updatedProduct) {
      res.status(404).json({ message: "Product not found" });
    } else {
      res.status(200).json(updatedProduct);
    }
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
    } else {
      res.status(204).json({ message: "Product deleted" });
    }
  } catch (error) {
    next(error);
  }
};

export { getProduct, createProduct, updateProduct, deleteProduct };
