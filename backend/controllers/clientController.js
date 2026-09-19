import Client from "../models/Client.js";

const getClient = async (req, res, next) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);

    if (!client) {
      res.status(404).json({ message: "Client not found" });
    } else {
      res.status(200).json(client);
    }
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const { display_name, email, purchases } = req.body;

    const newClient = await Client.create({
      display_name,
      email,
      purchases,
    });

    res.status(201).json(newClient);
  } catch (error) {
    next(error);
  }
};

export { getClient, getClientById, createClient };
