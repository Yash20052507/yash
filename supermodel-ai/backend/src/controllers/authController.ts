// src/controllers/authController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserByUsername } from '../models/User';
import { verifyPassword } from '../utils/auth';
import config from '../config';
import { logger } from '../utils/logger';
import { NewUser, User } from '../types';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, password } = matchedData(req, { locations: ['body']}) as NewUser;

  try {
    let existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already in use.' });
      return;
    }
    existingUser = await findUserByUsername(username);
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Username already in use.' });
      return;
    }

    const user = await createUser({ email, username, password });
    // Exclude password_hash from the returned user object
    const { password_hash, ...userWithoutPassword } = user;

    logger.info(`User registered: ${user.username} (ID: ${user.id})`);
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error: any) {
    logger.error('Error during user registration:', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = matchedData(req, { locations: ['body']});

  try {
    const user = await findUserByEmail(email); // findUserByEmail returns full user object needed for verifyPassword
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    const tokenPayload = {
        userId: user.id,
        username: user.username,
        is_admin: user.is_admin // Corrected from isAdmin to is_admin to match User type
    };
    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // Exclude password_hash from the returned user object
    const { password_hash, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.username} (ID: ${user.id})`);
    res.status(200).json({ success: true, data: { token, user: userWithoutPassword } });
  } catch (error: any) {
    logger.error('Error during user login:', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Server error during login.' });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
    if (!req.user) { // req.user is populated by authMiddleware
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }
    // password_hash should already be excluded by findUserById in authMiddleware if selected carefully
    // Or ensure it's excluded here:
    const { password_hash, ...userWithoutPassword } = req.user as User; // Cast to User to access its properties
    res.status(200).json({ success: true, data: userWithoutPassword });
}
