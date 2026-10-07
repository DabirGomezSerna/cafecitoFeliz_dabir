import Client from "../models/Client.js";
import HttpError from "../utils/HttpError.js";

/** Escape user input before embedding it in a RegExp, so a query like "a.*" or
 *  "c++" is matched literally instead of being executed as a pattern. */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/clients
 * GET /api/clients?q=mar
 *
 * `q` matches display_name or email, case-insensitively, and powers the client
 * picker on the sale screen. Results are capped: the picker only ever shows a
 * short list, and an uncapped query would ship the whole customer table to the
 * browser on every keystroke.
 */
const getClient = async (req, res, next) => {
  try {
    const { q } = req.query;

    const filter = {};
    const term = typeof q === "string" ? q.trim() : "";

    if (term) {
      const pattern = new RegExp(escapeRegex(term), "i");
      filter.$or = [{ display_name: pattern }, { email: pattern }];
    }

    const clients = await Client.find(filter)
      .sort({ display_name: 1 })
      .limit(term ? 20 : 100);

    res.status(200).json(clients);
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);

    if (!client) {
      throw new HttpError(404, "Client not found", { code: "CLIENT_NOT_FOUND" });
    }

    res.status(200).json(client);
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    // `purchases` is deliberately NOT read from the request body. It is the input
    // to the loyalty discount, so accepting it from the caller would let anyone
    // register a client that instantly qualifies for 15% off. It starts at 0 (the
    // schema default) and is only ever advanced by a committed sale.
    const { display_name, email } = req.body;

    const newClient = await Client.create({ display_name, email });

    res.status(201).json(newClient);
  } catch (error) {
    next(error);
  }
};

export { getClient, getClientById, createClient };
