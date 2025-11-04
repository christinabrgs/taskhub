import { type Response, type Request } from "express"

export function isInteger(req: Request, res: Response): Number | Response {
  const num = Number(req.params.wsId)
  if (!Number.isInteger(num)) {
    return res.status(400).json({ error: `Invalid workspace ID: ${req.params.wsId}` })
  }

  return num
}
