/**
 * Health check controller.
 * Responds with { status: "ok" } to verify the server is running and responsive.
 */
export const getHealth = (req, res) => {
  res.status(200).json({ status: 'ok' });
};
