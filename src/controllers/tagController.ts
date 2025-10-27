import db from '../db/connection';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
  workspaceId: z.string().min(1, "workspaceId cannot be empty"),
})
