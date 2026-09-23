import Sale from "../models/Sale";

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
    } else {
      res.status(200).json(sale);
    }
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const { client, products } = req.body;

    let discount = 0;
    if (client.purchases >= 1 && client.purchases <= 3) {
      discount = 0.05;
    } else if (client.purchases >= 4 && client.purchases <= 7) {
      discount = 0.1;
    } else if (client.purchases >= 8) {
      discount = 0.15;
    }

    let subtotal = 0;
    for (let i = 0; i < products.length; i++) {
      subtotal += products[i].price * products[i].quantity;
    }

    const total_price = parseFloat((subtotal - subtotal * discount).toFixed(2));

    const newSale = await Sale.create({
      client,
      products,
      discount,
      total_price,
    });

    await newSale.populate("client");
    await newSale.populate("products.product");

    res.status(201).json(newSale);
  } catch (error) {
    next(error);
  }
};
