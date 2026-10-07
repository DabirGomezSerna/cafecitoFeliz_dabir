/**
 * Catch-all for unmatched routes. Mount after all routers, before errorHandler.
 *
 * Kept as a plain responder (not an HttpError passed to next) so the response
 * keeps the method/url echo that made the original handler useful for spotting
 * a wrong verb — which is how the GET-vs-POST bug in the frontend's createSale()
 * surfaced in the first place.
 */
const notFound = (req, res) => {
  res.status(404).json({
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
    details: {
      method: req.method,
      url: req.originalUrl,
    },
  });
};

export default notFound;
